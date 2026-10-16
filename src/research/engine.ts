import type { Assertion, AssertionResult, ExperimentCase, Outcome, Program, ResearchNode, Simulation, Topology, Value } from './types';
import { runRule } from './interpreter';

export { isModeledValue } from './values';
export function evaluate(program: Program, input: Value): Outcome { return runRule(program, input); }

export function sameOutcome(a: Outcome, b: Outcome): boolean {
  if (a.error || b.error) return a.error === b.error;
  return equalValue(a.value!, b.value!);
}
function equalValue(a: Value, b: Value): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-9;
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = Object.keys(a); const other = Object.keys(b);
  return keys.length === other.length && keys.every(key => Object.hasOwn(b, key) && equalValue((a as Record<string, Value>)[key], (b as Record<string, Value>)[key]));
}
function runAssertions(program: Program, assertions: Assertion[]): AssertionResult[] {
  return assertions.map(assertion => {
    const actual = evaluate(program, assertion.input);
    return { ...assertion, actual, passed: assertion.expected ? sameOutcome(actual, assertion.expected) : null };
  });
}
export function simulate(caseData: ExperimentCase, candidateId = caseData.defaultCandidate): Simulation {
  const original = runAssertions(caseData.program, caseData.assertions);
  const reproduced = caseData.contract === 'DEFINED' && original.some(assertion => assertion.passed === false);
  const candidates = caseData.patches.map(candidate => {
    const assertions = runAssertions(candidate.program, caseData.assertions);
    const status = !reproduced ? 'SKIPPED' : assertions.some(assertion => assertion.passed === null) ? 'UNVERIFIED' : assertions.every(assertion => assertion.passed) ? 'PASSED' : 'FAILED';
    return { candidate, assertions, status } as Simulation['candidates'][number];
  });
  const selected = candidates.find(item => item.candidate.id === candidateId) || candidates.find(item => item.candidate.id === caseData.defaultCandidate)!;
  const finalStatus = !reproduced || caseData.contract !== 'DEFINED' ? 'UNVERIFIED' : selected.status === 'PASSED' ? 'VERIFIED' : selected.status === 'FAILED' ? 'FAILED' : 'UNVERIFIED';
  return { original, reproduced, candidates, selected, finalStatus };
}

export function topology(caseData: ExperimentCase, simulation: Simulation): Topology {
  const uncertain = caseData.contract === 'INCOMPLETE';
  const nodes: ResearchNode[] = [
    { id: 'input', label: 'INPUT', detail: caseData.trigger, tone: 'neutral', kind: 'input' },
    { id: 'analyze', label: 'ANALYZE', detail: caseData.expectedBehavior, tone: uncertain ? 'uncertain' : 'neutral', kind: 'analysis' },
    ...caseData.trace.map((point, index): ResearchNode => ({ id: 'trace-' + index, label: point.label, detail: point.explanation, line: point.line, tone: index === caseData.trace.length - 1 && simulation.reproduced ? 'failure' : 'neutral', kind: 'trace' })),
    { id: 'reproduce', label: simulation.reproduced ? 'FAILURE CONFIRMED' : uncertain ? 'CONTRACT INCOMPLETE' : 'NOT REPRODUCED', detail: simulation.reproduced ? caseData.observedFailure : uncertain ? 'The intended result is not specified. Observing a value cannot establish correctness.' : 'The loaded inputs do not expose the reported defect. No patch is certified.', tone: simulation.reproduced ? 'failure' : 'uncertain', kind: 'reproduce' },
    { id: 'diagnosis', label: 'DIAGNOSIS', detail: caseData.diagnosis, tone: 'neutral', kind: 'diagnosis' },
    ...simulation.candidates.flatMap((item): ResearchNode[] => [
      { id: 'patch-' + item.candidate.id, label: item.candidate.label.toUpperCase(), detail: item.candidate.explanation, tone: 'neutral', candidateId: item.candidate.id, kind: 'patch' },
      { id: 'verify-' + item.candidate.id, label: item.status === 'PASSED' ? 'TARGETS PASS' : item.status === 'FAILED' ? 'TARGETS FAIL' : item.status, detail: item.status === 'SKIPPED' ? 'Verification is not used to certify a patch without a defined, reproduced failure.' : 'Candidate assertions use the exact same inputs and expected outcomes as the original.', tone: item.status === 'PASSED' ? 'pass' : item.status === 'FAILED' ? 'failure' : 'uncertain', candidateId: item.candidate.id, kind: 'verify' },
    ]),
    { id: 'report', label: 'FINAL REPORT', detail: simulation.finalStatus === 'VERIFIED' ? 'This selected candidate meets the listed conditions inside this deterministic model. No live runtime, AI inference or broader correctness is established.' : 'This selected path does not establish a verified repair. Inspect the failed or missing conditions.', tone: simulation.finalStatus === 'VERIFIED' ? 'pass' : simulation.finalStatus === 'FAILED' ? 'failure' : 'uncertain', kind: 'report' },
  ];
  if (simulation.original.some(test => test.passed)) nodes.push({ id: 'normal', label: 'CONTROL INPUT', detail: 'At least one listed original input already meets its condition. That passing control does not erase a failing boundary case. Inspect the original assertion table for the exact input.', tone: 'neutral', kind: 'normal' });
  if (caseData.program.op === 'retry') nodes.push({ id: 'retry', label: 'RETRY BUDGET', detail: 'The model compares rejected attempts with a finite budget. Retries are bounded; no network request is issued.', tone: 'uncertain', kind: 'retry' });
  const causal = ['input', 'analyze', ...caseData.trace.map((_, index) => 'trace-' + index), 'reproduce', 'diagnosis'];
  const edges: Topology['edges'] = causal.slice(1).map((id, index) => ({ from: causal[index], to: id, kind: id === 'reproduce' ? 'failure' : 'normal' }));
  if (nodes.some(node => node.id === 'normal')) edges.push({ from: 'analyze', to: 'normal', kind: 'normal', label: 'passing control fixture' });
  for (const item of simulation.candidates) {
    edges.push({ from: 'diagnosis', to: 'patch-' + item.candidate.id, kind: 'branch' }, { from: 'patch-' + item.candidate.id, to: 'verify-' + item.candidate.id, kind: 'branch' }, { from: 'verify-' + item.candidate.id, to: 'report', kind: 'branch' });
  }
  if (caseData.program.op === 'retry') edges.push({ from: 'reproduce', to: 'retry', kind: 'retry', label: 'reject' }, { from: 'retry', to: 'reproduce', kind: 'retry', label: 'next attempt' }, { from: 'retry', to: 'diagnosis', kind: 'normal', label: 'inspect finite budget' });
  if (!simulation.reproduced) edges.push({ from: 'reproduce', to: 'report', kind: 'branch', label: 'no certified repair' });
  const sequence = simulation.reproduced ? [...causal.slice(0, -1), ...(caseData.program.op === 'retry' ? ['retry'] : []), 'diagnosis', 'patch-' + simulation.selected.candidate.id, 'verify-' + simulation.selected.candidate.id, 'report'] : ['input', 'analyze', ...caseData.trace.map((_, index) => 'trace-' + index), 'reproduce', 'report'];
  return { nodes, edges, sequence };
}

export function datasetStatistics(cases: ExperimentCase[]) {
  const simulations = cases.map(item => simulate(item));
  const types = [...new Set(cases.map(item => item.bugType))].map(type => ({ type, count: cases.filter(item => item.bugType === type).length }));
  const candidates = simulations.flatMap(item => item.candidates);
  return {
    count: cases.length, types,
    reproduced: simulations.filter(item => item.reproduced).length,
    notReproduced: simulations.filter(item => !item.reproduced).length,
    candidates: { total: candidates.length, passed: candidates.filter(item => item.status === 'PASSED').length, failed: candidates.filter(item => item.status === 'FAILED').length, skipped: candidates.filter(item => item.status === 'SKIPPED').length, unverified: candidates.filter(item => item.status === 'UNVERIFIED').length },
    final: { verified: simulations.filter(item => item.finalStatus === 'VERIFIED').length, failed: simulations.filter(item => item.finalStatus === 'FAILED').length, unverified: simulations.filter(item => item.finalStatus === 'UNVERIFIED').length },
    complexity: cases.map(item => ({ id: item.id, type: item.bugType, decisions: item.trace.length + item.patches.length + (item.program.op === 'retry' ? 2 : 0) })),
  };
}

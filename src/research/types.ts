export type Value = null | boolean | number | string | Value[] | { [key: string]: Value };
export type Outcome = { value: Value; error?: never } | { error: string; value?: never };
export type Program =
  | { op: 'property'; path: string[]; guard: 'none' | 'truthy' | 'nullish'; fallback: Value }
  | { op: 'binding'; mode: 'missing' | 'defined' | 'typeof' }
  | { op: 'syntax'; valid: boolean; mode: 'double' | 'increment' }
  | { op: 'array-length'; mode: 'raw' | 'clamp' | 'reject' }
  | { op: 'array-index'; mode: 'inclusive' | 'upper' | 'bounded' }
  | { op: 'async-order'; mode: 'completion' | 'first' | 'latest' }
  | { op: 'async'; mode: 'propagate' | 'swallow' | 'recover' }
  | { op: 'factorial'; mode: 'zero' | 'nonpositive' | 'validated' }
  | { op: 'discount'; mode: 'add' | 'all' | 'eligible' }
  | { op: 'sort'; mode: 'lexical' | 'numeric' | 'reverse' }
  | { op: 'state'; mode: 'stale' | 'mutate' | 'immutable' }
  | { op: 'default'; mode: 'or' | 'nullish' | 'always' }
  | { op: 'retry'; mode: 'none' | 'once' | 'bounded' };
export type Assertion = { id: string; label: string; input: Value; expected?: Outcome };
export type PatchCandidate = { id: string; label: string; code: string; program: Program; explanation: string };
export type TracePoint = { label: string; explanation: string; line: number };
export type ExperimentCase = {
  id: string; title: string; bugType: string; sourceType: 'SIMULATED'; language: 'JavaScript';
  filename: string; originalCode: string; program: Program; expectedBehavior: string;
  trigger: string; diagnosis: string; observedFailure: string; errorLine: number;
  stack: string[]; trace: TracePoint[]; reproductionSteps: string[];
  assertions: Assertion[]; patches: PatchCandidate[]; defaultCandidate: string;
  contract: 'DEFINED' | 'INCOMPLETE'; limitation: string;
};
export type AssertionResult = Assertion & { actual: Outcome; passed: boolean | null };
export type CandidateResult = { candidate: PatchCandidate; assertions: AssertionResult[]; status: 'PASSED' | 'FAILED' | 'UNVERIFIED' | 'SKIPPED' };
export type Simulation = {
  original: AssertionResult[]; reproduced: boolean; candidates: CandidateResult[];
  selected: CandidateResult; finalStatus: 'VERIFIED' | 'FAILED' | 'UNVERIFIED';
};
export type NodeTone = 'neutral' | 'failure' | 'pass' | 'uncertain';
export type ResearchNode = { id: string; label: string; detail: string; tone: NodeTone; line?: number; candidateId?: string; kind: 'input' | 'analysis' | 'trace' | 'reproduce' | 'diagnosis' | 'patch' | 'verify' | 'report' | 'normal' | 'retry' };
export type ResearchEdge = { from: string; to: string; label?: string; kind: 'normal' | 'failure' | 'retry' | 'branch' };
export type Topology = { nodes: ResearchNode[]; edges: ResearchEdge[]; sequence: string[] };

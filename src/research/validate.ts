import type { ExperimentCase } from './types';
import { datasetStatistics, isModeledValue, simulate, topology } from './engine';
import { codeDiffRows } from '@/source/diff';

export function validateResearchCases(cases: ExperimentCase[]): string[] {
  const issues: string[] = [];
  const ids = new Set<string>();
  for (const item of cases) {
    const fail = (message: string) => issues.push(item.id + ': ' + message);
    if (ids.has(item.id)) fail('duplicate ID');
    ids.add(item.id);
    if (!/^[a-z0-9-]+$/.test(item.id) || item.sourceType !== 'SIMULATED') fail('invalid identity or provenance');
    if (!['DEFINED', 'INCOMPLETE'].includes(item.contract)) fail('invalid contract state');
    if (!item.assertions.length || !item.patches.length) fail('missing conditions or candidates');
    if (item.assertions.some(test => !isModeledValue(test.input) || (test.expected && !test.expected.error && !isModeledValue(test.expected.value)))) fail('value outside finite model domain');
    if (new Set(item.assertions.map(test => test.id)).size !== item.assertions.length) fail('duplicate assertion ID');
    if (new Set(item.patches.map(candidate => candidate.id)).size !== item.patches.length) fail('duplicate candidate ID');
    if (!item.patches.some(candidate => candidate.id === item.defaultCandidate)) fail('unknown default branch');
    if (item.contract === 'DEFINED' && item.assertions.some(test => !test.expected)) fail('defined contract lacks an expected outcome');
    if (item.contract === 'INCOMPLETE' && item.assertions.every(test => test.expected)) fail('incomplete contract has no missing condition');
    const lines = item.originalCode.split('\n').length;
    if (item.errorLine < 1 || item.errorLine > lines || item.trace.some(point => point.line < 1 || point.line > lines)) fail('source location out of range');
    for (const candidate of item.patches) {
      const rows = codeDiffRows(item.originalCode, candidate.code);
      const original = rows.filter(row => row.kind !== 'added').map(row => row.text).join('\n');
      const proposed = rows.filter(row => row.kind !== 'removed').map(row => row.text).join('\n');
      if (original !== item.originalCode || proposed !== candidate.code) fail('diff does not reconstruct source');
      const simulation = simulate(item, candidate.id); const graph = topology(item, simulation);
      if (!['VERIFIED', 'FAILED', 'UNVERIFIED'].includes(simulation.finalStatus)) fail('invalid final state');
      if (simulation.finalStatus === 'VERIFIED' && (!simulation.reproduced || simulation.selected.status !== 'PASSED' || simulation.selected.assertions.some(test => test.passed !== true))) fail('unsupported verified outcome');
      if (!simulation.reproduced && simulation.candidates.some(branch => branch.status !== 'SKIPPED')) fail('unreproduced repair was certified');
      const nodeIds = new Set(graph.nodes.map(node => node.id));
      if (nodeIds.size !== graph.nodes.length || graph.edges.some(edge => !nodeIds.has(edge.from) || !nodeIds.has(edge.to)) || graph.sequence.some(id => !nodeIds.has(id))) fail('invalid topology target');
      if (graph.nodes.some(node => !node.detail)) fail('node lacks an explanation');
      if (graph.sequence.slice(1).some((id, index) => !graph.edges.some(edge => edge.from === graph.sequence[index] && edge.to === id))) fail('playback traverses a nonexistent edge');
    }
  }
  const stats = datasetStatistics(cases);
  if (stats.types.reduce((sum, item) => sum + item.count, 0) !== stats.count || stats.reproduced + stats.notReproduced !== stats.count || Object.values(stats.final).reduce((a, b) => a + b, 0) !== stats.count) issues.push('Dataset case denominators disagree.');
  const { total, ...candidateCounts } = stats.candidates;
  if (Object.values(candidateCounts).reduce((a, b) => a + b, 0) !== total) issues.push('Candidate denominators disagree.');
  return issues;
}

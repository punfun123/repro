import { caseById } from './cases';
import { simulate, topology } from './engine';
export type PlaybackState = { caseId: string; candidateId: string; fixtureId: string; cursor: number; playing: boolean; nodeId: string; line: number; pulse: number };
export type PlaybackAction = { type: 'case'; id: string } | { type: 'branch'; id: string } | { type: 'node'; id: string } | { type: 'fixture'; id: string; branch?: string } | { type: 'line'; line: number } | { type: 'seek'; cursor: number } | { type: 'play' | 'pause' | 'step' | 'reset' };
export function initialPlayback(id?: string, candidateId?: string): PlaybackState {
  const item = caseById(id); const result = simulate(item, candidateId);
  return { caseId: item.id, candidateId: result.selected.candidate.id, fixtureId: item.assertions[0].id, cursor: 0, playing: false, nodeId: 'input', line: item.errorLine, pulse: 0 };
}
export function playbackReducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  if (action.type === 'case') return initialPlayback(action.id);
  if (action.type === 'branch') return initialPlayback(state.caseId, action.id);
  if (action.type === 'pause') return { ...state, playing: false };
  const item = caseById(state.caseId); const graph = topology(item, simulate(item, state.candidateId));
  if (action.type === 'fixture') {
    if (!item.assertions.some(test => test.id === action.id)) return state;
    const next = action.branch && action.branch !== state.candidateId ? initialPlayback(state.caseId, action.branch) : state;
    return { ...next, fixtureId: action.id, nodeId: action.branch ? 'verify-' + action.branch : 'reproduce', playing: false, line: item.errorLine };
  }
  if (action.type === 'node') {
    const node = graph.nodes.find(node => node.id === action.id);
    if (!node) return state;
    if (node.candidateId && node.candidateId !== state.candidateId) return { ...initialPlayback(state.caseId, node.candidateId), nodeId: node.id };
    return { ...state, nodeId: node.id, playing: false, line: node.line ?? state.line, pulse: state.pulse + (node.id === 'reproduce' ? 1 : 0) };
  }
  if (action.type === 'line') return { ...state, line: action.line, playing: false };
  if (action.type === 'reset') return { ...state, cursor: 0, nodeId: 'input', playing: false, line: item.errorLine };
  if (action.type === 'play') return { ...state, playing: true, cursor: state.cursor === graph.sequence.length - 1 ? 0 : state.cursor, nodeId: state.cursor === graph.sequence.length - 1 ? 'input' : state.nodeId, line: state.cursor === graph.sequence.length - 1 ? item.errorLine : state.line };
  const cursor = Math.min(graph.sequence.length - 1, Math.max(0, action.type === 'seek' ? action.cursor : state.cursor + 1));
  const nodeId = graph.sequence[cursor]; const node = graph.nodes.find(node => node.id === nodeId);
  return { ...state, cursor, nodeId, line: node?.line ?? state.line, playing: action.type === 'seek' ? false : state.playing && cursor < graph.sequence.length - 1, pulse: state.pulse + (nodeId === 'reproduce' ? 1 : 0) };
}

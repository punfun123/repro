import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { researchCases, caseById } from '../src/research/cases';
import { datasetStatistics, evaluate, sameOutcome, simulate, topology } from '../src/research/engine';
import { validateResearchCases } from '../src/research/validate';
import type { Outcome, Value } from '../src/research/types';
import { initialPlayback, playbackReducer } from '../src/research/playback';

test('research dataset validates all identities, contracts, diffs, graph targets and denominators', () => {
  assert.equal(researchCases.length, 24);
  assert.ok(new Set(researchCases.map(item => item.bugType)).size >= 10);
  assert.deepEqual(validateResearchCases(researchCases), []);
});

test('the bounded model agrees with trusted curated JavaScript fixtures, including rejected branches', async () => {
  // Development-only check. Production never evaluates displayed source or user code.
  async function run(code: string, input: Value): Promise<Outcome> {
    const context = vm.createContext({ module: { exports: null }, input: structuredClone(input) });
    try {
      new vm.Script(code).runInContext(context, { timeout: 100 });
      const returned = new vm.Script('module.exports(input)').runInContext(context, { timeout: 100 });
      const value = await returned;
      return { value: JSON.parse(JSON.stringify(value)) as Value };
    } catch (cause) {
      const error = cause as Error;
      return { error: /call stack/i.test(error.message) ? 'RecursiveOverflow' : error.message === 'AsyncRejection' ? 'AsyncRejection' : error.name };
    }
  }
  for (const item of researchCases) {
    for (const source of [{ code: item.originalCode, program: item.program }, ...item.patches]) {
      for (const assertion of item.assertions) {
        assert.ok(sameOutcome(evaluate(source.program, assertion.input), await run(source.code, assertion.input)), item.id + ' / ' + assertion.id + ' / ' + source.program.op);
      }
    }
  }
});

test('selected branch controls the verdict without changing its frozen assertions', () => {
  const item = caseById('null-user-id');
  const wrong = simulate(item, 'a'); const correct = simulate(item, 'b');
  assert.equal(wrong.reproduced, true); assert.equal(wrong.finalStatus, 'FAILED');
  assert.equal(correct.finalStatus, 'VERIFIED');
  assert.equal(wrong.selected.assertions.find(test => test.id === 'zero')?.passed, false);
  assert.deepEqual(wrong.original, correct.original);
});

test('missing reproduction and missing requirements never certify a repair', () => {
  for (const id of ['missing-trigger', 'unknown-order', 'absent-recovery-contract']) {
    const result = simulate(caseById(id));
    assert.equal(result.reproduced, false); assert.equal(result.finalStatus, 'UNVERIFIED');
    assert.ok(result.candidates.every(branch => branch.status === 'SKIPPED'));
  }
});

test('replay is deterministic, inputs remain unchanged and causal shapes differ', () => {
  const before = JSON.stringify(researchCases);
  for (const item of researchCases) assert.deepEqual(topology(item, simulate(item)), topology(item, simulate(item)));
  assert.equal(JSON.stringify(researchCases), before);
  assert.notDeepEqual(topology(caseById('missing-delimiter'), simulate(caseById('missing-delimiter'))).edges, topology(caseById('transient-rejection'), simulate(caseById('transient-rejection'))).edges);
});

test('dataset outcome counts keep case and candidate populations separate', () => {
  const stats = datasetStatistics(researchCases);
  assert.equal(stats.count, 24); assert.equal(stats.candidates.total, 48);
  assert.ok(stats.final.failed > 0 && stats.final.unverified > 0 && stats.final.verified > 0);
  const damaged = structuredClone(researchCases); damaged[1].id = damaged[0].id;
  assert.ok(validateResearchCases(damaged).some(issue => issue.includes('duplicate ID')));
});

test('play, pause, seek, reset and case or branch changes keep a single consistent playback state', () => {
  let state = initialPlayback('null-user-id', 'a');
  state = playbackReducer(state, { type: 'play' }); assert.equal(state.playing, true);
  state = playbackReducer(state, { type: 'step' }); assert.equal(state.cursor, 1);
  state = playbackReducer(state, { type: 'pause' }); assert.equal(state.playing, false);
  state = playbackReducer(state, { type: 'seek', cursor: 999 }); assert.equal(state.nodeId, 'report');
  state = playbackReducer(state, { type: 'play' }); assert.equal(state.cursor, 0);
  state = playbackReducer(state, { type: 'branch', id: 'b' }); assert.equal(state.cursor, 0); assert.equal(state.playing, false); assert.equal(state.candidateId, 'b');
  state = playbackReducer(state, { type: 'case', id: 'unknown-order' }); assert.equal(state.caseId, 'unknown-order'); assert.equal(state.nodeId, 'input'); assert.equal(state.line, caseById('unknown-order').errorLine);
  const unchanged = playbackReducer(state, { type: 'node', id: 'not-a-node' }); assert.deepEqual(unchanged, state);
});

test('the interpreter rejects nonfinite or oversized values and bounds recursive-model work', () => {
  assert.deepEqual(evaluate({ op: 'factorial', mode: 'zero' }, Infinity), { error: 'MODEL_DOMAIN_LIMIT' });
  assert.deepEqual(evaluate({ op: 'factorial', mode: 'zero' }, 1000000), { error: 'MODEL_DOMAIN_LIMIT' });
  assert.deepEqual(evaluate({ op: 'sort', mode: 'numeric' }, Array(65).fill(1)), { error: 'MODEL_DOMAIN_LIMIT' });
  assert.deepEqual(evaluate({ op: 'factorial', mode: 'zero' }, -1), { error: 'RecursiveOverflow' });
});

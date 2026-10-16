import test from 'node:test';
import assert from 'node:assert/strict';
import { runExperiment, testHash } from '../src/experiment/pipeline';
import type { AI, Evidence, Experiment, Plan, Runner } from '../src/experiment/types';
import { executionStages, hasConfirmedReproduction, hasTargetTestPass, patchOutcome, displayEvidenceText } from '../src/experiment/visualization';
import { codeDiffRows } from '../src/source/diff';
import { syntaxParts, syntaxLines } from '../src/source/syntax';
import { readSandboxFixture } from '../src/content/sandbox-fixture';

const input = { language: 'javascript' as const, code: 'module.exports = user => user.id;', error: 'null user throws', expected: 'null user returns null; existing user returns id', steps: '' };
const plan: Plan = { analysis: 'Read a missing user.', hypothesis: 'Handle null input.', conclusive: true, mode: 'function', exportName: 'default', tests: [{ name: 'missing user', argsJson: '[null]', expectedJson: 'null' }], limitations: [] };
const ai: AI = { analyze: async () => structuredClone(plan), match: async () => ({ matches: true, reason: 'The null-user assertion matches.' }), patch: async () => ({ code: 'module.exports = user => user?.id ?? null;', explanation: 'Handle null.', limitations: [] }) };
function evidence(passed: boolean): Evidence { return { sandboxId: 'explicit-test-double', testHash: testHash(plan), assertions: [{ name: 'missing user', expected: null, actual: passed ? null : 'wrong', passed, stdout: '', stderr: '', exitCode: 0, durationMs: 1 }], stdout: '', stderr: '', exitCode: passed ? 0 : 1, durationMs: 1 }; }
async function run(options: { ai?: AI; runner?: Runner } = {}) { let calls = 0; return runExperiment(input, { persistence: 'ephemeral', ai: options.ai || ai, run: options.runner || (async () => evidence(++calls === 2)) }); }

test('visual stages follow actual pipeline snapshots without a synthetic completion timer', async () => {
  const snapshots: Experiment[] = []; let calls = 0;
  const result = await runExperiment(input, { persistence: 'ephemeral', ai, run: async () => evidence(++calls === 2), onEvent: snapshot => snapshots.push(snapshot) });
  for (const [status, stage] of [['ANALYZING', 'analyze'], ['REPRODUCING', 'reproduce'], ['PATCHING', 'patch'], ['VERIFYING', 'verify']] as const) {
    const snapshot = snapshots.find(record => record.status === status)!;
    assert.equal(executionStages(snapshot).find(item => item.id === stage)?.state, 'RUNNING');
  }
  assert.equal(hasConfirmedReproduction(snapshots.find(record => record.status === 'REPRODUCING')!), false);
  assert.equal(hasConfirmedReproduction(snapshots.find(record => record.status === 'REPRODUCED')!), true);
  assert.equal(hasTargetTestPass(result), true);
  assert.equal(executionStages(result)[3].targetedPass, true);
  assert.equal(patchOutcome(result), 'TARGET TEST PASSED');
});

test('a failed candidate stays failed and never enables the green result', async () => {
  const result = await run({ runner: async () => evidence(false) });
  assert.equal(result.status, 'TEST_FAILED'); assert.equal(executionStages(result)[3].state, 'FAILED');
  assert.equal(hasTargetTestPass(result), false); assert.equal(patchOutcome(result), 'TEST FAILED');
});

test('an unreproduced original skips patch and verification with no copied bug', async () => {
  const result = await run({ runner: async () => evidence(true) });
  assert.deepEqual(executionStages(result).map(stage => stage.state), ['COMPLETED', 'UNVERIFIED', 'SKIPPED', 'SKIPPED']);
  assert.equal(hasConfirmedReproduction(result), false); assert.equal(result.patch, undefined);
});

test('an unrelated failure cannot trigger the reproduction animation', async () => {
  const result = await run({ ai: { ...ai, match: async () => ({ matches: false, reason: 'An unrelated error.' }) } });
  assert.equal(result.status, 'UNVERIFIED'); assert.equal(hasConfirmedReproduction(result), false);
  assert.equal(executionStages(result)[2].state, 'SKIPPED');
});

test('ambiguous expected behavior needs review and skips execution', async () => {
  const result = await run({ ai: { ...ai, analyze: async () => ({ ...plan, conclusive: false }) } });
  assert.deepEqual(executionStages(result).map(stage => stage.state), ['UNVERIFIED', 'SKIPPED', 'SKIPPED', 'SKIPPED']);
  assert.equal(patchOutcome(result), 'NEEDS REVIEW');
});

test('provider and runner errors mark the stage that actually failed', async () => {
  const broken = async (): Promise<never> => { throw new Error('Controlled failure'); };
  const analyze = await run({ ai: { ...ai, analyze: broken } });
  const reproduce = await run({ runner: broken });
  const patch = await run({ ai: { ...ai, patch: broken } });
  let calls = 0; const verify = await run({ runner: async () => { if (++calls === 2) return broken(); return evidence(false); } });
  [analyze, reproduce, patch, verify].forEach((record, index) => {
    assert.equal(executionStages(record)[index].state, 'FAILED');
    assert.equal(executionStages(record).some(stage => stage.targetedPass), false);
  });
});

test('a claimed pass with missing reproduction or a changed test fingerprint stays unverified', async () => {
  const result = await run();
  const noReproduction = { ...result, events: result.events.filter(event => event.status !== 'REPRODUCED') };
  const altered = { ...result, verification: { ...result.verification!, testHash: 'b'.repeat(64) } };
  for (const record of [noReproduction, altered]) { assert.equal(hasTargetTestPass(record), false); assert.equal(executionStages(record)[3].state, 'UNVERIFIED'); assert.equal(patchOutcome(record), 'UNVERIFIED'); }
  assert.deepEqual(executionStages(null).map(stage => stage.state), ['WAITING', 'WAITING', 'WAITING', 'WAITING']);
});

test('unified diff preserves changed text and both source line numbers', () => {
  assert.deepEqual(codeDiffRows('const a = 1;\nreturn a;\n', 'const a = 2;\nreturn a;\n'), [
    { kind: 'removed', originalLine: 1, candidateLine: null, text: 'const a = 1;' },
    { kind: 'added', originalLine: null, candidateLine: 1, text: 'const a = 2;' },
    { kind: 'context', originalLine: 2, candidateLine: 2, text: 'return a;' },
  ]);
});

test('syntax tokens preserve untrusted code as text, including multiline constructs', () => {
  const code = '/* first\nsecond */\nconst text = "</pre><script>alert(1)</script>";\n';
  const tokens = syntaxParts(code);
  assert.equal(tokens.map(part => part.text).join(''), code);
  assert.ok(tokens.some(part => part.className?.includes('comment')));
  assert.ok(tokens.some(part => part.className?.includes('string')));
  assert.equal(syntaxLines(code).map(line => line.map(part => part.text).join('')).join('\n'), code);
  assert.equal(displayEvidenceText('at /vercel/sandbox/worker.cjs'), 'at [sandbox]/worker.cjs');
});

test('public fixture visualization parses the committed real outputs without inventing aggregate timings', async () => {
  const fixture = await readSandboxFixture();
  assert.equal(fixture.runtime, 'v24.19.0'); assert.equal(fixture.cases.length, 3);
  assert.deepEqual(fixture.cases.map(item => item.evidence.assertions.filter(test => test.passed).length), [1, 2, 0]);
  assert.equal(fixture.cases[2].evidence.exitCode, 1);
  assert.ok(fixture.cases[2].evidence.assertions.every(test => test.exitCode === 0));
  assert.ok(fixture.cases.every(item => !('durationMs' in item.evidence)));
});

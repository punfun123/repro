import test from 'node:test';
import assert from 'node:assert/strict';
import { runExperiment, testHash } from '../src/experiment/pipeline';
import { verdict } from '../src/verification/verdict';
import { inputSchema, planSchema, type AI, type Evidence, type Plan } from '../src/experiment/types';
import { isSolanaAddress, launchInfo } from '../src/config/project';
import { sourceFiles } from '../src/source/files';
import { readFile } from 'node:fs/promises';
import { saveExperiment, readExperiment } from '../src/experiment/store';
import { sameOrigin, limitedJson } from '../src/experiment/access';

const input = inputSchema.parse({ code: 'module.exports = user => user.id;', error: 'Missing user throws TypeError.', expected: 'Return null when user is missing; otherwise return user.id.', steps: '' });
const plan: Plan = { analysis: 'A missing user is dereferenced.', hypothesis: 'null input throws, although the contract requires null.', conclusive: true, mode: 'function', exportName: 'default', tests: [{ name: 'missing user', argsJson: '[null]', expectedJson: 'null' }, { name: 'existing user', argsJson: '[{"id":42}]', expectedJson: '42' }], limitations: [] };
function evidence(passed: boolean, currentPlan: Plan = plan): Evidence { return { sandboxId: 'injected-test-double', testHash: testHash(currentPlan), assertions: currentPlan.tests.map(t => ({ name: t.name, passed, expected: JSON.parse(t.expectedJson), actual: passed ? JSON.parse(t.expectedJson) : 'wrong', stdout: '', stderr: '', exitCode: passed ? 0 : 1, durationMs: 1 })), stdout: '', stderr: '', exitCode: passed ? 0 : 1, durationMs: 1 }; }
function ai(overrides: Partial<AI> = {}): AI { return { analyze: async () => structuredClone(plan), match: async () => ({ matches: true, reason: 'The observed missing-user failure matches the contract.' }), patch: async () => ({ code: 'module.exports = user => user?.id ?? null;', explanation: 'Handle missing users.', limitations: [] }), ...overrides }; }

test('CASE 001 orchestration: failed original and passing candidate preserve the test fingerprint', async () => {
  const seen: string[] = []; let runs = 0;
  const result = await runExperiment(input, { ai: ai(), persistence: 'ephemeral', run: async (_code, p) => { seen.push(testHash(p)); return evidence(++runs === 2); } });
  assert.equal(result.status, 'TARGET_TEST_PASSED'); assert.equal(runs, 2); assert.equal(seen[0], seen[1]); assert.ok(result.diff?.includes('user?.id')); assert.ok(result.events.some(e => e.status === 'REPRODUCED'));
});
test('CASE 002 orchestration: a runnable but incorrect candidate stays TEST_FAILED', async () => {
  const result = await runExperiment(input, { ai: ai({ patch: async () => ({ code: 'module.exports = () => 0;', explanation: 'A deliberately incorrect test fixture.', limitations: [] }) }), persistence: 'ephemeral', run: async () => ({ ...evidence(false), exitCode: 0 }) });
  assert.equal(result.status, 'TEST_FAILED'); assert.equal(result.verification?.exitCode, 0); assert.ok(result.verification?.assertions.every(t => !t.passed));
});
test('CASE 003 orchestration: no failing original means UNVERIFIED and no patch', async () => {
  let patched = false;
  const result = await runExperiment(input, { ai: ai({ patch: async () => { patched = true; throw new Error('Must not patch'); } }), persistence: 'ephemeral', run: async () => evidence(true) });
  assert.equal(result.status, 'UNVERIFIED'); assert.equal(patched, false); assert.equal(result.verification, undefined);
});
test('ambiguous behavior needs review without executing anything', async () => {
  let executed = false;
  const result = await runExperiment(input, { ai: ai({ analyze: async () => ({ ...plan, conclusive: false }) }), persistence: 'ephemeral', run: async () => { executed = true; return evidence(true); } });
  assert.equal(result.status, 'NEEDS_REVIEW'); assert.equal(executed, false);
});
test('an unrelated failure cannot establish reproduction', async () => {
  const result = await runExperiment(input, { ai: ai({ match: async () => ({ matches: false, reason: 'An unrelated syntax error.' }) }), persistence: 'ephemeral', run: async () => evidence(false) });
  assert.equal(result.status, 'UNVERIFIED'); assert.equal(result.patch, undefined);
});
test('patch provider mutation cannot weaken the frozen contract', async () => {
  const hashes: string[] = [];
  const result = await runExperiment(input, { ai: ai({ patch: async (_i, p) => { p.tests[0].expectedJson = '999'; return { code: 'module.exports = () => 999;', explanation: 'Hostile test fixture.', limitations: [] }; } }), persistence: 'ephemeral', run: async (_c, p) => { hashes.push(testHash(p)); return evidence(false); } });
  assert.equal(result.status, 'TEST_FAILED'); assert.equal(hashes[0], hashes[1]); assert.equal(result.plan?.tests[0].expectedJson, 'null');
});
test('changed fingerprints and missing assertions cannot pass verification', () => {
  assert.equal(verdict({ ...evidence(true), testHash: 'wrong' }, testHash(plan), 2), 'EXECUTION_ERROR');
  assert.equal(verdict({ ...evidence(true), assertions: [] }, testHash(plan), 2), 'EXECUTION_ERROR');
});
test('provider exceptions produce a final failure event without leaking error contents', async () => {
  const result = await runExperiment(input, { ai: ai({ analyze: async () => { throw new Error('secret-provider-key'); } }), persistence: 'ephemeral', run: async () => evidence(true) });
  assert.equal(result.status, 'EXECUTION_ERROR'); assert.ok(!JSON.stringify(result).includes('secret-provider-key'));
});
test('input and model payloads are bounded and structurally validated', () => {
  assert.equal(inputSchema.safeParse({ ...input, code: 'a'.repeat(12001) }).success, false);
  assert.equal(planSchema.safeParse({ ...plan, tests: [{ name: 'bad', argsJson: 'not JSON', expectedJson: 'null' }] }).success, false);
  assert.equal(planSchema.safeParse({ ...plan, shell: 'delete' }).success, false);
});
test('unlaunched and malformed contracts never create purchase links', () => {
  assert.equal(launchInfo({ solanaCA: '', isLaunched: false }).buyUrl, null);
  assert.equal(launchInfo({ solanaCA: 'invalid', isLaunched: true }).buyUrl, null);
  assert.equal(isSolanaAddress('11111111111111111111111111111111'), true);
  assert.equal(isSolanaAddress('1'.repeat(44)), false);
});
test('all ten origin chapters and the final signature are preserved', async () => {
  const story = await readFile('content/story.md', 'utf8');
  assert.equal((story.match(/^### \d{2} —/gm) || []).length, 10);
  assert.ok(story.includes('— REPRO Developer')); assert.ok(story.includes('A token cannot reproduce a bug.'));
});
test('public source list exists and contains no secret paths', async () => {
  for (const file of sourceFiles) { assert.ok(!/\.env|private|credentials/.test(file.path)); assert.ok((await readFile(file.path, 'utf8')).length > 0); }
});
test('ephemeral private records require the correct owner capability', async () => {
  const result = await runExperiment(input, { ai: ai(), persistence: 'ephemeral', run: async () => evidence(true) });
  await saveExperiment('owner-a', result);
  assert.equal(await readExperiment('owner-b', result.id), null);
  assert.equal((await readExperiment('owner-a', result.id))?.id, result.id);
});
test('origin validation uses the public host and rejects foreign origins', () => {
  assert.equal(sameOrigin(new Request('http://localhost:3000/api/experiments', { headers: { host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' } })), true);
  assert.equal(sameOrigin(new Request('https://repro.example/api/experiments', { headers: { host: 'repro.example', origin: 'https://other.example' } })), false);
  assert.equal(sameOrigin(new Request('https://repro.example/api/experiments')), false);
});
test('oversized request streams are rejected before JSON parsing', async () => {
  await assert.rejects(() => limitedJson(new Request('http://localhost', { method: 'POST', body: 'a'.repeat(1001) }), 1000), /BODY_TOO_LARGE/);
});

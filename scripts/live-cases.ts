// Requires real Groq + Sandbox credentials. No local fallback and no simulated execution.
import { loadEnvConfig } from '@next/env';
import { mkdir, writeFile } from 'node:fs/promises';
import { groqAI } from '../src/ai/groq';
import { executeSandbox } from '../src/sandbox/execute';
import { runExperiment } from '../src/experiment/pipeline';
loadEnvConfig(process.cwd());
async function main() {
  if (!process.env.GROQ_API_KEY || !(process.env.VERCEL_OIDC_TOKEN || (process.env.VERCEL_TOKEN && process.env.VERCEL_TEAM_ID && process.env.VERCEL_PROJECT_ID))) {
    console.error('BLOCKED: real Groq and Sandbox credentials are required. No experiments executed.'); process.exitCode = 2; return;
  }
  const base = { language: 'javascript' as const, code: 'module.exports = function getUserId(user) { return user.id; };', error: 'Missing user throws TypeError.', expected: 'Return null for null or undefined users. Return user.id for existing users.', steps: 'Call with null, with no arguments and with { id: 42 }.' };
  const cases = [
    { name: '001-live-ai', input: base, ai: groqAI, expectedStatus: 'TARGET_TEST_PASSED', note: 'Real model plan, matching analysis and patch; real isolated execution. The model is allowed to fail.' },
    { name: '002-negative-control', input: base, ai: { ...groqAI, patch: async () => ({ code: 'module.exports = () => 999;', explanation: 'Deliberate negative-control candidate; not an AI-produced patch.', limitations: ['This controlled candidate tests that incorrect return values fail the frozen assertions.'] }) }, expectedStatus: 'TEST_FAILED', note: 'Real model plan and matching analysis; deliberately wrong candidate; real isolated execution.' },
    { name: '003-unverified', input: { ...base, code: 'module.exports = function getUserId(user) { return user?.id ?? null; };', error: 'An intermittent production crash was reported but its triggering input is unknown.' }, ai: groqAI, expectedStatus: 'UNVERIFIED', note: 'Real model with incomplete reproduction evidence; no fabricated failure.' },
  ];
  await mkdir('evidence', { recursive: true });
  for (const item of cases) {
    const result = await runExperiment(item.input, { ai: item.ai, run: executeSandbox, persistence: 'ephemeral' });
    await writeFile(`evidence/${item.name}.json`, JSON.stringify({ note: item.note, expectedStatus: item.expectedStatus, record: result }, null, 2));
    console.log(`${item.name}: ${result.status} (expected ${item.expectedStatus})`);
    if (result.status !== item.expectedStatus) process.exitCode = 1;
  }
}
main().catch(() => { console.error('Provider-backed test aborted. No success claimed.'); process.exitCode = 1; });

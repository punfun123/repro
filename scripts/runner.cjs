/* Trusted harness. This file runs INSIDE a Vercel microVM, never in Next.js. */
const { readFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { isDeepStrictEqual } = require('node:util');
const { createHash } = require('node:crypto');
const plan = JSON.parse(readFileSync('/vercel/sandbox/plan.json', 'utf8'));
const testHash = createHash('sha256').update(JSON.stringify({ mode: plan.mode, exportName: plan.exportName, tests: plan.tests })).digest('hex');
const assertions = [];
for (const test of plan.tests) {
  const start = Date.now();
  // The submitted child cannot read plan.json, the harness, or another run's files.
  const args = ['--permission', '--allow-fs-read=/vercel/sandbox/submission.cjs', '--allow-fs-read=/vercel/sandbox/worker.cjs', '--max-old-space-size=64'];
  if (plan.mode === 'function') args.push('/vercel/sandbox/worker.cjs', JSON.stringify({ args: JSON.parse(test.argsJson), exportName: plan.exportName }));
  else args.push('/vercel/sandbox/submission.cjs');
  const result = spawnSync('/usr/bin/env', ['-i', 'PATH=/usr/local/bin:/usr/bin:/bin', 'node', ...args], { cwd: '/vercel/sandbox', env: {}, timeout: 2500, maxBuffer: 16384, encoding: 'utf8', killSignal: 'SIGKILL' });
  const stdout = result.stdout || ''; const stderr = result.stderr || '';
  let actual; let error = result.error?.code || (result.status !== 0 ? stderr.slice(0, 4000) || `Exit ${result.status}, signal ${result.signal}` : undefined);
  if (!error) {
    try { actual = plan.mode === 'stdout' ? stdout.trim() : JSON.parse(stdout).value; }
    catch { error = 'The snippet did not produce a JSON-serializable return value.'; }
  }
  const expected = JSON.parse(test.expectedJson);
  assertions.push({ name: test.name, expected, actual, error, passed: !error && isDeepStrictEqual(actual, expected), stdout: stdout.slice(0, 8000), stderr: stderr.slice(0, 8000), exitCode: result.status, durationMs: Date.now() - start });
}
const passed = assertions.every(t => t.passed);
process.stdout.write(JSON.stringify({ testHash, assertions }));
process.exitCode = passed ? 0 : 1;

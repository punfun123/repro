import { Sandbox } from '@vercel/sandbox';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { testHash } from '@/experiment/pipeline';
import type { Evidence, Runner } from '@/experiment/types';

const harnessResult = z.object({ testHash: z.string().length(64), assertions: z.array(z.object({ name: z.string(), passed: z.boolean(), expected: z.unknown(), actual: z.unknown().optional(), error: z.string().optional(), stdout: z.string().max(8000), stderr: z.string().max(8000), exitCode: z.number().nullable(), durationMs: z.number() })).max(6) });
const worker = `const payload=JSON.parse(process.argv[2]); const originalWrite=process.stdout.write.bind(process.stdout); const log=console.log.bind(console); console.log=(...args)=>process.stderr.write(args.map(String).join(' ')+'\\n'); Promise.resolve().then(()=>{const mod=require('/vercel/sandbox/submission.cjs');const fn=payload.exportName==='default'?mod:mod[payload.exportName];if(typeof fn!=='function')throw new Error('Expected a CommonJS exported function');return fn(...payload.args)}).then(value=>{if(value===undefined)throw new Error('Return value is undefined, not JSON serializable'); originalWrite(JSON.stringify({value}));}).catch(error=>{process.stderr.write(String(error.stack||error));process.exitCode=1;});`;

export const executeSandbox: Runner = async (code, plan): Promise<Evidence> => {
  const started = Date.now();
  const credentials = process.env.VERCEL_TOKEN ? { token: process.env.VERCEL_TOKEN, teamId: process.env.VERCEL_TEAM_ID!, projectId: process.env.VERCEL_PROJECT_ID! } : {};
  const sandbox = await Sandbox.create({ ...credentials, image: 'vercel/sandbox/node:24', persistent: false, timeout: 30000, resources: { vcpus: 1 }, networkPolicy: 'deny-all' });
  try {
    // Images may default to /vercel rather than /vercel/sandbox. Use absolute paths throughout.
    await sandbox.mkDir('/vercel/sandbox');
    await sandbox.writeFiles([
      { path: '/vercel/sandbox/submission.cjs', content: Buffer.from(code) },
      { path: '/vercel/sandbox/plan.json', content: Buffer.from(JSON.stringify(plan)) },
      { path: '/vercel/sandbox/runner.cjs', content: await readFile(path.join(process.cwd(), 'scripts/runner.cjs')) },
      { path: '/vercel/sandbox/worker.cjs', content: Buffer.from(worker) },
    ]);
    const result = await sandbox.runCommand({ cmd: 'node', args: ['/vercel/sandbox/runner.cjs'], cwd: '/vercel/sandbox', env: {} });
    const [stdout, stderr] = await Promise.all([result.stdout(), result.stderr()]);
    try {
      const parsed = harnessResult.parse(JSON.parse(stdout));
      return { ...parsed, sandboxId: sandbox.name, stdout: stdout.slice(0, 20000), stderr: stderr.slice(0, 8000), exitCode: result.exitCode, durationMs: Date.now() - started };
    } catch {
      return { sandboxId: sandbox.name, testHash: testHash(plan), assertions: [], stdout: stdout.slice(0, 20000), stderr: stderr.slice(0, 8000), exitCode: result.exitCode, durationMs: Date.now() - started, infrastructureError: 'Invalid or incomplete harness output.' };
    }
  } finally { await sandbox.stop(); }
};

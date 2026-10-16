import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import type { Evidence } from '@/experiment/types';

export type HarnessCase = { name: string; label: string; code: string; evidence: Omit<Evidence, 'durationMs'> };
export type SandboxFixture = { date: string; runtime: string; cases: HarnessCase[] };
const assertionSchema = z.object({ name: z.string(), expected: z.unknown(), actual: z.unknown().optional(), error: z.string().optional(), passed: z.boolean(), stdout: z.string(), stderr: z.string(), exitCode: z.number().nullable(), durationMs: z.number() });
const outputSchema = z.object({ testHash: z.string().regex(/^[a-f0-9]{64}$/), assertions: z.array(assertionSchema).min(1) });
// These inputs were documented with the original controlled run in commit d42fc38.
const inputs = [
  { name: 'original', label: 'Original', code: 'module.exports = user => user.id;' },
  { name: 'candidate-pass', label: 'Passing fixture', code: 'module.exports = user => user?.id ?? null;' },
  { name: 'candidate-fail', label: 'Wrong fixture', code: 'module.exports = () => 999;' },
];

export async function readSandboxFixture(): Promise<SandboxFixture> {
  const artifact = JSON.parse(await readFile(path.join(process.cwd(), 'content/evidence/sandbox-harness.json'), 'utf8'));
  if (artifact.kind !== 'real-sandbox-harness-smoke-test' || artifact.networkPolicy !== 'deny-all' || artifact.persistent !== false) throw new Error('Unexpected public fixture artifact.');
  const lines: string[] = artifact.output.split('\n');
  const outputs = lines.filter(line => line.startsWith('{')).map(line => z.object({ name: z.string(), exitCode: z.number(), stdout: z.string(), stderr: z.string() }).parse(JSON.parse(line)));
  const cases = inputs.map(input => {
    const output = outputs.find(output => output.name === input.name);
    if (!output) throw new Error('Missing recorded harness case.');
    const parsed = outputSchema.parse(JSON.parse(output.stdout));
    return { ...input, evidence: { ...parsed, sandboxId: String(artifact.session), stdout: output.stdout, stderr: output.stderr, exitCode: output.exitCode } };
  });
  if (new Set(cases.map(item => item.evidence.testHash)).size !== 1) throw new Error('Fixture contracts differ.');
  return { date: String(artifact.date), runtime: lines.find(line => line.startsWith('RUNTIME '))?.slice(8) || 'not recorded', cases };
}

import { z } from 'zod';

export const inputSchema = z.object({
  language: z.literal('javascript').default('javascript'),
  code: z.string().trim().min(1).max(12000),
  error: z.string().trim().max(2000),
  expected: z.string().trim().min(8).max(2000),
  steps: z.string().trim().max(2000).default(''),
}).strict();
export type ExperimentInput = z.infer<typeof inputSchema>;
export const planSchema = z.object({
  analysis: z.string().min(1).max(5000),
  hypothesis: z.string().min(1).max(2000),
  conclusive: z.boolean(),
  mode: z.enum(['function', 'stdout']),
  exportName: z.string().max(100),
  tests: z.array(z.object({
    name: z.string().min(1).max(200),
    argsJson: z.string().max(4000).refine(value => { try { const args = JSON.parse(value); return Array.isArray(args) && args.length <= 10; } catch { return false; } }, 'Expected a JSON argument array'),
    expectedJson: z.string().max(4000).refine(value => { try { JSON.parse(value); return true; } catch { return false; } }, 'Expected valid JSON'),
  }).strict()).min(1).max(6),
  limitations: z.array(z.string().max(1000)).max(10),
}).strict();
export type Plan = z.infer<typeof planSchema>;
export const patchSchema = z.object({ code: z.string().min(1).max(12000), explanation: z.string().min(1).max(5000), limitations: z.array(z.string().max(1000)).max(10) }).strict();
export type Patch = z.infer<typeof patchSchema>;
export const matchSchema = z.object({ matches: z.boolean(), reason: z.string().min(1).max(2000) }).strict();
export const statuses = ['PENDING','ANALYZING','REPRODUCING','REPRODUCED','UNVERIFIED','PATCHING','VERIFYING','TARGET_TEST_PASSED','TEST_FAILED','NEEDS_REVIEW','EXECUTION_ERROR'] as const;
export type Status = typeof statuses[number];
export interface Assertion { name: string; passed: boolean; expected: unknown; actual?: unknown; error?: string; stdout: string; stderr: string; exitCode: number | null; durationMs: number }
export interface Evidence { sandboxId: string; testHash: string; assertions: Assertion[]; stdout: string; stderr: string; exitCode: number; durationMs: number; infrastructureError?: string }
export interface Experiment {
  id: string; createdAt: string; input: ExperimentInput; status: Status; events: { status: Status; at: string; message: string }[];
  plan?: Plan; reproduction?: Evidence; reproductionReason?: string; patch?: Patch; diff?: string; verification?: Evidence;
  durationMs: number; limitations: string[]; persistence: 'supabase' | 'ephemeral'; error?: string;
}
export interface AI { analyze(input: ExperimentInput): Promise<Plan>; match(input: ExperimentInput, plan: Plan, evidence: Evidence): Promise<z.infer<typeof matchSchema>>; patch(input: ExperimentInput, plan: Plan, evidence: Evidence): Promise<Patch> }
export type Runner = (code: string, plan: Readonly<Plan>) => Promise<Evidence>;

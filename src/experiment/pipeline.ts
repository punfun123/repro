import { createHash, randomUUID } from 'node:crypto';
import { createPatch } from 'diff';
import type { AI, Experiment, ExperimentInput, Plan, Runner, Status } from './types';
import { verdict } from '@/verification/verdict';

export function testHash(plan: Readonly<Plan>): string { return createHash('sha256').update(JSON.stringify({ mode: plan.mode, exportName: plan.exportName, tests: plan.tests })).digest('hex'); }
export async function runExperiment(input: ExperimentInput, dependencies: { ai: AI; run: Runner; persistence: Experiment['persistence']; onEvent?: (record: Experiment) => void; id?: string }): Promise<Experiment> {
  const started = Date.now();
  const record: Experiment = { id: dependencies.id || randomUUID(), createdAt: new Date().toISOString(), input, status: 'PENDING', events: [], durationMs: 0, limitations: [], persistence: dependencies.persistence };
  function emit(status: Status, message: string) { record.status = status; record.durationMs = Date.now() - started; record.events.push({ status, at: new Date().toISOString(), message }); dependencies.onEvent?.(structuredClone(record)); }
  try {
    emit('ANALYZING', 'Asking Groq to define the failure and freeze correct-behavior assertions.');
    const plan = await dependencies.ai.analyze(input);
    record.plan = structuredClone(plan); record.limitations = [...plan.limitations];
    if (!plan.conclusive || (plan.mode === 'stdout' && plan.tests.some(t => typeof JSON.parse(t.expectedJson) !== 'string'))) {
      emit('NEEDS_REVIEW', 'The intended behavior cannot be determined reliably. No code executed.'); return record;
    }
    // Give every runner a clone; retain a canonical plan outside all model calls.
    const frozen = structuredClone(plan); const hash = testHash(frozen);
    emit('REPRODUCING', 'Running the original code in a fresh network-denied microVM.');
    record.reproduction = await dependencies.run(input.code, structuredClone(frozen));
    const original = verdict(record.reproduction, hash, frozen.tests.length);
    if (original === 'EXECUTION_ERROR') { emit('EXECUTION_ERROR', 'The original execution did not produce valid harness evidence.'); return record; }
    if (original !== 'TEST_FAILED') { emit('UNVERIFIED', 'The frozen tests did not reproduce the reported failure.'); return record; }
    const matching = await dependencies.ai.match(input, structuredClone(frozen), record.reproduction);
    record.reproductionReason = matching.reason;
    if (!matching.matches) { emit('UNVERIFIED', 'The observed failure could not be tied to the reported issue.'); return record; }
    emit('REPRODUCED', 'The original failed the target assertions and the observed failure matches the reported issue.');
    emit('PATCHING', 'Asking Groq for one candidate patch against the preserved original evidence.');
    record.patch = await dependencies.ai.patch(input, structuredClone(frozen), record.reproduction);
    record.limitations.push(...record.patch.limitations);
    record.diff = createPatch('submission.cjs', input.code, record.patch.code, 'original', 'candidate');
    emit('VERIFYING', 'Running the candidate in another clean microVM against the unchanged assertions.');
    record.verification = await dependencies.run(record.patch.code, structuredClone(frozen));
    const status = verdict(record.verification, hash, frozen.tests.length);
    record.limitations.push('These are AI-generated targeted tests. They are evidence for the listed inputs, not proof of complete correctness. Review the test contract and patch before use.');
    emit(status, status === 'TARGET_TEST_PASSED' ? 'The frozen target tests passed. Broader behavior remains unverified.' : 'The candidate did not pass verification. The original test expectations were preserved.');
  } catch {
    record.error = 'A provider request or isolated execution failed. No successful verification is claimed. Check provider access and server-side diagnostics.';
    emit('EXECUTION_ERROR', record.error);
  }
  return record;
}

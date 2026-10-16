import type { Experiment, Status } from './types';

export type StageId = 'analyze' | 'reproduce' | 'patch' | 'verify';
export type StageState = 'WAITING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'UNVERIFIED' | 'SKIPPED';
export const stageDefinitions = [
  { id: 'analyze', label: 'Analyze', description: 'Recorded analysis and a test contract, defined before a patch.' },
  { id: 'reproduce', label: 'Reproduce', description: 'The original execution and whether it matched the reported failure.' },
  { id: 'patch', label: 'Patch', description: 'One proposed change based on the preserved original evidence.' },
  { id: 'verify', label: 'Verify', description: 'The candidate run against the same frozen assertions.' },
] as const;
const activeStages: Partial<Record<Status, number>> = { ANALYZING: 0, REPRODUCING: 1, PATCHING: 2, VERIFYING: 3 };
export function isActiveExperiment(status: Status) { return status === 'PENDING' || status === 'REPRODUCED' || Object.hasOwn(activeStages, status); }

export function hasConfirmedReproduction(record: Experiment | null): boolean {
  const evidence = record?.reproduction;
  return Boolean(record?.events.some(event => event.status === 'REPRODUCED') && evidence && !evidence.infrastructureError
    && record?.plan && evidence.assertions.length === record.plan.tests.length
    && /^[a-f0-9]{64}$/.test(evidence.testHash) && evidence.assertions.some(test => !test.passed));
}

export function hasTargetTestPass(record: Experiment | null): boolean {
  const evidence = record?.verification;
  return Boolean(record?.status === 'TARGET_TEST_PASSED' && hasConfirmedReproduction(record) && record?.patch
    && evidence && !evidence.infrastructureError && evidence.exitCode === 0 && evidence.assertions.length > 0
    && evidence.assertions.length === record?.plan?.tests.length && evidence.testHash === record?.reproduction?.testHash
    && evidence.assertions.every(test => test.passed));
}

export function executionStages(record: Experiment | null) {
  const states: StageState[] = ['WAITING', 'WAITING', 'WAITING', 'WAITING'];
  let current = 0;
  if (record && record.status !== 'PENDING') {
    const status = record.status;
    if (status === 'NEEDS_REVIEW') {
      states.splice(0, 4, 'UNVERIFIED', 'SKIPPED', 'SKIPPED', 'SKIPPED');
    } else {
      current = activeStages[status] ?? (status === 'REPRODUCED' ? 2 : record.patch || record.verification ? 3 : record.plan ? 1 : 0);
      if (status === 'EXECUTION_ERROR') {
        const lastActive = [...record.events].reverse().find(event => activeStages[event.status] !== undefined);
        if (lastActive) current = activeStages[lastActive.status]!;
      }
      for (let i = 0; i < current; i++) states[i] = 'COMPLETED';
      if (isActiveExperiment(status)) states[current] = status === 'REPRODUCED' ? 'WAITING' : 'RUNNING';
      else {
        states[current] = status === 'TARGET_TEST_PASSED' ? (hasTargetTestPass(record) ? 'COMPLETED' : 'UNVERIFIED')
          : status === 'UNVERIFIED' ? 'UNVERIFIED' : 'FAILED';
        for (let i = current + 1; i < 4; i++) states[i] = 'SKIPPED';
      }
      if (current > 0 && !record.plan) states[0] = 'UNVERIFIED';
      if (current > 1 && !hasConfirmedReproduction(record)) states[1] = 'UNVERIFIED';
      if (current > 2 && !record.patch) states[2] = 'UNVERIFIED';
    }
  }
  return stageDefinitions.map((stage, index) => ({ ...stage, state: states[index], targetedPass: stage.id === 'verify' && hasTargetTestPass(record) }));
}

export function patchOutcome(record: Experiment): string {
  if (hasTargetTestPass(record)) return 'TARGET TEST PASSED';
  if (record.status === 'NEEDS_REVIEW') return 'NEEDS REVIEW';
  if (record.status === 'TEST_FAILED' && record.verification) return 'TEST FAILED';
  if (record.status === 'UNVERIFIED' || record.status === 'TARGET_TEST_PASSED' || record.status === 'EXECUTION_ERROR') return 'UNVERIFIED';
  return record.patch ? 'PATCH GENERATED' : 'NO CANDIDATE';
}

// Only the public sandbox prefix is replaced; submitted strings remain escaped React text.
export function displayEvidenceText(text: string): string { return text.replaceAll('/vercel/sandbox/', '[sandbox]/'); }

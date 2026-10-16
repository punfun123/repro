import type { Evidence, Status } from '@/experiment/types';
// Verdicts come from the trusted harness, never from AI-generated success text.
export function verdict(evidence: Evidence, expectedHash: string, expectedCount: number): Status {
  if (evidence.infrastructureError || evidence.testHash !== expectedHash || evidence.assertions.length !== expectedCount) return 'EXECUTION_ERROR';
  if (!evidence.assertions.length) return 'UNVERIFIED';
  return evidence.exitCode === 0 && evidence.assertions.every(test => test.passed) ? 'TARGET_TEST_PASSED' : 'TEST_FAILED';
}

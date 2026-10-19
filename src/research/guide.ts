import { defaultParameters, studyCase } from './catalog';
import { computeField, executeStudy, type StudyEvent } from './computation';

export const guideStudy = studyCase('null-user-id');
export const guideCells = computeField(guideStudy, defaultParameters);
const nullCell = guideCells.find(cell => cell.input === null)!;
const zeroCell = guideCells.find(cell => cell.row === 'object' && cell.column === '0')!;

export const guideSteps = [
  { id: 'original-null', variant: 'original', cellId: nullCell.id, label: 'Original', inputLabel: 'null user', title: 'First, reproduce the failure.', explanation: 'The original reads id from a null receiver. The contract requires null.' },
  { id: 'a-null', variant: 'a', cellId: nullCell.id, label: 'Patch A', inputLabel: 'null user', title: 'The exception disappears.', explanation: 'A truthiness guard handles the null user. That is only one condition.' },
  { id: 'a-zero', variant: 'a', cellId: zeroCell.id, label: 'Patch A', inputLabel: 'id = 0', title: 'But zero is still a valid id.', explanation: 'The same guard replaces the valid id 0 with null. A normal return can still be wrong.' },
  { id: 'b-null', variant: 'b', cellId: nullCell.id, label: 'Patch B', inputLabel: 'null user', title: 'Try a narrower guard.', explanation: 'The nullish guard returns null for the absent user.' },
  { id: 'b-zero', variant: 'b', cellId: zeroCell.id, label: 'Patch B', inputLabel: 'id = 0', title: 'Then check what already worked.', explanation: 'The nullish guard preserves 0. These two target conditions now have their own evidence.' },
] as const;
export type GuideStepId = typeof guideSteps[number]['id'];
export type GuideEvent = StudyEvent & { stepId: GuideStepId; stepIndex: number };

/** No recorded trace: advancing this iterator advances the existing rule evaluator. */
export function* executeGuide(stepId?: GuideStepId): Generator<GuideEvent, void> {
  let sequence = 0;
  for (const [stepIndex, step] of guideSteps.entries()) {
    if (stepId && step.id !== stepId) continue;
    for (const event of executeStudy(guideStudy, defaultParameters, guideCells, 'focused', step.cellId, step.variant)) {
      yield { ...event, sequence: sequence++, stepId: step.id, stepIndex };
    }
  }
}

export function guideLabUrl(stepId: GuideStepId): string {
  const step = guideSteps.find(step => step.id === stepId)!;
  return '/lab?' + new URLSearchParams({ case: guideStudy.id, candidate: step.variant, condition: step.cellId });
}

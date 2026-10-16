import { diffLines } from 'diff';
export interface DiffRow { kind: 'context' | 'added' | 'removed'; originalLine: number | null; candidateLine: number | null; text: string }
export function codeDiffRows(original: string, candidate: string): DiffRow[] {
  let before = 1; let after = 1;
  return diffLines(original.replaceAll('\r\n', '\n'), candidate.replaceAll('\r\n', '\n')).flatMap(change => {
    const lines = change.value.split('\n');
    if (lines.at(-1) === '') lines.pop();
    return lines.map(text => ({ kind: change.added ? 'added' : change.removed ? 'removed' : 'context',
      originalLine: change.added ? null : before++, candidateLine: change.removed ? null : after++, text } as DiffRow));
  });
}

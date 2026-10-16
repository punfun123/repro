'use client';
import { useId, useMemo, useState } from 'react';
import { codeDiffRows } from '@/source/diff';
import { syntaxLines } from '@/source/syntax';
import { SyntaxText } from './code';

export function CodeDiffViewer({ original, candidate, outcome = 'PATCH GENERATED', allowCopy = false }: {
  original: string; candidate: string; outcome?: string; allowCopy?: boolean;
}) {
  const [view, setView] = useState<'changes' | 'original' | 'candidate'>('changes');
  const [copyState, setCopyState] = useState('');
  const id = useId();
  const rows = useMemo(() => codeDiffRows(original, candidate), [original, candidate]);
  const before = useMemo(() => syntaxLines(original), [original]);
  const after = useMemo(() => syntaxLines(candidate), [candidate]);
  const changed = rows.some(row => row.kind !== 'context');
  async function copy() {
    try { await navigator.clipboard.writeText(view === 'original' ? original : candidate); setCopyState('Copied'); }
    catch { setCopyState('Copy unavailable in this browser'); }
  }
  return <div className="code-comparison">
    <div className="comparison-heading"><span className={outcome === 'TARGET TEST PASSED' ? 'pass-text' : outcome === 'TEST FAILED' ? 'fail-text' : ''}>{outcome}</span><span>A candidate is judged by its recorded target tests.</span></div>
    <div className="comparison-toolbar">
      <div role="group" aria-label="Code comparison view" className="comparison-tabs">
        {(['changes', 'original', 'candidate'] as const).map(mode => <button key={mode} type="button" aria-pressed={view === mode} aria-controls={id} onClick={() => { setView(mode); setCopyState(''); }}>{mode === 'changes' ? 'Changed lines' : mode === 'original' ? 'Original code' : 'Proposed patch'}</button>)}
      </div>
      {allowCopy ? <button type="button" className="text-button" onClick={copy}>Copy {view === 'original' ? 'original' : 'proposed'} code</button> : null}
    </div>
    <div id={id} className="diff-scroll" tabIndex={0} aria-label={view === 'changes' ? 'Unified diff with original and proposed line numbers' : `${view} code with line numbers`}>
      {view === 'changes' ? <div className="diff-lines">{rows.map((row, index) => <div className={`diff-row diff-${row.kind}`} key={index}>
        <span aria-hidden="true" className="diff-line-number">{row.originalLine}</span><span aria-hidden="true" className="diff-line-number">{row.candidateLine}</span><span aria-hidden="true" className="diff-sign">{row.kind === 'added' ? '+' : row.kind === 'removed' ? '−' : ' '}</span>
        <code className="diff-code-text"><SyntaxText parts={(row.kind === 'added' ? after[(row.candidateLine ?? 1) - 1] : before[(row.originalLine ?? 1) - 1]) || []}/>{!row.text ? '\u200b' : null}</code>
      </div>)}</div> : <div className="diff-lines">{(view === 'original' ? before : after).map((line, index) => <div className="diff-row source-line" key={index}><span className="diff-line-number" aria-hidden="true">{index + 1}</span><code className="diff-code-text"><SyntaxText parts={line}/>{!line.length ? '\u200b' : null}</code></div>)}</div>}
    </div>
    <p className="comparison-caption">{changed ? '− removed from original · + added in candidate' : 'No line changes in this candidate.'}<span role="status">{copyState}</span></p>
  </div>;
}

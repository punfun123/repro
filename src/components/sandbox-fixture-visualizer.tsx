'use client';
import { useId, useState } from 'react';
import type { SandboxFixture } from '@/content/sandbox-fixture';
import { Code } from './code';
import { CodeDiffViewer } from './code-diff-viewer';
import { ExecutionEvidence } from './experiment-evidence';

export function SandboxFixtureVisualizer({ fixture, repository }: { fixture: SandboxFixture; repository: string }) {
  const [selection, setSelection] = useState('original');
  const panelId = useId();
  const selected = fixture.cases.find(item => item.name === selection) || fixture.cases[0];
  const passed = selected.evidence.exitCode === 0 && selected.evidence.assertions.every(test => test.passed);
  return <section className="sandbox-fixture-view" aria-label="Recorded controlled Sandbox fixture">
    <div className="visualizer-heading"><span>SANDBOX FIXTURE · CONTROLLED TEST</span><span>{fixture.date} · Node {fixture.runtime}</span></div>
    <p>Three hand-written fixtures shared one disposable, network-denied VM. No Groq request was made. This is recorded harness evidence, not a live AI experiment.</p>
    <ol className="fixture-nodes">{fixture.cases.map(item => { const count = item.evidence.assertions.filter(test => test.passed).length; return <li key={item.name}><button type="button" aria-pressed={selected.name === item.name} aria-controls={panelId} onClick={() => setSelection(item.name)}><span>{item.label}</span><span className={count === item.evidence.assertions.length ? 'pass-text' : 'fail-text'}>{count} / {item.evidence.assertions.length} target assertions passed</span></button></li>; })}</ol>
    <div className="fixture-inspector" id={panelId}>
      <h3>{selected.label} · {passed ? 'TARGET TEST PASSED' : 'TARGET TEST FAILED'}</h3>
      <p className="evidence-note">The logged input contract: null user → null; {'{ id: 42 }'} → 42. Candidate code was hand-written for this controlled test.</p>
      {selected.name === 'original' ? <Code text={selected.code} language="javascript"/> : <CodeDiffViewer original={fixture.cases[0].code} candidate={selected.code} outcome={passed ? 'TARGET TEST PASSED' : 'TEST FAILED'} allowCopy/>}
      <ExecutionEvidence evidence={selected.evidence}/>
    </div>
    {repository ? <div className="fixture-links"><a href={`${repository}/blob/main/content/evidence/sandbox-harness.json`} target="_blank" rel="noreferrer">Raw public evidence ↗</a><a href={`${repository}/commit/d42fc388665657002e2f09ebc241cc3709077a49`} target="_blank" rel="noreferrer">Recorded commit d42fc38 ↗</a></div> : null}
  </section>;
}

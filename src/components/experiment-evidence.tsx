import type { Evidence, Experiment } from '@/experiment/types';
import { displayEvidenceText, patchOutcome, type StageId } from '@/experiment/visualization';
import { Code } from './code';
import { CodeDiffViewer } from './code-diff-viewer';

export type DisplayEvidence = Omit<Evidence, 'durationMs'> & { durationMs?: number };
export function ExecutionEvidence({ evidence }: { evidence: DisplayEvidence }) {
  return <div className="execution-evidence">
    <p className="evidence-meta">{typeof evidence.durationMs === 'number' ? `Recorded run: ${evidence.durationMs} ms` : 'Total run duration was not recorded'} · harness exit {evidence.exitCode}</p>
    {evidence.infrastructureError ? <p className="fail-text">{displayEvidenceText(evidence.infrastructureError)}</p> : null}
    {evidence.assertions.length ? evidence.assertions.map((test, index) => <section className="assertion" key={index}>
      <h4><span className={test.passed ? 'pass-text' : 'fail-text'}>{test.passed ? 'PASS' : 'FAIL'}</span>{test.name}</h4>
      <p className="evidence-meta">{test.durationMs} ms · child exit {test.exitCode ?? 'not recorded'}</p>
      <pre>{displayEvidenceText(JSON.stringify({ expected: test.expected, ...(Object.hasOwn(test, 'actual') ? { actual: test.actual } : {}), ...(test.error ? { error: test.error } : {}) }, null, 2))}</pre>
      {!Object.hasOwn(test, 'actual') ? <p className="evidence-note">No return value recorded.</p> : null}
      <details><summary>Output and error for this assertion</summary><div className="output-pair"><div><h5>stdout</h5><pre>{displayEvidenceText(test.stdout) || 'NO OUTPUT RECORDED'}</pre></div><div><h5>stderr / exception</h5><pre>{displayEvidenceText(test.stderr) || 'NO ERROR OUTPUT RECORDED'}</pre></div></div></details>
    </section>) : <NoEvidence detail="The harness returned no assertions. This cannot establish a test pass."/>}
    <details className="raw-evidence"><summary>Recorded harness output and test fingerprint</summary><p className="evidence-meta">Sandbox {evidence.sandboxId} · SHA-256 {evidence.testHash}</p><pre>{displayEvidenceText(evidence.stdout) || 'NO OUTPUT RECORDED'}</pre><pre>{displayEvidenceText(evidence.stderr) || 'NO ERROR OUTPUT RECORDED'}</pre></details>
  </div>;
}

export function NoEvidence({ detail }: { detail?: string }) { return <div className="no-evidence"><strong>NO EVIDENCE AVAILABLE</strong><p>{detail || 'This stage has not produced a recorded result.'}</p></div>; }

export function StageEvidence({ stage, record }: { stage: StageId; record: Experiment | null }) {
  if (!record) return <NoEvidence detail="Select a stage to understand its role. Its evidence appears only when an actual experiment produces it."/>;
  return <div className="stage-evidence">
    {stage === 'analyze' ? <>
      <p><strong>Expected behavior</strong><br/>{record.input.expected}</p>
      {record.input.error ? <p><strong>Reported error</strong><br/>{record.input.error}</p> : null}
      {record.plan ? <><h4>Recorded analysis</h4><p>{record.plan.analysis}</p><h4>Hypothesis</h4><p>{record.plan.hypothesis}</p><details open><summary>Frozen test contract · defined before patching</summary><pre>{JSON.stringify({ mode: record.plan.mode, exportName: record.plan.exportName, tests: record.plan.tests }, null, 2)}</pre></details><p className="evidence-note">No separate model-call duration is recorded.</p></> : <NoEvidence detail="The model has not returned a validated test plan."/>}
      <details><summary>Original submitted code</summary><Code text={record.input.code} language="javascript"/></details>
    </> : null}
    {stage === 'reproduce' ? <>
      {record.reproduction ? <ExecutionEvidence evidence={record.reproduction}/> : <NoEvidence detail="No original execution evidence has been recorded."/>}
      {record.reproductionReason ? <p><strong>Recorded match assessment</strong><br/>{record.reproductionReason}</p> : null}
      <details><summary>Original code and reproduction steps</summary><Code text={record.input.code} language="javascript"/><p>{record.input.steps || 'No reproduction steps supplied.'}</p></details>
    </> : null}
    {stage === 'patch' ? record.patch ? <><p>{record.patch.explanation}</p><CodeDiffViewer original={record.input.code} candidate={record.patch.code} outcome={patchOutcome(record)} allowCopy/><p className="evidence-note">No separate patch-generation duration is recorded.</p>{record.patch.limitations.map((text, index) => <p key={index}>{text}</p>)}</> : <NoEvidence detail="No candidate patch was generated. A failed or unverified reproduction does not establish a fix."/> : null}
    {stage === 'verify' ? <>
      <p>The candidate is checked against the frozen assertions in a fresh sandbox. A target-test pass covers only the listed cases.</p>
      {record.verification ? <ExecutionEvidence evidence={record.verification}/> : <NoEvidence detail="No candidate execution evidence has been recorded."/>}
    </> : null}
    {record.error ? <p className="fail-text">{displayEvidenceText(record.error)}</p> : null}
  </div>;
}

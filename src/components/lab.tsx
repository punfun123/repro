'use client';
import { useEffect, useRef, useState } from 'react';
import type { Experiment, ExperimentInput } from '@/experiment/types';
import type { serviceStatus } from '@/config/services';
import { displayEvidenceText, hasTargetTestPass, isActiveExperiment, patchOutcome } from '@/experiment/visualization';
import { ExecutionVisualizer } from './execution-visualizer';
import { CodeDiffViewer } from './code-diff-viewer';
import { ExecutionEvidence } from './experiment-evidence';

const sample = { code: 'module.exports = function getUserId(user) {\n  return user.id;\n};', error: "TypeError: Cannot read properties of undefined (reading 'id')", expected: 'Return null when user is null or missing. Return the id for an existing user.', steps: 'Call getUserId(null), getUserId(), and getUserId({ id: 42 }).' };
const savedIdKey = 'repro.last-experiment.v1';
function storeId(id: string | null) { try { if (id) sessionStorage.setItem(savedIdKey, id); else sessionStorage.removeItem(savedIdKey); } catch { /* Recovery is optional when browser storage is blocked. */ } }

export function Lab({ services }: { services: ReturnType<typeof serviceStatus> }) {
  const [input, setInput] = useState({ code: '', error: '', expected: '', steps: '' });
  const [streaming, setStreaming] = useState(false);
  const [record, setRecord] = useState<Experiment | null>(null);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState('');
  const [showPublish, setShowPublish] = useState(false);
  const [recoveryId, setRecoveryId] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [recoveryActive, setRecoveryActive] = useState(false);
  const latestId = useRef<string | null>(null);
  const streamAbort = useRef<AbortController | null>(null);
  const running = streaming || recoveryActive || recovering;

  useEffect(() => {
    try { const id = sessionStorage.getItem(savedIdKey); if (id && /^[a-f0-9-]{36}$/.test(id)) setRecoveryId(id); } catch { /* No browser recovery storage. */ }
    return () => streamAbort.current?.abort();
  }, []);

  // Read only the existing owner-checked API. The browser stores an ID, never code or logs.
  useEffect(() => {
    if (!recoveryId || streaming) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let first = true;
    async function restore() {
      setRecovering(true);
      try {
        const response = await fetch(`/api/experiments/${recoveryId}`, { cache: 'no-store', signal: controller.signal });
        if (response.status === 404) { storeId(null); setRecoveryId(null); setRecoveryActive(false); setError('No accessible saved experiment was found for this browser session.'); return; }
        if (!response.ok) throw new Error('The saved record is temporarily unavailable. Its result has not been changed.');
        const saved: Experiment = await response.json();
        if (saved.id !== recoveryId || !saved.input || !Array.isArray(saved.events)) throw new Error('The saved record could not be read.');
        if (controller.signal.aborted) return;
        setRecord(saved); latestId.current = saved.id;
        if (first) { const value: ExperimentInput = saved.input; setInput({ code: value.code, error: value.error, expected: value.expected, steps: value.steps }); first = false; }
        const active = isActiveExperiment(saved.status); setRecoveryActive(active);
        if (active) timer = setTimeout(restore, 1500);
      } catch (cause) {
        if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : 'The saved record could not be read.'); setRecoveryActive(false); }
      } finally { if (!controller.signal.aborted) setRecovering(false); }
    }
    void restore();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [recoveryId, streaming]);

  function acceptSnapshot(snapshot: Experiment) { setRecord(snapshot); latestId.current = snapshot.id; storeId(snapshot.id); }

  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (!services.ready || running) return;
    setRecoveryId(null); setRecoveryActive(false); setRecovering(false); setStreaming(true); setError(''); setRecord(null); setReceipt(''); setShowPublish(false); latestId.current = null; storeId(null);
    const controller = new AbortController(); streamAbort.current = controller;
    try {
      const session = await fetch('/api/session', { cache: 'no-store', signal: controller.signal });
      if (!session.ok) throw new Error('SESSION_UNAVAILABLE');
      const response = await fetch('/api/experiments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: 'javascript', ...input }), signal: controller.signal });
      if (!response.ok) { const body = await response.json(); throw new Error(body.error || 'EXECUTION UNAVAILABLE'); }
      if (!response.body) throw new Error('No experiment stream was returned.');
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let finished = false;
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) >= 0) {
          const packet = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
          const eventName = packet.split('\n').find(line => line.startsWith('event: '))?.slice(7);
          const dataLine = packet.split('\n').find(line => line.startsWith('data: ')); if (!dataLine) continue;
          const data = JSON.parse(dataLine.slice(6));
          if (eventName === 'error') { setError(data.message || data.error); if (data.record) acceptSnapshot(data.record); finished = true; }
          else { acceptSnapshot(data); if (eventName === 'result') finished = true; }
        }
      }
      if (!finished) throw new Error('The stream ended before a final result. Checking the last saved record; the result remains unverified.');
    } catch (cause) {
      if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : 'EXECUTION UNAVAILABLE'); if (latestId.current) setRecoveryId(latestId.current); }
    } finally { if (!controller.signal.aborted) setStreaming(false); streamAbort.current = null; }
  }

  function download() {
    if (!record) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `repro-${record.id}.json`; anchor.click(); URL.revokeObjectURL(url);
  }
  async function publish() {
    if (!record) return;
    try {
      const response = await fetch(`/api/experiments/${record.id}/publish`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error); setReceipt(result.url); setShowPublish(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'PUBLISH_FAILED'); }
  }
  function clearView() { setRecord(null); setRecoveryId(null); setRecoveryActive(false); setRecovering(false); setReceipt(''); setShowPublish(false); setError(''); storeId(null); latestId.current = null; }

  return <div className="standard-page lab-page">
    <div className="page-heading"><span className="path-label">lab / experiment</span><h1>Give it something broken<span>.</span></h1><p>A small JavaScript bug. One candidate patch. Evidence you can inspect.</p></div>
    {!services.ready ? <div className="service-notice" role="status"><span className="notice-dot"/><div><strong>{services.reason}</strong><p>Live experiments are closed until the required services are configured. The graph shows recorded evidence only.</p><div className="service-list"><span>Groq {services.ai ? 'credentials available' : 'not configured'}</span><span>Sandbox {services.execution ? 'credentials available' : 'not configured'}</span><span>Storage {services.database ? 'configured' : 'not configured'}</span></div></div></div> : null}
    {recovering || recoveryActive ? <p className="recovery-notice" role="status">{recovering ? 'Reading the private saved record…' : 'Following the last recorded active state. Checking the saved record for new events; animation does not establish worker liveness.'}</p> : null}
    <ExecutionVisualizer key={record?.id || 'empty'} record={record}/>
    {record && !streaming ? <button type="button" className="text-button clear-record" onClick={clearView}>Clear this view · saved record is unchanged</button> : null}

    <form onSubmit={run}>
      <div className="editor-label"><label htmlFor="code">01 <strong>JavaScript</strong><span>dependency-free · CommonJS</span></label><button type="button" className="text-button" disabled={running} onClick={() => setInput(sample)}>Load an example ↗</button></div>
      <div className="code-editor"><div className="editor-top"><span>submission.cjs</span><span>JS</span></div><textarea id="code" aria-label="JavaScript code" value={input.code} onChange={event => setInput({ ...input, code: event.target.value })} placeholder={'// Paste a small JavaScript snippet here.\n// Export a function with module.exports, or use console.log.\n\nmodule.exports = function getUserId(user) {\n  return user.id;\n};'} spellCheck={false} maxLength={12000} required disabled={running}/><div className="editor-bottom">No packages. No network access.<span>{input.code.length.toLocaleString()} / 12,000</span></div></div>
      <div className="form-field"><label htmlFor="error">02 <strong>What went wrong?</strong> <span>optional error message</span></label><input id="error" value={input.error} onChange={event => setInput({ ...input, error: event.target.value })} placeholder="The error you saw, in your own words." maxLength={2000} disabled={running}/></div>
      <div className="form-field"><label htmlFor="expected">03 <strong>What should happen?</strong></label><textarea id="expected" value={input.expected} onChange={event => setInput({ ...input, expected: event.target.value })} placeholder="Be specific. This determines what gets tested." minLength={8} maxLength={2000} required rows={3} disabled={running}/></div>
      <details className="steps-details"><summary>Add reproduction steps (optional)</summary><label className="sr-only" htmlFor="steps">Reproduction steps</label><textarea id="steps" value={input.steps} onChange={event => setInput({ ...input, steps: event.target.value })} maxLength={2000} disabled={running}/></details>
      <div className="run-row"><button className="primary-button" disabled={running || !services.ready} type="submit">{running ? 'FOLLOWING EXPERIMENT…' : 'RUN REPRO'}<span>↗</span></button><p>Private by default.<br/>Your code is never published automatically.</p></div>
    </form>
    {error ? <div className="request-error" role="alert">{error}</div> : null}
    {record ? <section className="experiment-result">
      <div className="result-heading"><h2>{record.status === 'TARGET_TEST_PASSED' && !hasTargetTestPass(record) ? 'UNVERIFIED' : record.status.replaceAll('_', ' ')}</h2><button className="text-button" onClick={download} type="button">Download evidence ↓</button></div>
      <p className="evidence-meta">{record.id} · recorded elapsed {record.durationMs} ms · {record.persistence === 'supabase' ? 'Saved privately' : 'Temporary local record'}</p>
      <details className="recorded-events"><summary>Recorded event timeline ({record.events.length})</summary><ol className="event-log">{record.events.map((event, index) => <li key={index}><time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time><b>{event.status}</b><p>{displayEvidenceText(event.message)}</p></li>)}</ol></details>
      {record.patch ? <section className="result-section" id="candidate-comparison"><h3>The proposed change</h3><p>{record.patch.explanation}</p><CodeDiffViewer original={record.input.code} candidate={record.patch.code} outcome={patchOutcome(record)} allowCopy/><details><summary>Original and candidate execution logs</summary>{record.reproduction ? <><h4>Original execution</h4><ExecutionEvidence evidence={record.reproduction}/></> : null}{record.verification ? <><h4>Candidate verification</h4><ExecutionEvidence evidence={record.verification}/></> : <p>NO EVIDENCE AVAILABLE · candidate not yet verified</p>}</details></section> : null}
      {record.limitations.length ? <section className="limitations"><h3>What this does not prove</h3><ul>{record.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul></section> : null}
      {!running && !isActiveExperiment(record.status) && record.persistence === 'supabase' ? <div className="publish-area"><button className="text-button" onClick={() => setShowPublish(!showPublish)}>Publish a status receipt ↗</button>{showPublish ? <div><p>Only the experiment ID, date, final status and test count will be public. Code, descriptions, AI output and logs stay private.</p><pre>{JSON.stringify({ id: record.id, created_at: record.createdAt, status: record.status, test_count: record.plan?.tests.length || 0 }, null, 2)}</pre><button type="button" className="primary-button" onClick={publish}>Confirm publication</button><button type="button" className="text-button" onClick={() => setShowPublish(false)}>Cancel</button></div> : null}{receipt ? <a href={receipt}>View public receipt ↗</a> : null}</div> : null}
    </section> : null}
    <div className="lab-footnote"><span>Read the mechanism.</span><a href="/source">Inspect the pipeline ↗</a></div>
  </div>;
}

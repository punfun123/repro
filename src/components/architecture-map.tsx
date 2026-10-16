'use client';
import Link from 'next/link';
import { useId, useState } from 'react';
import type { serviceStatus } from '@/config/services';
import { sourceFiles } from '@/source/files';

const modules = [
  { id: 'api', label: 'Request boundary', position: 'request', description: 'POST /api/experiments checks the owner capability, origin, input and rate limits, starts the pipeline and saves event snapshots.', service: null },
  { id: 'pipeline', label: 'Experiment pipeline', position: 'pipeline', description: 'runExperiment coordinates analysis, original execution, failure matching, one candidate patch and unchanged-test verification.', service: null },
  { id: 'groq', label: 'Groq analysis & patch', position: 'ai', description: 'Three server-only calls propose a test plan, assess the observed failure and generate one candidate. The model cannot declare a test passed.', service: 'ai' },
  { id: 'sandbox', label: 'Sandbox & harness', position: 'sandbox', description: 'The pipeline calls this adapter twice: once for the original and once for the candidate. Each uses a fresh network-denied microVM and the trusted runner.cjs harness.', service: 'execution' },
  { id: 'verdict', label: 'Target-test verdict', position: 'verdict', description: 'The pipeline calls this function after execution. It checks the test fingerprint, assertion count, exit code and actual assertion results.', service: null },
  { id: 'store', label: 'Private result storage', position: 'storage', description: 'The API saves each event snapshot and the final record with an owner hash. Reads require both that owner and the experiment ID. Production requires configured database storage.', service: 'database' },
] as const;

export function ArchitectureMap({ services, repository, selectedFile }: { services: ReturnType<typeof serviceStatus>; repository: string; selectedFile: string }) {
  const [selection, setSelection] = useState<string | null>(null);
  const panelId = useId();
  const markerId = useId().replaceAll(':', '');
  const selected = modules.find(module => module.id === selection) || modules.find(module => module.id === selectedFile) || modules[1];
  const file = sourceFiles.find(file => file.id === selected.id)!;
  const availability = selected.service ? services[selected.service] ? 'CREDENTIALS AVAILABLE · NOT VERIFIED BY THIS MAP' : 'NOT CONFIGURED' : 'IMPLEMENTED · STATIC SOURCE';
  return <section className="architecture-map" aria-label="Source architecture map">
    <div className="visualizer-heading"><span>ARCHITECTURE MAP</span><span>STATIC SOURCE RELATIONSHIPS</span></div>
    <p className="architecture-intro">The request starts the pipeline. The pipeline calls the AI, runner and verdict function; the request saves their snapshots. This map reports no live execution.</p>
    <div className="architecture-diagram">
      <svg viewBox="0 0 1000 300" preserveAspectRatio="none" aria-hidden="true"><defs><marker id={markerId} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto-start-reverse"><path d="M0 0L5 2.5L0 5"/></marker></defs><g markerEnd={`url(#${markerId})`}><path d="M160 55H430L480 110"/><path d="M220 35H780"/><path d="M460 145L210 235"/><path d="M500 160V230"/><path d="M550 145L790 235"/></g></svg>
      {modules.map(module => <button key={module.id} type="button" className={`architecture-node architecture-${module.position}`} aria-pressed={selected.id === module.id} aria-controls={panelId} onClick={() => setSelection(module.id)}><span className="module-dot" aria-hidden="true"/>{module.label}</button>)}
    </div>
    <div className="architecture-inspector" id={panelId}><div><h3>{selected.label}</h3><span className="module-availability">{availability}</span></div><p>{selected.description}</p><code>{file.path}</code><div className="architecture-links"><Link href={`/source?file=${selected.id}`}>Read this file in Source ↗</Link>{repository ? <a href={`${repository}/blob/main/${file.path}`} target="_blank" rel="noreferrer">GitHub ↗</a> : null}{selected.id === 'sandbox' ? <Link href="/source?file=harness">Read the assertion harness ↗</Link> : null}</div></div>
  </section>;
}

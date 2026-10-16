'use client';
import { useId, useState } from 'react';
import type { Experiment } from '@/experiment/types';
import { executionStages, hasTargetTestPass, type StageId } from '@/experiment/visualization';
import { BugMascotAnimation } from './bug-mascot-animation';
import { StageEvidence } from './experiment-evidence';

export function ExecutionVisualizer({ record }: { record: Experiment | null }) {
  const [selection, setSelection] = useState<StageId | null>(null);
  const id = useId();
  const stages = executionStages(record);
  const latest = stages.find(stage => stage.state === 'RUNNING') || stages.findLast(stage => stage.state !== 'WAITING' && stage.state !== 'SKIPPED') || stages[0];
  const selected = stages.find(stage => stage.id === selection) || latest;
  return <section className="execution-visualizer" aria-label="Experiment execution visualizer">
    <div className="visualizer-heading"><span>RECORDED EXECUTION</span>{record ? <span>{record.status === 'TARGET_TEST_PASSED' && !hasTargetTestPass(record) ? 'UNVERIFIED · INCOMPLETE EVIDENCE' : record.status.replaceAll('_', ' ')}</span> : <span>NO EXPERIMENT</span>}</div>
    <ol className="execution-nodes">{stages.map((stage, index) => <li key={stage.id} data-state={stage.state} data-target-pass={stage.targetedPass}>
      <button type="button" aria-label={`${String(index + 1).padStart(2, '0')} ${stage.label}: ${stage.targetedPass ? 'target tests passed' : stage.state}`} aria-pressed={selected.id === stage.id} aria-controls={id} onClick={() => setSelection(stage.id)}>
        <span className="stage-marker" aria-hidden="true">{stage.state === 'COMPLETED' ? '✓' : stage.state === 'FAILED' ? '×' : String(index + 1).padStart(2, '0')}</span>
        <span className="stage-name">{stage.label}</span><span className="stage-state">{stage.targetedPass ? 'TARGET TEST PASSED' : stage.state}</span>
      </button>
    </li>)}</ol>
    <BugMascotAnimation record={record}/>
    <div className="stage-inspector" id={id}>
      <div className="stage-inspector-heading"><h3>{selected.label} <span>{selected.state}</span></h3>{selection ? <button className="text-button" type="button" onClick={() => setSelection(null)}>Follow latest stage</button> : null}</div>
      <p className="stage-description">{selected.description}</p>
      <StageEvidence stage={selected.id} record={record}/>
    </div>
  </section>;
}

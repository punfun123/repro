import type { Experiment } from '@/experiment/types';
import { hasConfirmedReproduction, hasTargetTestPass } from '@/experiment/visualization';

export function BugMascotAnimation({ record, illustrative = false, animate = true }: { record?: Experiment | null; illustrative?: boolean; animate?: boolean }) {
  const reproduced = illustrative || hasConfirmedReproduction(record ?? null);
  const passed = !illustrative && hasTargetTestPass(record ?? null);
  const phase = illustrative ? 'reproduced' : !record ? 'idle' : passed ? 'verified'
    : record.status === 'ANALYZING' || record.status === 'REPRODUCING' ? 'searching'
    : record.status === 'PATCHING' ? 'patching'
    : record.status === 'TEST_FAILED' || record.status === 'EXECUTION_ERROR' ? 'failed'
    : record.status === 'UNVERIFIED' || record.status === 'NEEDS_REVIEW' || record.status === 'TARGET_TEST_PASSED' ? 'unverified'
    : reproduced ? 'reproduced' : 'idle';
  return <div className={`bug-animation${animate ? ' motion-active' : ''}`} data-phase={phase} data-reproduced={reproduced} data-target-pass={passed}>
    <div className="bug-actors" aria-hidden="true"><img className="bug-primary" src="/repro-token-logo.png" alt="" width="72" height="72"/>{reproduced ? <img className="bug-secondary" src="/repro-token-logo.png" alt="" width="72" height="72"/> : null}</div>
    <div className="bug-feedback">
      {reproduced ? <span className="reproduced-label">BUG REPRODUCED{illustrative ? ' · ILLUSTRATION' : ''}</span> : <span>{phase === 'searching' ? 'Examining the recorded failure' : phase === 'failed' ? 'Execution stopped with an error' : phase === 'unverified' ? 'Evidence remains unverified' : 'Waiting for recorded execution'}</span>}
      {passed ? <span className="pass-text">✓ Target tests passed · broader behavior unverified</span> : record?.status === 'TEST_FAILED' ? <span className="fail-text">Candidate failed target tests</span> : phase === 'patching' ? <span>Generating one candidate · not yet verified</span> : phase === 'unverified' && reproduced ? <span>Candidate evidence remains unverified</span> : null}
    </div>
  </div>;
}

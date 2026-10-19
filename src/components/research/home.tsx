'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { guideCells, guideLabUrl, guideSteps, guideStudy, type GuideEvent } from '@/research/guide';
import { variants } from '@/research/catalog';
import { valueText } from '@/research/values';
import { syntaxLines } from '@/source/syntax';
import { SyntaxText } from '../code';
import { useGuide } from './use-guide';

function resultText(event?: GuideEvent) {
  if (!event?.outcome) return 'Awaiting run';
  return event.outcome.error ? 'throws ' + event.outcome.error : valueText(event.outcome.value);
}
function GuideTrace({ events, index, onSelect }: { events: GuideEvent[]; index: number; onSelect: (index: number) => void }) {
  const x = (sequence: number) => 8 + sequence / 40 * 580;
  return <div className="guide-trace" aria-label="Captured execution trace">
    <div className="guide-trace-labels" aria-hidden="true"><span>Original</span><span>Patch A</span><span>Patch B</span></div>
    <svg viewBox="0 0 600 174" preserveAspectRatio="none" role="group" aria-label="Select a captured execution event">
      {[0, 1, 2].map(lane => <path key={lane} d={'M0 ' + (47 + lane * 58) + 'H600'} className="guide-lane-rule"/>)}
      {guideSteps.map(step => { const captured = events.filter(event => event.stepId === step.id); if (!captured.length) return null; const lane = ['original', 'a', 'b'].indexOf(step.variant); return <rect key={step.id} x={x(captured[0].sequence)} y={10 + lane * 58} width={Math.max(3, x(captured.at(-1)!.sequence + 1) - x(captured[0].sequence))} height="3" className="guide-context-span"/>; })}
      {events.map(event => { const lane = ['original', 'a', 'b'].indexOf(event.variantId); const tone = event.kind === 'EXCEPTION' || event.passed === false ? 'failure' : event.kind === 'ASSERTION' ? 'pass' : event.kind === 'CONDITION' ? 'condition' : event.kind === 'WRITE' ? 'write' : 'read'; return <g key={event.sequence} role="button" tabIndex={0} aria-label={'Inspect event ' + event.sequence + ' ' + event.kind} aria-pressed={event.sequence === index} className={'guide-event guide-' + tone + (event.sequence === index ? ' guide-event-selected' : '')} onClick={() => onSelect(event.sequence)} onKeyDown={key => { if (key.key === 'Enter' || key.key === ' ') { key.preventDefault(); onSelect(event.sequence); } }}><title>{event.kind + ': ' + event.note}</title><rect x={x(event.sequence)} y={20 + lane * 58} width="9" height={event.kind === 'ASSERTION' || event.kind === 'EXCEPTION' ? 25 : 17}/></g>; })}
      {events[index] ? <path d={'M' + (x(index) + 4) + ' 0V172'} className="guide-trace-position"/> : null}
    </svg>
  </div>;
}
export function ResearchHome() {
  const guide = useGuide(); const { state, event, step } = guide;
  const variant = variants(guideStudy).find(variant => variant.id === step.variant)!;
  const code = useMemo(() => syntaxLines(variant.code), [variant.code]);
  const cell = guideCells.find(cell => cell.id === step.cellId)!;
  const assertions = state.events.filter(event => event.kind === 'ASSERTION');
  const currentAssertion = assertions.find(item => item.stepId === step.id);
  const status = state.status === 'RUNNING' ? 'LOCAL ENGINE RUNNING' : state.status === 'COMPLETE' ? 'CYCLE COMPLETE' : 'INSPECTION PAUSED';
  return <article className="repro-home" data-status={state.status} data-events={state.events.length} data-step={step.id}>
    <section className="home-hero" aria-label="REPRO and the running experiment">
      <header className="home-intro"><div className="home-identity"><img src="/repro-token-logo.png" alt="" width="48" height="48"/><span>$REPRO <b>/</b> AN INDEPENDENT EXPERIMENT</span></div><h1><span>MAKE IT</span><span>BREAK FIRST<span className="home-period">.</span></span></h1><p>AI can suggest a fix.<br/>{' '}I want it to prove one.</p><p className="home-author-copy">I built REPRO around a simple rule: reproduce the failure, then test the repair against what the code should do.</p><div className="home-actions"><Link href={guideLabUrl(step.id)} className="home-primary-link">Open the lab <span aria-hidden="true">↗</span></Link><Link href="/origin">Read my story <span aria-hidden="true">→</span></Link></div><p className="home-signature">— REPRO Developer</p></header>
      <section className="guided-experiment" aria-label="Running verification experiment" data-variant={step.variant} data-condition={step.cellId}>
        <header className="guide-header"><span>ONE BUG. TWO CANDIDATES.</span><span className={'guide-state state-' + state.status.toLowerCase()}><i aria-hidden="true"/>{status}</span></header>
        <div className="guide-current-heading"><span>{String((event?.stepIndex ?? 0) + 1).padStart(2, '0')} / 05 <b>·</b> {step.label} <b>·</b> {step.inputLabel}</span><h2>{step.title}</h2></div>
        <GuideTrace events={state.events} index={state.inspection} onSelect={guide.seek}/>
        <div className="guide-event-caption"><span>EVENT #{event?.sequence ?? 0} <b>·</b> {event?.kind || 'ENTRY'}</span><span>{event?.note || 'Preparing the local interpreter.'}</span></div>
        <div className="guide-code-state"><div className="guide-source"><header><span>{step.label.toUpperCase()} / SOURCE</span><span>{event?.line ? 'line ' + event.line : 'assertion boundary'}</span></header><div>{code.map((parts, index) => <div key={index} className={event?.line === index + 1 ? 'guide-source-selected' : ''}><span aria-hidden="true">{index + 1}</span><code><SyntaxText parts={parts}/></code></div>)}</div></div><div className="guide-variables"><header>CAPTURED VALUES<code>{'input = ' + valueText(cell.input)}</code></header>{event?.variables.length ? event.variables.slice(0, 3).map(variable => <div key={variable.name}><code>{variable.name}</code><span>{valueText(variable.value)}</span></div>) : <div><code>input</code><span>{valueText(cell.input)}</span></div>}</div></div>
        <div className={'guide-outcome' + (currentAssertion ? currentAssertion.passed ? ' outcome-pass' : ' outcome-fail' : '')}><div><span>REQUIRED</span><code>{cell.expected?.error || valueText(cell.expected?.value)}</code></div><div><span>COMPUTED</span><code>{resultText(currentAssertion)}</code></div><strong>{currentAssertion ? currentAssertion.passed ? 'CONDITION MET' : 'CONDITION FAILED' : 'CAPTURING EVENTS'}</strong></div>
        <div className="guide-controls"><div><button type="button" onClick={state.status === 'RUNNING' ? guide.pause : guide.play}>{state.status === 'RUNNING' ? 'Ⅱ Pause' : '▷ Play'}</button><button type="button" onClick={guide.replay}>Replay ↻</button><button type="button" className="guide-step-button" disabled={state.status === 'RUNNING' || state.status === 'COMPLETE'} onClick={guide.advance}>Step →</button></div><Link href={guideLabUrl(step.id)}>Inspect in Lab ↗</Link></div>
        <div className="guide-footnote"><span>Browser-local rule execution</span><span>{state.events.length} captured events <b>·</b> 8 events/s presentation</span></div>
        <label className="guide-scrubber"><span>Inspect event</span><input type="range" aria-label="Inspect homepage event" min={0} max={Math.max(0, state.events.length - 1)} value={Math.min(state.inspection, Math.max(0, state.events.length - 1))} onChange={event => guide.seek(Number(event.target.value))}/><output>{state.inspection}</output></label>
      </section>
    </section>
    <section className="home-proof" aria-labelledby="home-proof-title"><header><div><span>THE DIFFERENCE IS IN THE RESULT</span><h2 id="home-proof-title">A quiet error is still an error.</h2></div><p>Patch A stops the exception and loses a valid value. Follow all five runs, or select a result to inspect its evidence.</p></header><ol className="guide-results">{guideSteps.map((item, index) => { const assertion = assertions.find(event => event.stepId === item.id); return <li key={item.id}><button type="button" onClick={() => guide.inspect(item.id)} aria-pressed={step.id === item.id} data-guide-step={item.id} data-passed={assertion?.passed ?? 'pending'}><span>{String(index + 1).padStart(2, '0')}</span><strong>{item.label}</strong><code>{item.inputLabel}</code><span className={assertion ? assertion.passed ? 'result-met' : 'result-failed' : 'result-pending'}>{resultText(assertion)} {assertion ? assertion.passed ? '✓' : '×' : ''}</span></button></li>; })}</ol><p className="guide-explanation">{step.explanation} <Link href={guideLabUrl(step.id)}>Open this exact condition ↗</Link></p></section>
    <section className="home-method"><div><span>$REPRO / THE IDEA</span><h2>Make a claim.<br/>Leave evidence.</h2><p>$REPRO is the community identity around this experiment. I keep the rules, tests and source open so you can inspect the work behind the idea.</p></div><div><span>FOLLOW THE WORK</span><Link href="/lab">Explore all 11 rule models ↗</Link><Link href="/source?file=research-guide">Read the homepage evaluator ↗</Link><Link href="/source?file=controlled-evidence">Inspect the recorded Sandbox evidence ↗</Link><Link href="/origin">Read the complete author story ↗</Link><p>The homepage runs bounded local models. The Source page also preserves a separate controlled Sandbox record.</p></div></section>
  </article>;
}

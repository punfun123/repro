'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { executeGuide, guideSteps, type GuideEvent, type GuideStepId } from '@/research/guide';

type GuideState = { events: GuideEvent[]; inspection: number; status: 'RUNNING' | 'PAUSED' | 'COMPLETE'; scope?: GuideStepId };
export function useGuide() {
  const [state, setState] = useState<GuideState>({ events: [], inspection: 0, status: 'PAUSED' });
  const latest = useRef(state);
  const iterator = useRef<Generator<GuideEvent, void> | null>(null);
  const commit = useCallback((next: GuideState) => { latest.current = next; setState(next); }, []);
  const reset = useCallback((running: boolean, scope?: GuideStepId) => {
    iterator.current = executeGuide(scope);
    const first = iterator.current.next();
    commit({ events: first.done ? [] : [first.value], inspection: 0, status: running ? 'RUNNING' : 'PAUSED', scope });
  }, [commit]);
  const advance = useCallback(() => {
    const previous = latest.current;
    if (previous.inspection < previous.events.length - 1) { commit({ ...previous, inspection: previous.inspection + 1 }); return; }
    const next = iterator.current?.next();
    if (!next || next.done) { commit({ ...previous, status: 'COMPLETE' }); return; }
    commit({ ...previous, events: [...previous.events, next.value], inspection: previous.events.length });
  }, [commit]);
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    reset(!reduced.matches && !document.hidden);
    const pause = () => { if (document.hidden || reduced.matches) commit({ ...latest.current, status: 'PAUSED' }); };
    document.addEventListener('visibilitychange', pause); reduced.addEventListener('change', pause);
    return () => { document.removeEventListener('visibilitychange', pause); reduced.removeEventListener('change', pause); iterator.current = null; };
  }, [reset, commit]);
  const event = state.events[state.inspection];
  useEffect(() => {
    if (state.status !== 'RUNNING') return;
    const timer = setTimeout(advance, event?.kind === 'ASSERTION' ? 900 : 125);
    return () => clearTimeout(timer);
  }, [advance, state.status, state.inspection, state.events.length, event?.kind]);

  function inspect(stepId: GuideStepId) {
    const matches = latest.current.events.map((event, index) => ({ event, index })).filter(item => item.event.stepId === stepId);
    const captured = matches.find(item => item.event.kind === 'ASSERTION') || matches.at(-1);
    if (captured) commit({ ...latest.current, inspection: captured.index, status: 'PAUSED' });
    else reset(false, stepId);
  }
  return { state, event, step: guideSteps.find(step => step.id === event?.stepId) || guideSteps[0], advance, inspect,
    pause: () => commit({ ...latest.current, status: 'PAUSED' }),
    play: () => latest.current.status === 'COMPLETE' ? reset(true, latest.current.scope) : commit({ ...latest.current, status: 'RUNNING' }),
    replay: () => reset(true),
    seek: (index: number) => commit({ ...latest.current, inspection: Math.max(0, Math.min(index, latest.current.events.length - 1)), status: 'PAUSED' }),
  };
}

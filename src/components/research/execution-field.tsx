'use client';
import { useEffect,useMemo,useRef,useState } from 'react';
import type { StudyEvent } from '@/research/computation';
import type { StudyCase } from '@/research/catalog';
import { variants } from '@/research/catalog';
import { valueText } from '@/research/values';
const tones:Record<string,string>={ENTRY:'context',EXIT:'context',READ:'read',WRITE:'write',CONDITION:'condition',ACCESS:'read',EXCEPTION:'exception',RETURN:'return',ASSERTION:'assertion',SCHEDULE:'schedule'};
export function ExecutionField({study,events,index,status,mode,onSelect}:{study:StudyCase;events:StudyEvent[];index:number;status:string;mode:'sweep'|'focused';onSelect:(index:number)=>void}){
  const[windowSize,setWindowSize]=useState(96);
  const plot=useRef<HTMLDivElement>(null);const[plotWidth,setPlotWidth]=useState(680);
  useEffect(()=>{const node=plot.current;if(!node)return;const resize=()=>setPlotWidth(Math.max(680,Math.round(node.clientWidth)));resize();const observer=new ResizeObserver(resize);observer.observe(node);return()=>observer.disconnect();},[]);
  const current=events[index];const choices=variants(study).filter(variant=>mode==='sweep'||variant.id===events[0]?.variantId);
  const focused=mode==='focused';const laneHeight=focused?150:95;const bottom=focused?145:295;const plotHeight=focused?180:330;
  const start=Math.max(0,Math.min(Math.max(0,index-windowSize+12),Math.max(0,events.length-windowSize)));
  const visible=events.slice(start,start+windowSize);const end=Math.max(start+windowSize,1);const available=plotWidth-130;const x=(ordinal:number)=>104+(ordinal-start)/windowSize*available;
  const frames=useMemo(()=>{
    const active=new Map<string,{start:number;event:StudyEvent}>();const spans:{start:number;end:number;event:StudyEvent}[]=[];
    for(const event of events){
      const key=event.variantId+'/'+event.cellId+'/'+event.context+'/'+event.depth;
      if(event.kind==='ENTRY')active.set(key,{start:event.sequence,event});
      if(event.kind==='EXIT'||event.kind==='RETURN'){const entry=active.get(key);if(entry){spans.push({...entry,end:event.sequence});active.delete(key);}}
    }
    for(const entry of active.values())spans.push({...entry,end:events.length-1});
    return spans;
  },[events]);
  return <section className="compute-field" aria-label="Execution Field" data-status={status} data-mode={mode}>
    <header><div><span>EXECUTION FIELD</span><strong>Inside the running rule</strong></div><label>Event window<select aria-label="Trace event window" value={windowSize} onChange={event=>setWindowSize(Number(event.target.value))}><option value={48}>48 events</option><option value={96}>96 events</option><option value={160}>160 events</option></select></label></header>
    <div className="field-instrument">
      <div className="profiler-region">
        <div className="profiler-scale"><span>EXECUTION ORDER →</span><span>depth is modeled context nesting · no wall-clock axis</span></div>
        <div ref={plot} className="profiler-scroll" tabIndex={0} aria-label="Scrollable execution trace"><svg viewBox={'0 0 '+plotWidth+' '+plotHeight} height={plotHeight} preserveAspectRatio="none" role="group" aria-label="Select an execution event">
          {choices.map((variant,lane)=><g key={variant.id} className="trace-lane"><text x="8" y={35+lane*laneHeight}>{variant.id==='original'?'ORIGINAL':'PATCH '+variant.id.toUpperCase()}</text><text x="8" y={52+lane*laneHeight} className="trace-lane-note">{events.filter(event=>event.variantId===variant.id).length} events</text><path d={'M100 '+(focused?bottom:85+lane*laneHeight)+'H'+(plotWidth-20)}/></g>)}
          {Array.from({length:9},(_,i)=><g className="profiler-grid" key={i}><path d={'M'+(104+i/8*available)+' 15V'+bottom}/><text x={104+i/8*available} y={plotHeight-13} textAnchor="middle">{start+Math.round(i/8*windowSize)}</text></g>)}
          {frames.filter(frame=>frame.end>=start&&frame.start<end).map((frame,i)=>{const lane=choices.findIndex(variant=>variant.id===frame.event.variantId);return <rect key={i} className="function-span" x={x(Math.max(start,frame.start))} y={18+lane*laneHeight+Math.min(frame.event.depth,20)*(focused?4:3)} width={Math.max(2,x(Math.min(end,frame.end+1))-x(Math.max(start,frame.start)))} height="4"><title>{frame.event.context+' · depth '+frame.event.depth+' · events '+frame.start+'—'+frame.end}</title></rect>;})}
          {visible.map(event=>{const lane=choices.findIndex(variant=>variant.id===event.variantId);const left=x(event.sequence);const y=34+lane*laneHeight+Math.min(event.depth,20)*(focused?4:2);return <g key={event.sequence} role="button" tabIndex={0} aria-label={'Event '+event.sequence+' '+event.variantId+' '+event.kind} aria-pressed={event.sequence===index} className={'trace-event event-'+tones[event.kind]+(event.passed===false?' assertion-failed':'')+(event.sequence===index?' selected-event':'')} onClick={()=>onSelect(event.sequence)} onKeyDown={key=>{if(key.key==='Enter'||key.key===' '){key.preventDefault();onSelect(event.sequence);}}}><title>{event.sequence+' / '+event.context+' / '+event.kind+' / '+event.note}</title><rect x={left} y={y} width={Math.max(3,available/windowSize-2)} height={event.kind==='EXCEPTION'?34:event.kind==='ASSERTION'?26:18}/>{event.kind==='EXCEPTION'?<path d={'M'+(left-2)+' '+(y-7)+'l5 5m-5 0l5 -5'}/>:null}</g>;})}
          {current?<g className="execution-position"><path d={'M'+x(index)+' 8V'+bottom}/><circle cx={x(index)} cy="8" r="3"/><text x={Math.min(plotWidth-100,Math.max(115,x(index)+7))} y="12">#{index}</text></g>:null}
        </svg></div>
        <div className="trace-key"><span className="key-read">read / access</span><span className="key-write">write</span><span className="key-condition">condition</span><span className="key-exception">exception</span><span className="key-assertion">assertion</span></div>
        <div className="current-execution-event" data-kind={current?.kind||'ENTRY'}><span>#{current?.sequence??0} / {current?.context||'run'} / depth {current?.depth??0}</span><strong>{current?.kind||'ENTRY'}</strong><p>{current?.note||'Preparing the local interpreter.'}</p></div>
      </div>
      <aside className="variable-state" aria-label="Variable state"><div><span>VARIABLE STATE</span><span>{current?.variantId==='original'?'original':current?.variantId?'patch '+current.variantId:'local model'}</span></div><h3>{current?.context||'run'}<span>{current?.line?'source line '+current.line:'model / assertion boundary'}</span></h3><div className="variable-list">{current?.variables.length?current.variables.map(variable=><section key={variable.name}><header><code>{variable.name}</code><span>{variable.type}</span></header><pre>{valueText(variable.value)}</pre>{variable.alias?<small>aliases {variable.alias} · logical binding identity</small>:null}</section>):<p>No bindings captured for this event.</p>}</div><p className="variable-boundary">Values are captured from the rule interpreter. No heap size or fabricated memory address is shown.</p></aside>
    </div>
    <div className="event-scrubber"><label htmlFor="execution-index">INSPECT EVENT</label><input id="execution-index" aria-label="Inspect execution event" type="range" min={0} max={Math.max(0,events.length-1)} value={Math.min(index,Math.max(0,events.length-1))} onChange={event=>onSelect(Number(event.target.value))}/><output>{index} / {Math.max(0,events.length-1)}</output></div>
  </section>;
}

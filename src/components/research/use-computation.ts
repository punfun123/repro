'use client';
import { useCallback,useEffect,useRef,useState } from 'react';
import { defaultParameters,studyCase,variants,type StudyParameters } from '@/research/catalog';
import { computeField,executeStudy,type ComputedCell,type StudyEvent } from '@/research/computation';
type Status='RUNNING'|'PAUSED'|'COMPLETE'|'LIMIT';
export type ComputationState={caseId:string;parameters:StudyParameters;cells:ComputedCell[];cellId:string;variantId:string;mode:'sweep'|'focused';events:StudyEvent[];inspection:number;status:Status;speed:number};
function initial(id?:string,candidate?:string):ComputationState{
  const study=studyCase(id);const cells=computeField(study,defaultParameters);
  const suppliedVariant=variants(study).some(variant=>variant.id===candidate);
  return{caseId:study.id,parameters:{...defaultParameters},cells,cellId:cells[0].id,variantId:suppliedVariant?candidate!:'original',mode:suppliedVariant?'focused':'sweep',events:[],inspection:0,status:'PAUSED',speed:16};
}
export function useComputation(initialId?:string,initialVariant?:string,automatic=true){
  const[state,setState]=useState(()=>initial(initialId,initialVariant));const current=useRef(state);
  const iterator=useRef<Generator<StudyEvent,void>|null>(null);
  const commit=useCallback((next:ComputationState)=>{current.current=next;setState(next);},[]);
  const configure=useCallback((change:Partial<Pick<ComputationState,'caseId'|'parameters'|'cellId'|'variantId'|'mode'>>,running=false)=>{
    const previous=current.current;const study=studyCase(change.caseId??previous.caseId);const parameters=change.caseId&&change.caseId!==previous.caseId?{...defaultParameters}:change.parameters??previous.parameters;
    const cells=computeField(study,parameters);const recent=previous.events[previous.inspection];
    const cellId=change.cellId??recent?.cellId??previous.cellId;const cell=cells.find(item=>item.id===cellId)||cells[0];
    const variantId=change.variantId??recent?.variantId??previous.variantId;const variant=variants(study).find(item=>item.id===variantId)||variants(study)[0];
    const mode=change.mode??'focused';
    iterator.current=executeStudy(study,parameters,cells,mode,cell.id,variant.id);
    const first=iterator.current.next();const events=first.done?[]:[first.value];
    commit({...previous,caseId:study.id,parameters,cells,cellId:cell.id,variantId:variant.id,mode,events,inspection:0,status:running?'RUNNING':'PAUSED'});
  },[commit]);
  const advance=useCallback(()=>{
    const previous=current.current;
    if(previous.inspection<previous.events.length-1){commit({...previous,inspection:previous.inspection+1});return;}
    if(previous.events.length>=4096){commit({...previous,status:'LIMIT'});return;}
    const next=iterator.current?.next();
    if(!next||next.done){commit({...previous,status:'COMPLETE'});return;}
    commit({...previous,events:[...previous.events,next.value],inspection:previous.events.length});
  },[commit]);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    configure({mode:current.current.mode},automatic&&!media.matches&&!document.hidden);
    const pause=()=>{if(document.hidden||media.matches)commit({...current.current,status:'PAUSED'});};
    document.addEventListener('visibilitychange',pause);media.addEventListener('change',pause);
    return()=>{document.removeEventListener('visibilitychange',pause);media.removeEventListener('change',pause);iterator.current=null;};
  },[automatic,configure,commit]);
  useEffect(()=>{if(state.status!=='RUNNING')return;const timer=setInterval(advance,1000/state.speed);return()=>clearInterval(timer);},[state.status,state.speed,advance]);
  const event=state.events[state.inspection];const activeCell=state.cells.find(cell=>cell.id===(event?.cellId||state.cellId))||state.cells[0];
  const activeVariant=event?.variantId||state.variantId;
  return{state,event,activeCell,activeVariant,configure,advance,
    pause:()=>commit({...current.current,status:'PAUSED'}),
    play:()=>{if(['COMPLETE','LIMIT'].includes(current.current.status))configure({mode:current.current.mode},true);else commit({...current.current,status:'RUNNING'});},
    replay:(running=true)=>configure({mode:current.current.mode},running),
    reset:()=>configure({mode:current.current.mode},false),
    seek:(index:number)=>commit({...current.current,inspection:Math.max(0,Math.min(index,current.current.events.length-1)),status:'PAUSED'}),
    setSpeed:(speed:number)=>commit({...current.current,speed:[2,8,16,32].includes(speed)?speed:16}),
  };
}

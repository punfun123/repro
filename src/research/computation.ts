import type { Outcome, Value } from './types';
import { sameOutcome } from './engine';
import { executeRule, runRule, type ExecutionEvent } from './interpreter';
import { conditionSpace, expectedOutcome, variants, type ConditionInput, type StudyCase, type StudyParameters } from './catalog';
export type ResultState='PASS'|'REJECTED'|'EXCEPTION'|'FAIL'|'UNKNOWN';
export type Observation={outcome:Outcome;expected?:Outcome;passed:boolean|null;state:ResultState};
export type ComputedCell=ConditionInput&{expected?:Outcome;results:Record<string,Observation>};
export type StudyEvent=ExecutionEvent&{sequence:number;cellId:string;variantId:string;input:Value;outcome?:Outcome;expected?:Outcome};
export function observation(actual:Outcome,expected?:Outcome):Observation {
  const unknown=!expected||actual.error?.startsWith('MODEL_');
  const passed=unknown?null:sameOutcome(actual,expected!);
  return{outcome:actual,expected,passed,state:passed===null?'UNKNOWN':passed?actual.error||actual.value===null?'REJECTED':'PASS':actual.error?'EXCEPTION':'FAIL'};
}
export function computeField(study:StudyCase,parameters:StudyParameters):ComputedCell[]{
  return conditionSpace(study,parameters).map(cell=>{
    const expected=expectedOutcome(study,cell.input,parameters.contractKnown);
    return{...cell,expected,results:Object.fromEntries(variants(study).map(variant=>[variant.id,observation(runRule(variant.program,cell.input,{depthLimit:parameters.depthLimit}),expected)]))};
  });
}
export function sweepRepresentatives(cells:ComputedCell[]):ComputedCell[]{
  const seen=new Set<string>();return cells.filter(cell=>{const key=JSON.stringify(cell.input);if(seen.has(key))return false;seen.add(key);return true;});
}
export function sourceLocation(study:StudyCase,variantId:string,event:ExecutionEvent):number{
  if(event.kind==='ASSERTION')return 0;
  const variant=variants(study).find(item=>item.id===variantId)!;const lines=variant.code.split('\n');
  const lastReturn=lines.map((line,index)=>line.includes('return ')?index+1:0).filter(Boolean).at(-1)||1;
  if(event.kind==='ENTRY'&&event.context==='run')return 1;
  if(variant.program.op==='array-index')return event.kind==='RETURN'||event.kind==='EXIT'?event.line===3?4:5:event.line;
  if(variant.program.op==='async')return event.line;
  if(variant.program.op==='retry')return event.context==='run'&&event.note==='Exceptional exit'?6:event.line;
  if(variant.program.op==='factorial'){
    if(event.note==='Check the declared factorial domain')return variant.program.mode==='validated'?2:0;
    if(event.note==='Bounded recursion limit reached'||event.note==='MODEL_DOMAIN_LIMIT')return 0;
    if(event.context==='run'&&event.note==='RangeError')return 2;
    if(event.context==='run'&&(event.kind==='RETURN'||event.kind==='EXIT'))return event.note==='Exceptional exit'&&event.line===2?2:lastReturn;
    return Math.min(lines.length,event.line+(variant.program.mode==='validated'?1:0));
  }
  if(event.context==='run'&&(event.kind==='RETURN'||event.kind==='EXIT'))return lastReturn;
  if(variant.program.op==='discount'||variant.program.op==='array-length'||variant.program.op==='default')return Math.min(lastReturn,event.line);
  return Math.max(1,Math.min(lines.length,event.line));
}
export function* executeStudy(study:StudyCase,parameters:StudyParameters,cells:ComputedCell[],mode:'sweep'|'focused',cellId:string,variantId:string):Generator<StudyEvent,void>{
  const selected=cells.find(cell=>cell.id===cellId)||cells[0];let sequence=0;
  const inputs=mode==='sweep'?sweepRepresentatives(cells):[selected];
  const programs=mode==='sweep'?variants(study):variants(study).filter(variant=>variant.id===variantId);
  for(const cell of inputs)for(const variant of programs){
    const iterator=executeRule(variant.program,cell.input,{depthLimit:parameters.depthLimit});let last:ExecutionEvent|undefined;
    while(true){
      const next=iterator.next();
      if(next.done){
        const assessed=observation(next.value,cell.expected);
        yield{kind:'ASSERTION',line:0,depth:0,context:'contract',note:assessed.passed===null?'Expected behavior or model coverage is incomplete':assessed.passed?'Computed outcome satisfies the contract':'Computed outcome violates the contract',variables:[...(last?.variables||[]),{name:'expected',value:(cell.expected||{value:'unspecified'}) as unknown as Value,type:'contract'},{name:'actual',value:next.value as unknown as Value,type:'outcome'}],passed:assessed.passed,sequence:sequence++,cellId:cell.id,variantId:variant.id,input:cell.input,outcome:next.value,expected:cell.expected};
        break;
      }
      last=next.value;
      yield{...next.value,line:sourceLocation(study,variant.id,next.value),sequence:sequence++,cellId:cell.id,variantId:variant.id,input:cell.input};
    }
  }
}

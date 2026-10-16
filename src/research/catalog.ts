import { caseById } from './cases';
import type { ExperimentCase, Outcome, Program, Value } from './types';
import { UNDEFINED, isUndefined, nullish, isModeledValue } from './values';
export type StudyParameters = { extent: number; depthLimit: number; contractKnown: boolean; custom?: Value };
export type ConditionInput = { id: string; row: string; column: string; input: Value };
export type StudyCase = { id: string; base: ExperimentCase; mechanism: string; dimensions: [string,string] };
const fn=(body:string)=>'module.exports = function run(input) {\n'+body+'\n};';
const arrayCode=(mode:string)=>fn('  const { values, index } = input;\n  const permitted = '+(mode==='inclusive'?'index <= values.length':mode==='upper'?'index < values.length':'Number.isInteger(index) && index >= 0 && index < values.length')+';\n  if (!permitted) return null;\n  return values[index];');
const orderCode=(mode:string)=>fn('  const jobs = [{id:"a",tick:input.a},{id:"b",tick:input.b}].sort((a,b)=>a.tick-b.tick||a.id.localeCompare(b.id));\n  let state = null, settled = false;\n  for (const job of jobs) {\n    const accepted = '+(mode==='latest'?'job.id === "b"':mode==='first'?'!settled':'true')+';\n    if (accepted) { state = job.id; settled = true; }\n  }\n  return state;');
const arrayCase:ExperimentCase={...caseById('negative-length'),id:'array-boundary',title:'The element just beyond the array',bugType:'Array Boundary Error',filename:'array-boundary.cjs',program:{op:'array-index',mode:'inclusive'},originalCode:arrayCode('inclusive'),errorLine:4,expectedBehavior:'Return an element only for an integer index within [0, length). Otherwise return null.',trigger:'An inclusive upper bound admits index === length; a missing lower bound admits negative indices.',diagnosis:'The array lookup returns undefined without throwing. Correct rejection is part of the contract.',observedFailure:'An invalid index leaks undefined.',trace:[{label:'GUARD',line:3,explanation:'Compare index with both array boundaries.'},{label:'ACCESS',line:5,explanation:'An admitted invalid index has no element.'}],assertions:[{id:'end',label:'Index equals length',input:{values:[10,20],index:2},expected:{value:null}},{id:'negative',label:'Negative index',input:{values:[10,20],index:-1},expected:{value:null}},{id:'valid',label:'Existing element',input:{values:[10,20],index:1},expected:{value:20}}],patches:[{id:'a',label:'A · upper bound',program:{op:'array-index',mode:'upper'},code:arrayCode('upper'),explanation:'Fixes the inclusive upper bound but still permits negative indices.'},{id:'b',label:'B · both bounds',program:{op:'array-index',mode:'bounded'},code:arrayCode('bounded'),explanation:'Checks integer index, lower bound and exclusive upper bound.'}]};
const orderCase:ExperimentCase={...caseById('rejected-request'),id:'async-order',title:'The older response overwrites the newer request',bugType:'Asynchronous Ordering',filename:'async-order.cjs',program:{op:'async-order',mode:'completion'},originalCode:orderCode('completion'),errorLine:6,expectedBehavior:'Request b is the latest request. Its result must win regardless of completion order.',trigger:'Request a completes after request b.',diagnosis:'Completion order and request order are different. A finite logical scheduler exposes which callback is allowed to commit.',observedFailure:'The last completion can overwrite the latest requested value.',trace:[{label:'SCHEDULE',line:2,explanation:'Order two jobs by logical completion tick.'},{label:'COMMIT',line:6,explanation:'Allow only the latest request to update state.'}],assertions:[{id:'late-old',label:'Older request arrives last',input:{a:4,b:1},expected:{value:'b'}},{id:'late-new',label:'Latest request arrives last',input:{a:1,b:4},expected:{value:'b'}}],patches:[{id:'a',label:'A · first completion',program:{op:'async-order',mode:'first'},code:orderCode('first'),explanation:'The first response is not necessarily the most recent request.'},{id:'b',label:'B · latest request',program:{op:'async-order',mode:'latest'},code:orderCode('latest'),explanation:'Only request b may commit, independently of its logical completion tick.'}]};
const entry=(id:string,mechanism:string,dimensions:[string,string],base=caseById(id)):StudyCase=>({id,mechanism,dimensions,base});
export const studyCatalog:StudyCase[]=[
  entry('null-user-id','Receiver access, nullish guards and falsy values',['id value','receiver state']),
  entry('array-boundary','Exclusive bounds and absent array elements',['index','array length'],arrayCase),
  entry('negative-factorial','Recursive descent, stack depth and domain rejection',['argument n','factorial call']),
  entry('zero-default','Missing values versus valid falsy configuration',['explicit value','fallback']),
  entry('mutation-leak','State identity, aliasing and accumulated updates',['updates','initial count']),
  entry('async-order','Deterministic callback scheduling and stale writes',['a completes at tick','b completes at tick'],orderCase),
  entry('negative-length','Integer normalization and validation boundaries',['requested capacity','allocation rule']),
  entry('discount-regression','Eligibility branches and a patch-induced regression',['price','eligibility']),
  entry('numeric-sort','Comparator decisions and in-place model writes',['value scale','input ordering']),
  entry('transient-rejection','Finite retries, rejected attempts and exhaustion',['failed attempts','attempt budget']),
  entry('rejected-request','Promise settlement, catch branches and fallback values',['settled value','reject branch']),
];
export const studyCase=(id?:string)=>studyCatalog.find(item=>item.id===id)||studyCatalog[0];
export const defaultParameters:StudyParameters={extent:1,depthLimit:16,contractKnown:true};

export function conditionSpace(study:StudyCase,parameters:StudyParameters):ConditionInput[] {
  const cells:ConditionInput[]=[];const scale=Math.max(1,Math.min(3,parameters.extent));
  const add=(row:string,column:string,input:Value)=>cells.push({id:'c'+cells.length,row,column,input});
  switch(study.base.program.op) {
    case 'property': {
      const values:[string,Value][]=[['0',0],['1 × range',scale],['null',null],['undefined',UNDEFINED],['""',''],['false',false]];
      for(const shape of ['object','null','undefined','missing id'])for(const[label,value]of values)add(shape,label,shape==='object'?{id:value}:shape==='null'?null:shape==='undefined'?UNDEFINED:{});
      break;
    }
    case 'array-index':
      for(const length of [0,1,3,5].map(n=>Math.min(12,n*scale)))for(const index of [-1,0,1,3,5,8].map(n=>n*scale))add('length '+length,'index '+index,{values:Array.from({length},(_,i)=>(i+1)*10),index});
      break;
    case 'factorial':
      for(const n of [-3*scale,-scale,0,1,2*scale,4*scale,6*scale,12*scale])add('fact(n)','n = '+n,n);break;
    case 'default':
      for(const fallback of [10*scale,true,'cached'])for(const value of [null,UNDEFINED,0,false,'',42*scale])add('fallback '+JSON.stringify(fallback),isUndefined(value)?'undefined':JSON.stringify(value),[value,fallback]);break;
    case 'state':
      for(const count of [0,1,4].map(n=>n*scale))for(const updates of [0,1,2,3,5])add('count '+count,'+'+updates,{count,updates:updates*scale});break;
    case 'async-order':
      for(const b of [0,2,4].map(n=>n*scale))for(const a of [0,1,3,5].map(n=>n*scale))add('b tick '+b,'a tick '+a,{a,b});break;
    case 'array-length':
      for(const n of [-2,-1,0,1.5,2.8,4,101,110].map(n=>n*scale))add('capacity','n = '+n,n);break;
    case 'discount':
      for(const eligible of [false,true])for(const price of [0,1,20,100].map(n=>n*scale))add(eligible?'eligible':'ineligible','price '+price,[price,eligible]);break;
    case 'sort':
      for(const [name,values]of [['mixed',[2,10,1]],['negative',[-2,-10,0]],['repeated',[2,1,2]],['reversed',[10,2,1]]] as [string,number[]][])for(const n of [1,2,4].map(n=>n*scale))add(name,'×'+n,values.map(value=>value*n));break;
    case 'retry':
      for(const budget of [1,2,3,4])for(const failures of [0,1,2,3,4,5].map(n=>Math.min(8,n+scale-1)))add('budget '+budget,failures+' rejects',{budget,failures,value:'ok'});break;
    case 'async':
      for(const reject of [false,true])for(const value of [0,false,'',42*scale])add(reject?'rejected':'fulfilled',JSON.stringify(value),{reject,value,fallback:'cached'});break;
  }
  if(parameters.custom!==undefined)cells.push({id:'custom',row:'custom input',column:'edited',input:parameters.custom});
  return cells;
}

// Independent behavioral specifications; no candidate chooses its own expected result.
export function expectedOutcome(study:StudyCase,input:Value,known=true):Outcome|undefined {
  if(!known)return undefined;
  const data=input as Record<string,Value>;const values=input as Value[];
  switch(study.base.program.op) {
    case 'property': {const id=nullish(input)?UNDEFINED:data.id??(data.id===null?null:UNDEFINED);return{value:nullish(id)?null:id};}
    case 'array-index': {const array=data.values as Value[];const index=Number(data.index);return{value:Number.isInteger(index)&&index>=0&&index<array.length?array[index]:null};}
    case 'factorial': {const n=Number(input);if(!Number.isInteger(n)||n<0||n>12)return{error:'RangeError'};let answer=1;for(let i=2;i<=n;i++)answer*=i;return{value:answer};}
    case 'default':return{value:nullish(values[0])?values[1]:values[0]};
    case 'state':return{value:{count:Number(data.count)+Number(data.updates),originalCount:data.count,distinct:true}};
    case 'async-order':return{value:'b'};
    case 'array-length':return{value:Math.min(100,Math.max(0,Math.trunc(Number(input))))};
    case 'discount':return{value:Number(values[0])*(values[1]?0.9:1)};
    case 'sort':return{value:[...values].sort((a,b)=>Number(a)-Number(b))};
    case 'retry':return Number(data.failures)<Number(data.budget)?{value:data.value}:{error:'AsyncRejection'};
    case 'async':return{value:data.reject?data.fallback:data.value};
  }
}
export function inputIssue(study:StudyCase,input:Value):string {
  if(!isModeledValue(input))return'Use a finite JSON value within the model size limit.';
  const data=input as Record<string,Value>;const values=input as Value[];
  const finite=(value:Value|undefined)=>typeof value==='number'&&Number.isFinite(value)&&Math.abs(value)<=1000;
  const record=typeof input==='object'&&input!==null&&!Array.isArray(input)&&!isUndefined(input);
  switch(study.base.program.op) {
    case 'property':return'';
    case 'factorial':case 'array-length':return finite(input)?'':'Use a finite number with absolute value ≤ 1000.';
    case 'array-index':return record&&Array.isArray(data.values)&&data.values.length<=16&&finite(data.index)?'':'Use {"values":[10,20],"index":0}; at most 16 values.';
    case 'default':return Array.isArray(input)&&input.length===2?'':'Use [explicitValue, fallback].';
    case 'state':return record&&finite(data.count)&&finite(data.updates)&&Number(data.updates)>=0&&Number(data.updates)<=16?'':'Use {"count":0,"updates":2}; updates must be 0–16.';
    case 'async-order':return record&&finite(data.a)&&finite(data.b)&&Number(data.a)>=0&&Number(data.b)>=0?'':'Use nonnegative logical ticks: {"a":4,"b":1}.';
    case 'discount':return Array.isArray(input)&&input.length===2&&finite(values[0])&&typeof values[1]==='boolean'?'':'Use [price, eligibleBoolean].';
    case 'sort':return Array.isArray(input)&&input.length<=8&&input.every(finite)?'':'Use an array of at most eight finite numbers.';
    case 'retry':return record&&finite(data.failures)&&Number.isInteger(data.failures)&&Number(data.failures)>=0&&Number(data.failures)<=8&&finite(data.budget)&&Number.isInteger(data.budget)&&Number(data.budget)>=1&&Number(data.budget)<=8&&data.value!==undefined?'':'Use {"failures":2,"budget":3,"value":"ok"}; counts must be integers within 0–8 and budget ≥ 1.';
    case 'async':return record&&typeof data.reject==='boolean'&&data.value!==undefined&&data.fallback!==undefined?'':'Use {"reject":true,"value":"fresh","fallback":"cached"}.';
  }
  return 'Unsupported input.';
}
export function variants(study:StudyCase):{id:string;label:string;program:Program;code:string}[]{return[{id:'original',label:'Original',program:study.base.program,code:study.base.originalCode},...study.base.patches.map(patch=>({id:patch.id,label:patch.label,program:patch.program,code:patch.code}))];}

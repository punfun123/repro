import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { studyCatalog,studyCase,conditionSpace,defaultParameters,variants,inputIssue } from '../src/research/catalog';
import { computeField,executeStudy,observation,sweepRepresentatives } from '../src/research/computation';
import { executeRule,runRule } from '../src/research/interpreter';
import { sameOutcome } from '../src/research/engine';
import { UNDEFINED,isUndefined } from '../src/research/values';
import { validateStudies } from '../src/research/validate-studies';
import type { Outcome,Value } from '../src/research/types';

test('all eleven public models keep streamed assertions, heatmap and matrix results identical',()=>{
  const result=validateStudies();assert.deepEqual(result.issues,[]);assert.equal(result.models,11);
  assert.ok(result.conditions>400);assert.equal(result.assertions,result.conditions*3);assert.ok(result.events>result.assertions*4);
});
test('parameter changes recompute actual inputs and unknown contracts cannot produce a pass',()=>{
  for(const study of studyCatalog){
    assert.notDeepEqual(conditionSpace(study,defaultParameters),conditionSpace(study,{...defaultParameters,extent:3}),study.id);
    const cells=computeField(study,{...defaultParameters,contractKnown:false});
    assert.ok(cells.every(cell=>Object.values(cell.results).every(result=>result.state==='UNKNOWN'&&result.passed===null)));
  }
});
test('null, undefined, missing id and valid falsy ids remain different outcomes',()=>{
  const cells=computeField(studyCase('null-user-id'),defaultParameters);
  for(const row of ['null','undefined']){const cell=cells.find(cell=>cell.row===row)!;assert.equal(cell.results.original.state,'EXCEPTION');assert.equal(cell.results.b.passed,true);}
  for(const column of ['0','""','false']){const cell=cells.find(cell=>cell.row==='object'&&cell.column===column)!;assert.equal(cell.results.original.passed,true);assert.equal(cell.results.a.passed,false);assert.equal(cell.results.b.passed,true);}
  assert.equal(cells.find(cell=>cell.row==='missing id')!.results.original.state,'FAIL');
});
test('array boundaries preserve a real null element but reject negative and fractional indexes',()=>{
  const study=studyCase('array-boundary');const bounded=variants(study)[2];
  for(const index of [-1,.5,2])assert.deepEqual(runRule(bounded.program,{values:[10,null],index}),{value:null});
  assert.deepEqual(runRule(bounded.program,{values:[10,null],index:1}),{value:null});
  const cell=computeField(study,{...defaultParameters,custom:{values:[10],index:-1}}).at(-1)!;
  assert.equal(cell.results.a.passed,false);assert.ok(isUndefined(cell.results.a.outcome.value));assert.equal(cell.results.b.passed,true);
});
test('variable snapshots record real alias identity and do not mutate after later writes',()=>{
  const events=[...executeRule({op:'state',mode:'mutate'},{count:0,updates:3})];
  const before=events.find(event=>event.note==='Alias next to original')!;
  const after=events.find(event=>event.note==='Mutate through the shared reference')!;
  assert.equal(before.variables.find(item=>item.name==='next')!.alias,'original');
  assert.deepEqual(before.variables.find(item=>item.name==='original')!.value,{count:0});
  assert.deepEqual(after.variables.find(item=>item.name==='original')!.value,{count:3});
  assert.equal([...executeRule({op:'state',mode:'immutable'},{count:0,updates:3})].some(event=>event.variables.some(value=>value.alias)),false);
});
test('recursive depth is computed and a model coverage limit never certifies a candidate',()=>{
  const program={op:'factorial',mode:'zero'} as const;
  const shallow=[...executeRule(program,4,{depthLimit:16})];const deeper=[...executeRule(program,6,{depthLimit:16})];
  assert.ok(Math.max(...deeper.map(event=>event.depth))>Math.max(...shallow.map(event=>event.depth)));
  assert.equal(observation(runRule(program,12,{depthLimit:8}),{value:479001600}).state,'UNKNOWN');
  assert.deepEqual(runRule({op:'factorial',mode:'validated'},-1),{error:'RangeError'});
  assert.deepEqual(runRule({op:'factorial',mode:'nonpositive'},-1),{value:1});
});
test('logical callback order and latest-request acceptance are determined by input ticks',()=>{
  const program={op:'async-order',mode:'completion'} as const;
  const first=[...executeRule(program,{a:4,b:1})].filter(event=>event.kind==='ENTRY'&&event.depth===1).map(event=>event.context);
  assert.deepEqual(first,['complete:b','complete:a']);assert.deepEqual(runRule(program,{a:4,b:1}),{value:'a'});
  assert.deepEqual(runRule(program,{a:1,b:4}),{value:'b'});
  assert.deepEqual(runRule({op:'async-order',mode:'latest'},{a:4,b:1}),{value:'b'});
  assert.deepEqual(runRule({op:'async-order',mode:'first'},{a:1,b:4}),{value:'a'});
});
test('manual iterator advancement and replay are deterministic without mutating the case or field',()=>{
  const study=studyCase('negative-factorial');const cells=computeField(study,defaultParameters);const before=JSON.stringify({study,cells});
  const iterator=executeStudy(study,defaultParameters,cells,'focused','c0','original');
  assert.equal(iterator.next().value!.sequence,0);assert.equal(iterator.next().value!.sequence,1);
  const replay=()=>[...executeStudy(study,defaultParameters,cells,'sweep','c0','original')];
  assert.deepEqual(replay(),replay());assert.equal(JSON.stringify({study,cells}),before);
  assert.ok(sweepRepresentatives(computeField(studyCase('null-user-id'),defaultParameters)).length<24);
});
test('source annotations distinguish guard returns, successful async returns and catch statements',()=>{
  function events(id:string,input:Value,version='original'){
    const study=studyCase(id);const parameters={...defaultParameters,custom:input};return[...executeStudy(study,parameters,computeField(study,parameters),'focused','custom',version)];
  }
  assert.equal(events('array-boundary',{values:[10],index:2}).find(event=>event.kind==='RETURN')!.line,4);
  assert.equal(events('array-boundary',{values:[10],index:0}).find(event=>event.kind==='ACCESS')!.line,5);
  assert.equal(events('rejected-request',{reject:false,value:1,fallback:0}).find(event=>event.kind==='RETURN')!.line,4);
  assert.equal(events('rejected-request',{reject:true,value:1,fallback:0},'b').find(event=>event.kind==='RETURN')!.line,6);
  assert.equal(events('negative-factorial',-1,'b').find(event=>event.kind==='EXCEPTION')!.line,2);
});
test('custom inputs are bounded, expected rejections pass and missing coverage stays unknown',()=>{
  assert.ok(inputIssue(studyCase('array-boundary'),{values:[],index:'x'}));
  assert.ok(inputIssue(studyCase('numeric-sort'),Array(20).fill(0)));
  assert.ok(inputIssue(studyCase('negative-factorial'),Infinity));
  assert.equal(observation({error:'RangeError'},{error:'RangeError'}).passed,true);
  assert.equal(observation({value:1}).passed,null);assert.equal(observation({error:'MODEL_EVENT_LIMIT'},{error:'MODEL_EVENT_LIMIT'}).passed,null);
});
test('every public field matches its trusted JavaScript source within the stated model domain',async()=>{
  // Development parity only. The deployed UI never evaluates a source snippet.
  function decode(value:Value):unknown {if(isUndefined(value))return undefined;if(Array.isArray(value))return value.map(decode);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,decode(child)]));return value;}
  async function actual(code:string,input:Value):Promise<Outcome>{
    const context=vm.createContext({module:{exports:null},input:decode(input)});
    try{new vm.Script(code).runInContext(context,{timeout:100});const value=await new vm.Script('module.exports(input)').runInContext(context,{timeout:100});return{value:value===undefined?UNDEFINED:JSON.parse(JSON.stringify(value))};}
    catch(cause){const error=cause as Error;return{error:/call stack/i.test(error.message)?'RecursiveOverflow':error.message==='AsyncRejection'?'AsyncRejection':error.name};}
  }
  for(const study of studyCatalog)for(const cell of sweepRepresentatives(computeField(study,defaultParameters)))for(const variant of variants(study)){
    const modeled=runRule(variant.program,cell.input);if(modeled.error?.startsWith('MODEL_'))continue;
    assert.ok(sameOutcome(modeled,await actual(variant.code,cell.input)),study.id+'/'+cell.id+'/'+variant.id);
  }
});

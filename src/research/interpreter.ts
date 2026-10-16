import type { Outcome, Program, Value } from './types';
import { isModeledValue, isUndefined, nullish, truthy, UNDEFINED } from './values';
export type EventKind = 'ENTRY' | 'EXIT' | 'READ' | 'WRITE' | 'CONDITION' | 'ACCESS' | 'EXCEPTION' | 'RETURN' | 'ASSERTION' | 'SCHEDULE';
export type VariableState = { name: string; value: Value; type: string; alias?: string };
export type ExecutionEvent = { kind: EventKind; line: number; depth: number; context: string; note: string; variables: VariableState[]; value?: Value; variant?: string; passed?: boolean | null };
export type RuleOptions = { capture?: boolean; depthLimit?: number };
const object = (value: Value) => value as Record<string, Value>;
const array = (value: Value) => value as Value[];

// The generator IS the evaluator. Each next() executes only until the next event.
// Grid evaluation drains this same generator; no chart has its own rule semantics.
export function* executeRule(program: Program, input: Value, options: RuleOptions = {}): Generator<ExecutionEvent, Outcome> {
  const capture = options.capture !== false;
  const depthLimit = Math.max(4, Math.min(24, options.depthLimit ?? 16));
  function event(kind: EventKind, line: number, note: string, vars: Record<string, Value> = {}, depth = 0, context = 'run'): ExecutionEvent {
    const seen = new Map<object, string>();
    const variables: VariableState[] = capture ? Object.entries(vars).map(([name, value]) => {
      const alias = value && typeof value === 'object' && !isUndefined(value) ? seen.get(value) : undefined;
      if (value && typeof value === 'object' && !isUndefined(value) && !alias) seen.set(value, name);
      return { name, value: structuredClone(value), type: isUndefined(value) ? 'undefined' : value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value, ...(alias ? { alias } : {}) };
    }) : [];
    return { kind, line, depth, context, note, variables };
  }
  function* finish(value: Value, vars: Record<string, Value> = {}, line = 2): Generator<ExecutionEvent, Outcome> {
    yield { ...event('RETURN', line, 'Return the computed value', { ...vars, result: value }), value };
    yield event('EXIT', line, 'Return to caller', { result: value });
    return { value };
  }
  function* fail(error: string, vars: Record<string, Value> = {}, line = 2): Generator<ExecutionEvent, Outcome> {
    yield { ...event('EXCEPTION', line, error, vars), value: error };
    yield event('EXIT', line, 'Exceptional exit', vars);
    return { error };
  }
  yield event('ENTRY', 1, 'Enter the fixed rule function', { input });
  if (!isModeledValue(input)) return yield* fail('MODEL_DOMAIN_LIMIT');
  switch (program.op) {
    case 'property': {
      let receiver = input;
      for (const key of program.path) {
        yield event('READ', 2, 'Read the current receiver', { receiver, key });
        const absent = nullish(receiver);
        yield event('CONDITION', 2, 'Is the receiver nullish?', { receiver, key, absent });
        if (absent) return yield* (program.guard === 'none' ? fail('TypeError', { receiver, key }) : finish(program.fallback, { receiver, key }));
        yield event('ACCESS', 2, 'Read property ' + key, { receiver, key });
        receiver = object(receiver)[key] ?? (object(receiver)[key] === null ? null : UNDEFINED);
        yield event('WRITE', 2, 'Bind the accessed value', { receiver, key });
      }
      yield event('CONDITION', 2, 'Apply the declared fallback rule', { receiver, guard: program.guard, truthy: truthy(receiver), nullish: nullish(receiver) });
      const value = program.guard === 'truthy' ? truthy(receiver) ? receiver : program.fallback : program.guard === 'nullish' && nullish(receiver) ? program.fallback : receiver;
      return yield* finish(value, { receiver });
    }
    case 'binding': {
      yield event('READ', 2, 'Resolve the binding', { input, binding: program.mode === 'defined' ? input : UNDEFINED });
      if (program.mode === 'missing') return yield* fail('ReferenceError', { input });
      return yield* finish(program.mode === 'typeof' ? 'undefined' : input, { input });
    }
    case 'syntax':
      yield event('CONDITION', 2, 'Validate the fixed source form', { valid: program.valid });
      if (!program.valid) return yield* fail('SyntaxError', { input });
      return yield* finish(Number(input) + (program.mode === 'increment' ? 1 : Number(input)), { input });
    case 'array-length': {
      const length = Number(input);
      yield event('READ', 2, 'Read requested length', { length });
      const valid = Number.isInteger(length) && length >= 0 && length <= 100;
      yield event('CONDITION', 2, 'Test integer and range constraints', { length, valid });
      if (program.mode === 'reject' && !valid) return yield* fail('RangeError', { length });
      if (program.mode === 'clamp') {
        const bounded = Math.min(100, Math.max(0, Math.trunc(length)));
        yield event('WRITE', 2, 'Normalize the finite capacity', { length, bounded });
        return yield* finish(bounded, { length, bounded });
      }
      return yield* (Number.isInteger(length) && length >= 0 && length < 4294967296 ? finish(length, { length }) : fail('RangeError', { length }));
    }
    case 'array-index': {
      const { values, index } = object(input); const items = array(values); const at = Number(index);
      yield event('READ', 2, 'Read array length and requested index', { values, index, length: items.length });
      const permitted = program.mode === 'inclusive' ? at <= items.length : program.mode === 'upper' ? at < items.length : Number.isInteger(at) && at >= 0 && at < items.length;
      yield event('CONDITION', 3, 'Evaluate the index guard', { index, length: items.length, permitted });
      if (!permitted) return yield* finish(null, { index, permitted }, 3);
      yield event('ACCESS', 5, 'Read the indexed element', { values, index });
      return yield* finish(items[at] === undefined ? UNDEFINED : items[at], { index }, 5);
    }
    case 'async': {
      const data = object(input);
      yield event('SCHEDULE', 3, 'Model a settled promise; no request is issued', { reject: data.reject, value: data.value });
      yield event('CONDITION', 3, 'Did the modeled promise reject?', { reject: data.reject });
      if (!data.reject) return yield* finish(data.value, { input }, 4);
      yield event('EXCEPTION', 3, 'AsyncRejection enters the catch branch', { reason: 'AsyncRejection', fallback: data.fallback });
      if (program.mode === 'propagate') return yield* fail('AsyncRejection', { input }, 6);
      return yield* finish(program.mode === 'swallow' ? null : data.fallback, { fallback: data.fallback }, 6);
    }
    case 'async-order': {
      const data = object(input);
      const jobs = [{ id: 'a', tick: Number(data.a) }, { id: 'b', tick: Number(data.b) }].sort((a,b)=>a.tick-b.tick||a.id.localeCompare(b.id));
      let state: Value = null; let settled = false;
      yield event('SCHEDULE', 2, 'Schedule two requests in logical ticks', { jobs: jobs as unknown as Value, latest: 'b' });
      for (const job of jobs) {
        yield event('ENTRY', 4, 'Completion callback ' + job.id, { job: job as unknown as Value, state }, 1, 'complete:' + job.id);
        const accepted = program.mode === 'latest' ? job.id === 'b' : program.mode === 'first' ? !settled : true;
        yield event('CONDITION', 5, 'May this completion update state?', { request: job.id, latest: 'b', accepted, state }, 1, 'complete:' + job.id);
        if (accepted) { state = job.id; settled = true; yield event('WRITE', 6, 'Commit the accepted response', { state, settled, request: job.id }, 1, 'complete:' + job.id); }
        yield event('EXIT', 7, 'Leave completion callback', { state }, 1, 'complete:' + job.id);
      }
      return yield* finish(state, { state, latest: 'b' }, 9);
    }
    case 'factorial': {
      const number = Number(input);
      const mode = program.mode;
      yield event('CONDITION', 2, 'Check the declared factorial domain', { n: number, valid: Number.isInteger(number) && number >= 0 && number <= 12 });
      if (program.mode === 'validated' && (!Number.isInteger(number) || number < 0 || number > 12)) return yield* fail('RangeError', { n: number });
      if (Math.abs(number) > 12) return yield* fail('MODEL_DOMAIN_LIMIT', { n: number });
      function* fact(n: number, depth: number): Generator<ExecutionEvent, Outcome> {
        yield event('ENTRY', 2, 'Call fact(' + n + ')', { n }, depth, 'fact');
        if (depth >= depthLimit) {
          const error = number < 0 || !Number.isInteger(number) ? 'RecursiveOverflow' : 'MODEL_DOMAIN_LIMIT';
          yield event('EXCEPTION', 4, 'Bounded recursion limit reached', { n, depth, depthLimit }, depth, 'fact');
          return { error };
        }
        const stop = mode === 'nonpositive' ? n <= 0 : n === 0;
        yield event('CONDITION', 3, 'Evaluate the base case', { n, stop }, depth, 'fact');
        if (stop) { yield event('RETURN', 3, 'Base case returns one', { n, result: 1 }, depth, 'fact'); return { value: 1 }; }
        yield event('READ', 4, 'Compute the next recursive argument', { n, next: n - 1 }, depth, 'fact');
        const child = yield* fact(n - 1, depth + 1);
        if (child.error) { yield event('EXIT', 4, 'Propagate child failure', { n, error: child.error }, depth, 'fact'); return child; }
        const product = n * Number(child.value);
        yield event('WRITE', 4, 'Multiply the returned child value', { n, child: child.value!, product }, depth, 'fact');
        yield event('EXIT', 4, 'Return recursive product', { result: product }, depth, 'fact');
        return { value: product };
      }
      const answer = yield* fact(number, 1);
      return yield* (answer.error ? fail(answer.error, { n: number }, 4) : finish(answer.value!, { n: number }, 6));
    }
    case 'discount': {
      const [price, eligible] = array(input);
      yield event('READ', 2, 'Read price and eligibility', { price, eligible });
      const multiplier = program.mode === 'add' ? eligible ? 1.1 : 1 : program.mode === 'all' || eligible ? 0.9 : 1;
      yield event('CONDITION', 3, 'Select the price multiplier', { eligible, multiplier });
      const total = Number(price) * multiplier;
      yield event('WRITE', 3, 'Compute the resulting total', { price, multiplier, total });
      return yield* finish(total, { total }, 3);
    }
    case 'sort': {
      const values = [...array(input)] as number[];
      yield event('WRITE', 2, 'Copy the input array', { input, values });
      // Stable insertion sorting exposes the comparator instead of relying on engine-dependent sort callbacks.
      const compare = (a:number,b:number) => program.mode === 'lexical' ? String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0 : program.mode === 'numeric' ? a-b : b-a;
      for(let i=1;i<values.length;i++) {
        const key=values[i];let j=i-1;
        while(j>=0) {
          const move=compare(values[j],key)>0;
          yield event('CONDITION', 2, 'Compare adjacent values', { values:[...values], left:values[j], right:key, move });
          if(!move)break; values[j+1]=values[j];j--;
          yield event('WRITE', 2, 'Shift the larger element', { values:[...values], nextIndex:j+1 });
        }
        values[j+1]=key;
        yield event('WRITE', 2, 'Insert the compared value', { values:[...values] });
      }
      return yield* finish(values, { values });
    }
    case 'state': {
      const data=object(input); const original={count:Number(data.count)}; let next:{count:number};
      yield event('WRITE', 2, 'Create the original modeled object', { input, original });
      if(program.mode==='mutate')next=original;else next={count:original.count+(program.mode==='stale'?1:Number(data.updates))};
      yield event('WRITE', 3, program.mode==='mutate'?'Alias next to original':'Create a distinct next object', { original, next });
      if(program.mode==='mutate'){next.count+=Number(data.updates);yield event('WRITE',4,'Mutate through the shared reference',{original,next});}
      const value={count:next.count,originalCount:original.count,distinct:next!==original};
      return yield* finish(value,{original,next},5);
    }
    case 'default': {
      const [value,fallback]=array(input);
      yield event('READ',2,'Read explicit value and fallback',{value,fallback});
      const useFallback=program.mode==='always'||(program.mode==='or'?!truthy(value):nullish(value));
      yield event('CONDITION',2,'Does this value require the fallback?',{value,fallback,useFallback});
      return yield* finish(useFallback?fallback:value,{value,fallback,useFallback});
    }
    case 'retry': {
      const data=object(input);const budget=program.mode==='none'?1:program.mode==='once'?2:Number(data.budget);
      if(!Number.isInteger(budget)||budget<1||budget>8)return yield* fail('MODEL_DOMAIN_LIMIT',{budget});
      yield event('WRITE',2,'Set a finite attempt budget',{budget,failures:data.failures});
      for(let attempt=0;attempt<budget;attempt++) {
        const accepted=attempt>=Number(data.failures);
        yield event('ENTRY',3,'Enter attempt '+(attempt+1),{attempt:attempt+1,budget},1,'attempt');
        yield event('CONDITION',4,'Does this attempt succeed?',{attempt:attempt+1,accepted},1,'attempt');
        if(accepted){yield event('EXIT',4,'Leave successful attempt',{attempt:attempt+1,budget},1,'attempt');return yield* finish(data.value,{attempt:attempt+1,budget},4);}
        yield event('EXCEPTION',4,'Modeled rejection; inspect remaining budget',{attempt:attempt+1,remaining:budget-attempt-1},1,'attempt');
        yield event('EXIT',5,'Leave rejected attempt',{attempt:attempt+1},1,'attempt');
      }
      return yield* fail('AsyncRejection',{budget},6);
    }
  }
}

export function runRule(program: Program, input: Value, options: RuleOptions = {}): Outcome {
  const iterator=executeRule(program,input,{...options,capture:false});
  for(let count=0;count<1200;count++){const next=iterator.next();if(next.done)return next.value;}
  return {error:'MODEL_EVENT_LIMIT'};
}

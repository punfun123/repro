import type { Assertion, ExperimentCase, Outcome, PatchCandidate, Program, Value } from './types';

const fn = (body: string) => 'module.exports = function run(input) {\n' + body + '\n};';
const asyncFn = (body: string) => 'module.exports = async function run(input) {\n' + body + '\n};';
const value = (value: Value): Outcome => ({ value });
const error = (error: string): Outcome => ({ error });
const test = (id: string, input: Value, expected: Outcome | undefined, label: string): Assertion => ({ id, input, expected, label });
const patch = (id: string, label: string, program: Program, code: string, explanation: string): PatchCandidate => ({ id, label, program, code, explanation });
type Spec = Pick<ExperimentCase, 'id' | 'title' | 'bugType' | 'program' | 'originalCode' | 'expectedBehavior' | 'trigger' | 'diagnosis' | 'observedFailure' | 'assertions' | 'patches'> & Partial<Pick<ExperimentCase, 'errorLine' | 'defaultCandidate' | 'contract' | 'trace' | 'limitation'>>;
function define(spec: Spec): ExperimentCase {
  const errorLine = spec.errorLine ?? 2;
  return {
    language: 'JavaScript', sourceType: 'SIMULATED', filename: spec.id + '.cjs',
    reproductionSteps: ['Load the listed input fixtures.', 'Apply the original operation model.', 'Compare each outcome with the declared contract.'],
    stack: [spec.bugType + ': ' + spec.observedFailure, '  at run (' + spec.id + '.cjs:' + errorLine + ':3)', '  at model.assertion (simulation, not a runtime stack)'],
    trace: [{ label: 'CALL', line: 1, explanation: 'The fixture enters run(input). Inputs are fixed and replayable.' }, { label: 'BOUNDARY', line: errorLine, explanation: spec.trigger }],
    contract: 'DEFINED', defaultCandidate: 'b', errorLine,
    limitation: 'Curated, bounded operation semantics. This model does not execute the displayed JavaScript or establish production correctness.',
    ...spec,
  };
}
const property = (path: string[], guard: 'none' | 'truthy' | 'nullish' = 'none'): Program => ({ op: 'property', path, guard, fallback: null });
const binding = (mode: 'missing' | 'defined' | 'typeof'): Program => ({ op: 'binding', mode });
const syntax = (valid: boolean, mode: 'double' | 'increment'): Program => ({ op: 'syntax', valid, mode });
const length = (mode: 'raw' | 'clamp' | 'reject'): Program => ({ op: 'array-length', mode });
const asynchronous = (mode: 'propagate' | 'swallow' | 'recover'): Program => ({ op: 'async', mode });
const factorial = (mode: 'zero' | 'nonpositive' | 'validated'): Program => ({ op: 'factorial', mode });
const discount = (mode: 'add' | 'all' | 'eligible'): Program => ({ op: 'discount', mode });
const sort = (mode: 'lexical' | 'numeric' | 'reverse'): Program => ({ op: 'sort', mode });
const state = (mode: 'stale' | 'mutate' | 'immutable'): Program => ({ op: 'state', mode });
const defaults = (mode: 'or' | 'nullish' | 'always'): Program => ({ op: 'default', mode });
const retry = (mode: 'none' | 'once' | 'bounded'): Program => ({ op: 'retry', mode });
const factorialCode = (mode: string) => fn((mode === 'validated' ? '  if (!Number.isInteger(input) || input < 0 || input > 12) throw new RangeError();\n' : '') + '  function fact(n) {\n    if (n ' + (mode === 'nonpositive' ? '<=' : '===') + ' 0) return 1;\n    return n * fact(n - 1);\n  }\n  return fact(input);');
const stateCode = (mode: string) => fn('  const original = { count: input.count };\n' + (mode === 'mutate' ? '  const next = original;\n  next.count += input.updates;' : '  const next = { count: original.count + ' + (mode === 'stale' ? '1' : 'input.updates') + ' };') + '\n  return { count: next.count, originalCount: original.count, distinct: next !== original };');
const retryCode = (mode: string) => fn('  const budget = ' + (mode === 'none' ? '1' : mode === 'once' ? '2' : 'input.budget') + ';\n  for (let attempt = 0; attempt < budget; attempt++) {\n    if (attempt >= input.failures) return input.value;\n  }\n  throw new Error("AsyncRejection");');
const asyncCode = (mode: string) => asyncFn('  try {\n    if (input.reject) throw new Error("AsyncRejection");\n    return input.value;\n  } catch (error) {\n    ' + (mode === 'propagate' ? 'throw error;' : mode === 'swallow' ? 'return null;' : 'return input.fallback;') + '\n  }');

export const researchCases: ExperimentCase[] = [
  define({
    id: 'null-user-id', title: 'The guard that erased user zero', bugType: 'Null Pointer / TypeError',
    program: property(['id']), originalCode: fn('  return input.id;'),
    expectedBehavior: 'A missing user returns null. Every present id, including 0, is preserved.',
    trigger: 'Read id from a null user.', observedFailure: 'Property access throws for a null receiver.',
    diagnosis: 'A nullish receiver needs a guard. A truthiness guard also erases the valid id 0.',
    assertions: [test('null', null, value(null), 'Missing user'), test('zero', { id: 0 }, value(0), 'Zero is a valid id'), test('normal', { id: 42 }, value(42), 'Existing user')],
    patches: [patch('a', 'A · truthy guard', property(['id'], 'truthy'), fn('  return input && input.id || null;'), 'Removes the exception but turns id 0 into null.'), patch('b', 'B · nullish guard', property(['id'], 'nullish'), fn('  return input?.id ?? null;'), 'Defaults only when the receiver or id is nullish.')],
  }),
  define({
    id: 'null-profile-chain', title: 'A guard at the wrong depth', bugType: 'Null Pointer / TypeError',
    program: property(['profile', 'id']), originalCode: fn('  return input.profile.id;'),
    expectedBehavior: 'Return a profile id; absent profile returns null. Preserve an empty-string id.',
    trigger: 'A present account contains a null profile.', observedFailure: 'The second property read receives null.',
    diagnosis: 'Guarding the outer account is insufficient when the nested profile can be null.',
    assertions: [test('nested', { profile: null }, value(null), 'Null profile'), test('empty', { profile: { id: '' } }, value(''), 'Empty id is preserved'), test('normal', { profile: { id: 'p7' } }, value('p7'), 'Profile present')],
    patches: [patch('a', 'A · truthy fallback', property(['profile', 'id'], 'truthy'), fn('  return input?.profile?.id || null;'), 'The access is guarded, but a valid empty string is replaced.'), patch('b', 'B · guard each read', property(['profile', 'id'], 'nullish'), fn('  return input?.profile?.id ?? null;'), 'Both receivers are guarded, and the nullish fallback preserves empty values.')],
  }),
  define({
    id: 'undefined-profile', title: 'The absent object in a valid account', bugType: 'Undefined Property',
    program: property(['profile', 'id']), originalCode: fn('  const account = input;\n  return account.profile.id;'), errorLine: 3,
    expectedBehavior: 'An account without a profile returns null. A profile with id false remains false.',
    trigger: 'Read a child of the omitted profile property.', observedFailure: 'The intermediate property is undefined.',
    diagnosis: 'The account itself is present. The missing intermediate object causes the exception.',
    assertions: [test('omitted', {}, value(null), 'Profile omitted'), test('false', { profile: { id: false } }, value(false), 'Boolean id preserved'), test('normal', { profile: { id: 'x' } }, value('x'), 'Control profile')],
    trace: [{ label: 'ACCOUNT', line: 2, explanation: 'The account binding exists.' }, { label: 'PROFILE READ', line: 3, explanation: 'An omitted property yields undefined.' }, { label: 'CHILD READ', line: 3, explanation: 'Reading id from undefined throws TypeError.' }],
    patches: [patch('a', 'A · truthy id', property(['profile', 'id'], 'truthy'), fn('  return input?.profile?.id || null;'), 'Hides false behind a fallback.'), patch('b', 'B · optional chain', property(['profile', 'id'], 'nullish'), fn('  return input?.profile?.id ?? null;'), 'Handles the absent intermediate object.')],
  }),
  define({
    id: 'missing-trigger', title: 'A plausible patch without a reproduced failure', bugType: 'Undefined Property',
    program: property(['id']), originalCode: fn('  return input.id;'),
    expectedBehavior: 'The loaded fixture must retain id 42.', trigger: 'The report mentions a missing user, but the only fixture contains one.',
    observedFailure: 'No failure is exposed by the loaded input.', diagnosis: 'A report alone does not reproduce a bug. A boundary fixture is missing.',
    assertions: [test('control', { id: 42 }, value(42), 'Only a present user is specified')],
    patches: [patch('a', 'A · truthy guard', property(['id'], 'truthy'), fn('  return input && input.id || null;'), 'A proposed guard cannot prove the original report.'), patch('b', 'B · nullish guard', property(['id'], 'nullish'), fn('  return input?.id ?? null;'), 'The correct-looking change remains uncertified without reproduction.')],
  }),
  define({
    id: 'undeclared-config', title: 'A typeof check is not the configuration', bugType: 'ReferenceError',
    program: binding('missing'), originalCode: fn('  return missingConfig;'),
    expectedBehavior: 'Return the explicitly supplied configuration object.',
    trigger: 'Resolve a name absent from lexical scope.', observedFailure: 'missingConfig is not defined.',
    diagnosis: 'typeof avoids a ReferenceError but returns a string, not the supplied configuration.',
    assertions: [test('config', { retries: 3 }, value({ retries: 3 }), 'Configuration value'), test('empty', {}, value({}), 'Empty configuration')],
    patches: [patch('a', 'A · typeof escape', binding('typeof'), fn('  return typeof missingConfig;'), 'No exception, but the string undefined violates the return contract.'), patch('b', 'B · explicit input', binding('defined'), fn('  return input;'), 'Uses the explicit function input instead of an undeclared global.')],
  }),
  define({
    id: 'undeclared-total', title: 'A lost local total', bugType: 'ReferenceError',
    program: binding('missing'), originalCode: fn('  const total = input;\n  return totla;'), errorLine: 3,
    expectedBehavior: 'Return the supplied numeric total, including zero.',
    trigger: 'The return statement contains a misspelled binding.', observedFailure: 'totla is not defined.',
    diagnosis: 'The declared value exists; changing exception handling does not repair name resolution.',
    assertions: [test('positive', 12, value(12), 'Positive total'), test('zero', 0, value(0), 'Zero total')],
    patches: [patch('a', 'A · typeof typo', binding('typeof'), fn('  return typeof totla;'), 'Converts an exception into the wrong data type.'), patch('b', 'B · local binding', binding('defined'), fn('  const total = input;\n  return total;'), 'Returns the intended local value.')],
  }),
  define({
    id: 'missing-delimiter', title: 'A parse failure before the first call', bugType: 'SyntaxError',
    program: syntax(false, 'double'), originalCode: 'module.exports = function run(input) {\n  return (input * 2;\n};',
    expectedBehavior: 'Return twice the input.', trigger: 'An opening parenthesis has no matching closing delimiter.',
    observedFailure: 'The module cannot be parsed.', diagnosis: 'A parse-time failure happens before runtime inputs or guards can matter.',
    assertions: [test('two', 2, value(4), 'Double two'), test('negative', -3, value(-6), 'Double negative')],
    trace: [{ label: 'PARSE', line: 2, explanation: 'The unmatched parenthesis rejects the entire module.' }],
    patches: [patch('a', 'A · wrong formula', syntax(true, 'increment'), fn('  return input + 1;'), 'Parses successfully but changes the formula.'), patch('b', 'B · close delimiter', syntax(true, 'double'), fn('  return (input * 2);'), 'Repairs the delimiter while preserving the requested operation.')],
  }),
  define({
    id: 'invalid-assignment', title: 'A literal cannot be an assignment target', bugType: 'SyntaxError',
    program: syntax(false, 'increment'), originalCode: 'module.exports = function run(input) {\n  1 = input;\n  return input + 1;\n};',
    expectedBehavior: 'Return input plus one.', trigger: 'Assign to a numeric literal.', observedFailure: 'Invalid left-hand side in assignment.',
    diagnosis: 'The invalid statement prevents evaluation of the otherwise valid return statement.',
    assertions: [test('zero', 0, value(1), 'Increment zero'), test('three', 3, value(4), 'Increment three')],
    trace: [{ label: 'PARSE TARGET', line: 2, explanation: 'A number literal is not a writable binding.' }],
    patches: [patch('a', 'A · double instead', syntax(true, 'double'), fn('  return input * 2;'), 'Removing the syntax error does not establish the intended arithmetic.'), patch('b', 'B · remove assignment', syntax(true, 'increment'), fn('  return input + 1;'), 'Keeps the intended expression and removes the illegal statement.')],
  }),
  define({
    id: 'negative-length', title: 'Clamping an invalid allocation', bugType: 'RangeError',
    program: length('raw'), originalCode: fn('  return new Array(input).length;'),
    expectedBehavior: 'For this display buffer, clamp lengths to integers in [0, 100].', trigger: 'Request an array length of -2.',
    observedFailure: 'Invalid array length.', diagnosis: 'The contract calls for a bounded display buffer, not a raw allocation.',
    assertions: [test('negative', -2, value(0), 'Clamp negative'), test('fraction', 2.8, value(2), 'Truncate fraction'), test('valid', 4, value(4), 'Preserve valid length')],
    patches: [patch('a', 'A · reject only', length('reject'), fn('  if (!Number.isInteger(input) || input < 0 || input > 100) throw new RangeError();\n  return input;'), 'Explicit validation still violates the chosen clamping contract.'), patch('b', 'B · bounded clamp', length('clamp'), fn('  return Math.min(100, Math.max(0, Math.trunc(input)));'), 'Implements the declared normalization rule.')],
  }),
  define({
    id: 'fractional-length', title: 'Fractional capacity is not an array length', bugType: 'RangeError',
    program: length('raw'), originalCode: fn('  const capacity = input;\n  return new Array(capacity).length;'), errorLine: 3,
    expectedBehavior: 'Normalize requested capacity into an integer from 0 through 100.', trigger: 'A calculated capacity is 3.5.',
    observedFailure: 'Array construction rejects the fractional length.', diagnosis: 'An upstream calculation can be valid arithmetic yet invalid for array allocation.',
    assertions: [test('fraction', 3.5, value(3), 'Fractional capacity'), test('large', 110, value(100), 'Bound maximum'), test('zero', 0, value(0), 'Empty buffer')],
    patches: [patch('a', 'A · reject range', length('reject'), fn('  if (!Number.isInteger(input) || input < 0 || input > 100) throw new RangeError();\n  return input;'), 'Rejects values the display contract says to normalize.'), patch('b', 'B · normalize', length('clamp'), fn('  return Math.min(100, Math.max(0, Math.trunc(input)));'), 'Normalizes the declared finite input domain before allocation.')],
  }),
  define({
    id: 'rejected-request', title: 'Catching a rejection can still lose the result', bugType: 'Async Rejection',
    program: asynchronous('propagate'), originalCode: asyncCode('propagate'),
    expectedBehavior: 'Return the explicit fallback on rejection; preserve successful values.', trigger: 'The fixture chooses the rejected branch.',
    observedFailure: 'A rejection propagates out of the function.', diagnosis: 'A catch block must implement the fallback contract, not just suppress an exception.',
    errorLine: 3, assertions: [test('reject', { reject: true, value: 'live', fallback: 'cached' }, value('cached'), 'Use cached fallback'), test('resolve', { reject: false, value: 'fresh', fallback: 'cached' }, value('fresh'), 'Preserve fulfilled value')],
    trace: [{ label: 'AWAIT MODEL', line: 3, explanation: 'A controlled rejection value takes the error branch; no request is sent.' }, { label: 'PROPAGATE', line: 6, explanation: 'The catch block rethrows the rejection.' }],
    patches: [patch('a', 'A · swallow', asynchronous('swallow'), asyncCode('swallow'), 'Returns null instead of the required cached value.'), patch('b', 'B · recover value', asynchronous('recover'), asyncCode('recover'), 'Returns the explicit fallback and leaves fulfilled results intact.')],
  }),
  define({
    id: 'absent-recovery-contract', title: 'Which fallback is correct?', bugType: 'Async Rejection',
    program: asynchronous('propagate'), originalCode: asyncCode('propagate'), errorLine: 3, contract: 'INCOMPLETE',
    expectedBehavior: 'The report requests graceful recovery but does not specify its value.', trigger: 'A rejection occurs with no accepted fallback requirement.',
    observedFailure: 'A rejection is observed; the correct recovery is unspecified.', diagnosis: 'Observation is possible, but a missing contract cannot certify either null or cached data.',
    assertions: [test('unknown', { reject: true, value: 'fresh', fallback: 'cached' }, undefined, 'Recovery value not specified')],
    patches: [patch('a', 'A · null fallback', asynchronous('swallow'), asyncCode('swallow'), 'Null is one possibility, not an established requirement.'), patch('b', 'B · cached fallback', asynchronous('recover'), asyncCode('recover'), 'Cached data is another possibility. Verification remains skipped.')],
  }),
  define({
    id: 'negative-factorial', title: 'A base case that can never be reached', bugType: 'Recursive Overflow',
    program: factorial('zero'), originalCode: factorialCode('zero'), errorLine: 4,
    expectedBehavior: 'Reject negative inputs with RangeError; compute integer factorials from 0 through 12.',
    trigger: 'Start recursion at -1 and decrement.', observedFailure: 'Negative recursion moves away from zero.',
    diagnosis: 'A nonpositive base case stops the overflow but returns a mathematically unsupported value for negative input.',
    assertions: [test('negative', -1, error('RangeError'), 'Reject a negative integer'), test('four', 4, value(24), 'Factorial four'), test('zero', 0, value(1), 'Factorial zero')],
    trace: [{ label: 'BASE CASE', line: 3, explanation: 'n === 0 is false for a negative input.' }, { label: 'RECURSE', line: 4, explanation: 'The next value is smaller and never reaches zero. The bounded model reports the overflow class.' }],
    patches: [patch('a', 'A · stop at zero', factorial('nonpositive'), factorialCode('nonpositive'), 'Stops recursion, but returns 1 for invalid negative input.'), patch('b', 'B · validate domain', factorial('validated'), factorialCode('validated'), 'Rejects the invalid domain before recursive evaluation.')],
  }),
  define({
    id: 'factorial-wrong-repair', title: 'A stopped overflow is not a valid factorial', bugType: 'Recursive Overflow',
    program: factorial('zero'), originalCode: factorialCode('zero'), errorLine: 4, defaultCandidate: 'a',
    expectedBehavior: 'Negative input must be rejected, never mapped to a factorial value.',
    trigger: 'The input -3 moves downward through recursive calls.', observedFailure: 'The base case is unreachable.',
    diagnosis: 'The selected repair terminates, but fails the invalid-input contract. Select branch B to compare a valid repair.',
    assertions: [test('negative', -3, error('RangeError'), 'Reject negative domain'), test('five', 5, value(120), 'Factorial five')],
    patches: [patch('a', 'A · premature base', factorial('nonpositive'), factorialCode('nonpositive'), 'Returning 1 for every nonpositive number changes the function contract.'), patch('b', 'B · domain guard', factorial('validated'), factorialCode('validated'), 'An explicit guard rejects negative values.')],
  }),
  define({
    id: 'discount-sign', title: 'A discount that increases the price', bugType: 'Logic Error',
    program: discount('add'), originalCode: fn('  const [price, eligible] = input;\n  return price * (eligible ? 1.1 : 1);'), errorLine: 3,
    expectedBehavior: 'Eligible orders receive ten percent off. Other orders retain full price.', trigger: 'Apply the eligible multiplier to price 100.',
    observedFailure: 'The price becomes 110 instead of 90.', diagnosis: 'The arithmetic is valid JavaScript. The business rule is wrong.',
    assertions: [test('eligible', [100, true], value(90), 'Eligible price'), test('normal', [50, false], value(50), 'Ineligible control')],
    patches: [patch('a', 'A · discount all', discount('all'), fn('  return input[0] * 0.9;'), 'Fixes the reported input while discounting ineligible orders.'), patch('b', 'B · eligibility', discount('eligible'), fn('  const [price, eligible] = input;\n  return price * (eligible ? 0.9 : 1);'), 'Preserves eligibility while correcting the multiplier.')],
  }),
  define({
    id: 'discount-regression', title: 'The regression hidden by a successful example', bugType: 'Regression Failure',
    program: discount('add'), originalCode: fn('  return input[0] * (input[1] ? 1.1 : 1);'), defaultCandidate: 'a',
    expectedBehavior: 'Discount eligible orders only, including fractional prices.', trigger: 'A targeted fix is applied to every order.',
    observedFailure: 'Eligible totals increase in the original.', diagnosis: 'Branch A repairs one example while breaking an ineligible control. Both conditions matter.',
    assertions: [test('target', [20, true], value(18), 'Reported order'), test('control', [20, false], value(20), 'Regression control'), test('fraction', [2.5, true], value(2.25), 'Fractional price')],
    patches: [patch('a', 'A · broad discount', discount('all'), fn('  return input[0] * 0.9;'), 'The regression fixture prevents a narrow example from certifying the wrong business rule.'), patch('b', 'B · gated discount', discount('eligible'), fn('  return input[0] * (input[1] ? 0.9 : 1);'), 'Only the eligible path is changed.')],
  }),
  define({
    id: 'numeric-sort', title: 'Ten comes before two', bugType: 'Logic Error',
    program: sort('lexical'), originalCode: fn('  return [...input].sort();'),
    expectedBehavior: 'Return a new array in ascending numeric order.', trigger: 'Sort [2, 10, 1] without a comparator.',
    observedFailure: 'Default lexical ordering yields [1, 10, 2].', diagnosis: 'A default string comparison does not implement a numeric ordering relation.',
    assertions: [test('mixed', [2, 10, 1], value([1, 2, 10]), 'Mixed digit widths'), test('negative', [-2, -10, 0], value([-10, -2, 0]), 'Negative values')],
    patches: [patch('a', 'A · reverse compare', sort('reverse'), fn('  return [...input].sort((a, b) => b - a);'), 'A comparator is present, but the direction is wrong.'), patch('b', 'B · numeric compare', sort('numeric'), fn('  return [...input].sort((a, b) => a - b);'), 'Defines the requested ascending numeric relation.')],
  }),
  define({
    id: 'unknown-order', title: 'Ordering without an ordering rule', bugType: 'Logic Error',
    program: sort('lexical'), originalCode: fn('  return [...input].sort();'), contract: 'INCOMPLETE',
    expectedBehavior: 'The report says the ordering looks wrong but gives no numeric or lexical requirement.',
    trigger: 'The list contains [2, 10, 1].', observedFailure: 'Several possible orders disagree.',
    diagnosis: 'Choosing ascending numeric order would invent a requirement. The result remains unverified.',
    assertions: [test('unspecified', [2, 10, 1], undefined, 'Order contract missing')],
    patches: [patch('a', 'A · descending', sort('reverse'), fn('  return [...input].sort((a, b) => b - a);'), 'Descending order is not justified by the report.'), patch('b', 'B · ascending', sort('numeric'), fn('  return [...input].sort((a, b) => a - b);'), 'Ascending order is plausible but unproven.')],
  }),
  define({
    id: 'stale-counter', title: 'Two updates, one increment', bugType: 'State Mismatch',
    program: state('stale'), originalCode: stateCode('stale'), errorLine: 3,
    expectedBehavior: 'Apply every requested increment to a new state object; preserve the original count.',
    trigger: 'Queue two increments from a snapshot at count 4.', observedFailure: 'Only one increment is reflected.',
    diagnosis: 'The state model must preserve both update accumulation and the immutable original.',
    assertions: [test('two', { count: 4, updates: 2 }, value({ count: 6, originalCount: 4, distinct: true }), 'Accumulate both updates'), test('one', { count: 0, updates: 1 }, value({ count: 1, originalCount: 0, distinct: true }), 'Single increment control')],
    patches: [patch('a', 'A · mutate snapshot', state('mutate'), stateCode('mutate'), 'The count is correct but the original state is corrupted.'), patch('b', 'B · new snapshot', state('immutable'), stateCode('immutable'), 'Computes the accumulated value in a distinct object.')],
  }),
  define({
    id: 'mutation-leak', title: 'The right value in the wrong object', bugType: 'State Mismatch',
    program: state('mutate'), originalCode: stateCode('mutate'), errorLine: 4,
    expectedBehavior: 'Return an updated object and leave the original object unchanged.',
    trigger: 'next and original refer to the same object.', observedFailure: 'The original count changes with the candidate state.',
    diagnosis: 'Value-only assertions would miss an aliasing regression. The contract also checks identity and the original count.',
    assertions: [test('mutated', { count: 7, updates: 3 }, value({ count: 10, originalCount: 7, distinct: true }), 'No mutation leak'), test('zero', { count: 0, updates: 2 }, value({ count: 2, originalCount: 0, distinct: true }), 'Zero starting count')],
    trace: [{ label: 'ALIAS', line: 3, explanation: 'The next binding points at the original object.' }, { label: 'WRITE', line: 4, explanation: 'Writing through either binding mutates the same object.' }],
    patches: [patch('a', 'A · lose updates', state('stale'), stateCode('stale'), 'A fresh object alone does not preserve multiple queued updates.'), patch('b', 'B · immutable copy', state('immutable'), stateCode('immutable'), 'Separates identity and retains all increments.')],
  }),
  define({
    id: 'zero-default', title: 'A zero limit replaced by the fallback', bugType: 'Regression Failure',
    program: defaults('or'), originalCode: fn('  return input[0] || input[1];'),
    expectedBehavior: 'Default only nullish limits. Zero means an intentional zero limit.',
    trigger: 'Use a limit of 0 with a default of 10.', observedFailure: 'The fallback silently replaces zero.',
    diagnosis: 'Boolean disjunction tests truthiness, which is broader than absence.',
    assertions: [test('zero', [0, 10], value(0), 'Preserve zero'), test('null', [null, 10], value(10), 'Default null'), test('normal', [3, 10], value(3), 'Preserve explicit limit')],
    patches: [patch('a', 'A · always fallback', defaults('always'), fn('  return input[1];'), 'Makes all explicit values disappear.'), patch('b', 'B · nullish default', defaults('nullish'), fn('  return input[0] ?? input[1];'), 'Distinguishes a missing value from a valid zero.')],
  }),
  define({
    id: 'false-default', title: 'The disabled flag that enabled itself', bugType: 'Regression Failure',
    program: defaults('or'), originalCode: fn('  const [flag, fallback] = input;\n  return flag || fallback;'), errorLine: 3,
    expectedBehavior: 'Preserve an explicit false flag. Use the default for null.',
    trigger: 'An explicitly disabled flag is paired with a true fallback.', observedFailure: 'The result becomes true.',
    diagnosis: 'A false value can be meaningful application state rather than missing configuration.',
    assertions: [test('false', [false, true], value(false), 'Preserve disabled state'), test('null', [null, true], value(true), 'Default absent flag'), test('true', [true, false], value(true), 'Preserve enabled state')],
    patches: [patch('a', 'A · default always', defaults('always'), fn('  return input[1];'), 'Ignores the user choice.'), patch('b', 'B · nullish flag', defaults('nullish'), fn('  return input[0] ?? input[1];'), 'Preserves explicit booleans.')],
  }),
  define({
    id: 'transient-rejection', title: 'One retry is not the declared retry budget', bugType: 'Async Rejection',
    program: retry('none'), originalCode: retryCode('none'), errorLine: 6,
    expectedBehavior: 'Return the value if a successful attempt occurs within the finite budget; otherwise reject.',
    trigger: 'Two modeled failures precede a successful third attempt.', observedFailure: 'The original gives up after its first attempt.',
    diagnosis: 'A retry policy is a bounded count of attempts, not an arbitrary delay or a promise of recovery.',
    assertions: [test('third', { failures: 2, budget: 3, value: 'ok' }, value('ok'), 'Recover on attempt three'), test('exhausted', { failures: 3, budget: 3, value: 'ok' }, error('AsyncRejection'), 'Respect budget'), test('first', { failures: 0, budget: 3, value: 'ok' }, value('ok'), 'Immediate success')],
    patches: [patch('a', 'A · retry once', retry('once'), retryCode('once'), 'Two total attempts do not satisfy a budget of three.'), patch('b', 'B · bounded attempts', retry('bounded'), retryCode('bounded'), 'Uses the declared finite attempt budget. No actual network calls occur.')],
  }),
  define({
    id: 'retry-exhaustion', title: 'A hard-coded retry introduces another failure', bugType: 'Async Rejection',
    program: retry('none'), originalCode: retryCode('none'), errorLine: 6, defaultCandidate: 'a',
    expectedBehavior: 'Recover within four allowed attempts and reject once that budget is exhausted.',
    trigger: 'A modeled operation needs four attempts.', observedFailure: 'The original rejects before the recovery point.',
    diagnosis: 'The selected fixed retry count fails a larger supported budget. Compare the explicit-budget branch.',
    assertions: [test('fourth', { failures: 3, budget: 4, value: 42 }, value(42), 'Fourth attempt succeeds'), test('exhausted', { failures: 4, budget: 4, value: 42 }, error('AsyncRejection'), 'Exhausted budget rejects')],
    patches: [patch('a', 'A · fixed retry', retry('once'), retryCode('once'), 'Only two attempts are permitted by this candidate.'), patch('b', 'B · explicit budget', retry('bounded'), retryCode('bounded'), 'The budget is part of the contract, not a presentation timer.')],
  }),
];

export const caseById = (id?: string) => researchCases.find(item => item.id === id) || researchCases[0];

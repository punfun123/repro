import { test } from 'node:test';
import assert from 'node:assert/strict';
import { executeGuide, guideCells, guideLabUrl, guideSteps, guideStudy } from '../src/research/guide';
import { resolveCondition } from '../src/research/computation';
import { variants } from '../src/research/catalog';
import { sameOutcome } from '../src/research/engine';

test('the homepage actually executes five runs and preserves the zero-id regression', () => {
  const events = [...executeGuide()];
  const assertions = events.filter(event => event.kind === 'ASSERTION');
  assert.deepEqual(assertions.map(event => event.stepId), guideSteps.map(step => step.id));
  assert.deepEqual(assertions.map(event => event.passed), [false, true, false, true, true]);
  assert.deepEqual(assertions.map(event => event.outcome), [{ error: 'TypeError' }, { value: null }, { value: null }, { value: null }, { value: 0 }]);
  assert.ok(events.some(event => event.kind === 'EXCEPTION'));
  assert.ok(events.length < 40, 'Every event must fit the homepage trace window.');
  for (const event of assertions) {
    const cell = guideCells.find(cell => cell.id === event.cellId)!;
    assert.ok(sameOutcome(event.outcome!, cell.results[event.variantId].outcome));
    assert.equal(event.passed, cell.results[event.variantId].passed);
  }
});

test('guide evaluation advances lazily and replay keeps events and contracts unchanged', () => {
  const before = JSON.stringify({ guideStudy, guideCells, guideSteps });
  const iterator = executeGuide();
  const first = iterator.next(); const second = iterator.next();
  assert.equal(first.value!.kind, 'ENTRY'); assert.equal(first.value!.sequence, 0);
  assert.equal(second.value!.sequence, 1); assert.equal(second.value!.stepId, 'original-null');
  assert.deepEqual([...executeGuide()], [...executeGuide()]);
  assert.equal(JSON.stringify({ guideStudy, guideCells, guideSteps }), before);
});

test('manual inspection executes the selected version with its actual source bindings', () => {
  for (const step of guideSteps) {
    const events = [...executeGuide(step.id)];
    assert.ok(events.every(event => event.stepId === step.id && event.variantId === step.variant && event.cellId === step.cellId));
    const assertion = events.at(-1)!; assert.equal(assertion.kind, 'ASSERTION');
    const source = variants(guideStudy).find(variant => variant.id === step.variant)!;
    assert.ok(events.every(event => event.line >= 0 && event.line <= source.code.split('\n').length));
  }
  const zero = [...executeGuide('a-zero')];
  assert.ok(zero.some(event => event.variables.some(variable => variable.name === 'receiver' && variable.value === 0)));
  assert.deepEqual(zero.at(-1)!.expected, { value: 0 });
  assert.equal(zero.at(-1)!.passed, false);
});

test('Lab links restore the exact authored condition and reject invalid or ephemeral ids', () => {
  for (const step of guideSteps) {
    const url = new URL(guideLabUrl(step.id), 'https://reprolab.fun');
    assert.equal(url.pathname, '/lab'); assert.equal(url.searchParams.get('case'), guideStudy.id);
    assert.equal(url.searchParams.get('candidate'), step.variant);
    assert.equal(resolveCondition(guideCells, url.searchParams.get('condition')!), step.cellId);
  }
  for (const invalid of ['unknown', '../../private', 'custom', '', undefined]) assert.equal(resolveCondition([...guideCells, { id: 'custom' }], invalid), guideCells[0].id);
});

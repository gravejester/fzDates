import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { tokenizeInput, parsePartial } from '../src/index.js';
import { resolveOptions } from '../src/config/options.js';

const options = resolveOptions();

function partialFromInput(input) {
  const tokenization = tokenizeInput(input, options);
  return parsePartial(tokenization.tokens, tokenization.normalization, options);
}

test('parsePartial handles month + year', () => {
  const result = partialFromInput('January 2000');
  assert.ok(result.success);
  assert.is(result.precision, 'month');
  assert.is(result.value.year, 2000);
  assert.is(result.value.month, 1);
  assert.ok(result.issues.includes('missing-day'));
});

test('parsePartial handles day + month', () => {
  const result = partialFromInput('1 October');
  assert.ok(result.success);
  assert.is(result.precision, 'day');
  assert.is(result.value.day, 1);
  assert.is(result.value.month, 10);
  assert.ok(result.issues.includes('missing-year'));
});

test('parsePartial respects qualifiers', () => {
  const result = partialFromInput('ca 1 Oct 1980');
  assert.ok(result.success);
  assert.is(result.precision, 'day');
  assert.ok(result.qualifiers.includes('approximate'));
  assert.is(result.value.year, 1980);
  assert.is(result.value.month, 10);
  assert.is(result.value.day, 1);
});

test.run();

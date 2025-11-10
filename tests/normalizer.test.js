import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { normalizeInput } from '../src/index.js';

test('normalizeInput collapses whitespace and trims edges', () => {
  const normalized = normalizeInput('  foo\t\tbar  ');
  assert.is(normalized.original, '  foo\t\tbar  ');
  assert.is(normalized.normalized, 'foo bar');
  assert.is(normalized.lowered, 'foo bar');
  assert.is(normalized.isEmpty, false);
});

test('normalizeInput converts special punctuation to ASCII equivalents', () => {
  const normalized = normalizeInput('10\u2013Jan\u20241978,  Noon');
  assert.is(normalized.normalized, '10-Jan.1978, Noon');
  assert.is(normalized.lowered, '10-jan.1978, noon');
});

test('normalizeInput strips non-breaking spaces and multiple gaps', () => {
  const normalized = normalizeInput('May\u00a019,\u00a01980   ');
  assert.is(normalized.normalized, 'May 19, 1980');
});

test('normalizeInput handles non-string inputs safely', () => {
  const normalized = normalizeInput(null);
  assert.is(normalized.original, '');
  assert.is(normalized.normalized, '');
  assert.is(normalized.isEmpty, true);
});

test.run();

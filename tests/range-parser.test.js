import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { tokenizeInput, parseRange } from '../src/index.js';
import { resolveOptions, mergeOptions } from '../src/config/options.js';

const options = resolveOptions();

function rangeFromInput(input) {
  const tokenization = tokenizeInput(input, options);
  return parseRange(tokenization.tokens, tokenization.normalization, options);
}

test('parseRange handles bounded between/and', () => {
  const result = rangeFromInput('between 1 jan 1980 and 1 oct 1980');
  assert.ok(result.success);
  assert.is(result.value.start.kind, 'exact');
  assert.is(result.value.start.year, 1980);
  assert.is(result.value.end.month, 10);
  assert.is(result.value.end.day, 1);
  assert.is(result.value.inclusiveStart, true);
  assert.is(result.value.inclusiveEnd, true);
});

test('parseRange handles hyphen year range', () => {
  const result = rangeFromInput('1980-1981');
  assert.ok(result.success);
  assert.is(result.value.start.kind, 'partial');
  assert.is(result.value.start.year, 1980);
  assert.is(result.value.end.year, 1981);
});

test('parseRange open end before', () => {
  const result = rangeFromInput('before 10 jan 1970');
  assert.ok(result.success);
  assert.is(result.value.start, null);
  assert.is(result.value.end.kind, 'exact');
  assert.is(result.value.inclusiveEnd, false);
});

test('parseRange open start after', () => {
  const result = rangeFromInput('after dec 1999');
  assert.ok(result.success);
  assert.is(result.value.start.kind, 'partial');
  assert.is(result.value.end, null);
  assert.is(result.value.inclusiveStart, false);
});

test('parseRange open start since is inclusive', () => {
  const result = rangeFromInput('since jan 1990');
  assert.ok(result.success);
  assert.is(result.value.start.kind, 'partial');
  assert.is(result.value.start.year, 1990);
  assert.is(result.value.inclusiveStart, true);
  assert.is(result.value.end, null);
});

test('parseRange honors custom default inclusivity on hyphen ranges', () => {
  const tokenization = tokenizeInput('1980-1981', options);
  const overrides = mergeOptions(options, {
    ranges: { defaultInclusivity: { start: false, end: false } }
  });
  const result = parseRange(tokenization.tokens, tokenization.normalization, overrides);
  assert.ok(result.success);
  assert.is(result.value.inclusiveStart, false);
  assert.is(result.value.inclusiveEnd, false);
});

test('parseRange reports missing bounds for incomplete between/and', () => {
  const tokenization = tokenizeInput('between 1 jan 1900 and', options);
  const result = parseRange(tokenization.tokens, tokenization.normalization, options);
  assert.is(result.success, true);
  assert.ok(result.issues.includes('range-bound-missing'));
  assert.is(result.value.end, null);
});

test('parseRange supports mixed precision boundaries', () => {
  const tokenization = tokenizeInput('between 1 jan 1900 and 1901', options);
  const result = parseRange(tokenization.tokens, tokenization.normalization, options);
  assert.ok(result.success);
  assert.is(result.value.start.kind, 'exact');
  assert.is(result.value.end.kind, 'partial');
  assert.is(result.value.end.year, 1901);
});

test('parseRange handles qualifier-driven open end', () => {
  const tokenization = tokenizeInput('before circa 1900', options);
  const result = parseRange(tokenization.tokens, tokenization.normalization, options);
  assert.ok(result.success);
  assert.is(result.value.start, null);
  assert.is(result.value.end.kind, 'partial');
  assert.ok(result.value.end.qualifiers.includes('approximate'));
  assert.is(result.value.inclusiveEnd, false);
});

test.run();

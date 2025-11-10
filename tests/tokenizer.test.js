import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { normalizeInput, tokenizeInput, englishLocale, registerLocale } from '../src/index.js';
import { resolveOptions } from '../src/config/options.js';

// Ensure English locale is registered for tests (idempotent)
registerLocale(englishLocale);

const defaultOptions = resolveOptions();

test('normalizeInput trims and standardizes whitespace', () => {
  const normalization = normalizeInput('  21\u00a009.\u20131978  ');
  assert.is(normalization.normalized, '21 09.-1978');
});

test('tokenizeInput identifies months and numbers', () => {
  const { tokens } = tokenizeInput('21 Sep 1978', defaultOptions);
  assert.is(tokens.length, 3);
  const [day, month, year] = tokens;
  assert.is(day.type, 'number');
  assert.is(day.value, 21);
  assert.is(month.type, 'month');
  assert.is(month.value, 9);
  assert.is(year.type, 'number');
  assert.is(year.value, 1978);
});

test('tokenizeInput marks range markers', () => {
  const { tokens } = tokenizeInput('between 1 jan 1900 and 1 feb 1900', defaultOptions);
  const kinds = tokens.map((t) => t.type);
  assert.ok(kinds.includes('range-marker'));
});

test('tokenizeInput handles ordinal suffixes', () => {
  const { tokens } = tokenizeInput('21st January 1900', defaultOptions);
  assert.is(tokens[0].type, 'number');
  assert.is(tokens[0].subtype, 'ordinal');
  assert.is(tokens[0].value, 21);
});

test('tokenizeInput handles repeated punctuation clusters', () => {
  const { tokens } = tokenizeInput('21--03--1978', defaultOptions);
  const types = tokens.map((token) => token.type);
  assert.ok(types.includes('symbol'));
  assert.is(tokens.filter((token) => token.type === 'number').length, 3);
});

test('tokenizeInput retains unsupported words without crashing', () => {
  const { tokens } = tokenizeInput('foo☃bar 1900', defaultOptions);
  assert.is(tokens.at(-1).type, 'number');
  assert.ok(tokens.some((token) => token.type === 'word'));
});

test.run();

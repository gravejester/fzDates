import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { tokenizeInput, classifyTokens, englishLocale, registerLocale } from '../src/index.js';
import { resolveOptions } from '../src/config/options.js';

registerLocale(englishLocale);

const defaultOptions = resolveOptions();

function classify(input) {
  const tokenization = tokenizeInput(input, defaultOptions);
  return classifyTokens(tokenization.tokens, defaultOptions);
}

test('classifies month-day-year as exact', () => {
  const classification = classify('21 Sep 1978');
  assert.is(classification.kind, 'exact');
  assert.is(classification.precisionHint, 'day');
});

test('classifies single year as partial', () => {
  const classification = classify('1900');
  assert.is(classification.kind, 'partial');
  assert.is(classification.precisionHint, 'year');
});

test('classifies hyphenated year range as range', () => {
  const classification = classify('1980-1981');
  assert.is(classification.kind, 'range');
});

test('classifies before qualifier as range', () => {
  const classification = classify('before 1900');
  assert.is(classification.kind, 'range');
});

test('classifies approximate qualifier as partial', () => {
  const classification = classify('ca 1900');
  assert.is(classification.kind, 'partial');
});

test.run();

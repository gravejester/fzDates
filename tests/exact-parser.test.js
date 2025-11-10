import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { tokenizeInput, parseExact } from '../src/index.js';
import { resolveOptions } from '../src/config/options.js';

const options = resolveOptions();

function exactFromInput(input) {
  const tokenization = tokenizeInput(input, options);
  return parseExact(tokenization.tokens, tokenization.normalization, options);
}

test('parseExact handles month-name format', () => {
  const result = exactFromInput('21 Sep 1978');
  assert.is(result.candidates.length, 1);
  const candidate = result.candidates[0];
  assert.is(candidate.year, 1978);
  assert.is(candidate.month, 9);
  assert.is(candidate.day, 21);
  assert.ok(candidate.sortKey);
});

test('parseExact handles ISO numeric order', () => {
  const result = exactFromInput('1978-09-21');
  assert.is(result.candidates.length, 1);
  const candidate = result.candidates[0];
  assert.is(candidate.year, 1978);
  assert.is(candidate.month, 9);
  assert.is(candidate.day, 21);
});

test('parseExact produces ambiguity for slash format', () => {
  const result = exactFromInput('01/02/1900');
  assert.ok(result.candidates.length >= 2);
});

test('parseExact rejects impossible day', () => {
  const result = exactFromInput('31 Feb 1900');
  assert.is(result.candidates.length, 0);
  assert.ok(result.issues.includes('exact-no-match'));
});

test('parseExact rejects month outside valid range', () => {
  const result = exactFromInput('21 13 1978');
  assert.is(result.candidates.length, 0);
  assert.ok(result.issues.includes('exact-no-match'));
});

test('parseExact rejects day zero', () => {
  const result = exactFromInput('00/12/1978');
  assert.is(result.candidates.length, 0);
  assert.ok(result.issues.includes('exact-no-match'));
});

test.run();

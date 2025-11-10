import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { parseDate } from '../src/index.js';

function expectInvalid(result, issue) {
  assert.is(result.kind, 'invalid');
  if (issue) {
    assert.ok(result.issues.includes(issue));
  }
  assert.is(result.sortable, false);
  assert.is(result.value, null);
}

test('parseDate handles empty string input', () => {
  const result = parseDate('');
  expectInvalid(result, 'input-empty');
});

test('parseDate handles whitespace-only input', () => {
  const result = parseDate('   \t  ');
  expectInvalid(result, 'input-empty');
});

test('parseDate handles null input gracefully', () => {
  const result = parseDate(null);
  expectInvalid(result, 'input-empty');
});

test('parseDate handles undefined input gracefully', () => {
  const result = parseDate(undefined);
  expectInvalid(result, 'input-empty');
});

test('parseDate handles non-string input types', () => {
  const result = parseDate(1978);
  expectInvalid(result, 'input-empty');
});

test('parseDate handles extremely long input without throwing', () => {
  const longInput = 'a '.repeat(10_000);
  const result = parseDate(longInput);
  expectInvalid(result, 'parser-not-implemented');
});

test('parseDate handles unsupported character sequences', () => {
  const result = parseDate('@@@');
  expectInvalid(result, 'parser-not-implemented');
});

test.run();

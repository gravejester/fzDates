import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { parseDate, createDateParser } from '../src/index.js';

const defaultParser = createDateParser();

function collectIssues(result) {
  return Array.isArray(result.issues) ? result.issues : [];
}

test('parseDate supports four-digit upper-bound years', () => {
  const result = defaultParser.parse('31 Dec 9999');
  assert.is(result.kind, 'exact');
  assert.is(result.value.year, 9999);
  assert.is(result.display, '9999-12-31');
});

test('parseDate falls back when encountering five-digit years', () => {
  const result = defaultParser.parse('31 Dec 10000');
  assert.is(result.kind, 'invalid');
  assert.ok(collectIssues(result).includes('exact-no-match'));
});

test('default parser records two-digit year usage', () => {
  const result = defaultParser.parse('05 Jun 78');
  assert.is(result.kind, 'partial');
  assert.is(result.value.year, 78);
  assert.ok(collectIssues(result).includes('two-digit-year'));
});

test('two-digit years can be disallowed via configuration', () => {
  const parser = createDateParser({
    partial: { allowTwoDigitYears: false }
  });
  const result = parser.parse('05 Jun 78');
  assert.is(result.kind, 'partial');
  assert.ok(collectIssues(result).includes('missing-year'));
});

test.run();

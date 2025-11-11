import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { parseDate, createDateParser } from '../src/index.js';

const defaultParser = createDateParser();

function collectIssues(result) {
  return Array.isArray(result.issues) ? result.issues : [];
}

test('parseDate supports four-digit years near the historical ceiling', () => {
  const result = defaultParser.parse('31 Dec 9999');
  assert.is(result.kind, 'exact');
  assert.is(result.value.year, 9999);
  assert.is(result.display, '9999-12-31');
  assert.is(result.iso, '9999-12-31');
  assert.is(result.value.iso, '9999-12-31');
});

test('parseDate supports three-digit years', () => {
  const result = defaultParser.parse('1 Jan 889');
  assert.is(result.kind, 'exact');
  assert.is(result.value.year, 889);
  assert.is(result.value.month, 1);
  assert.is(result.value.day, 1);
  assert.is(result.display, '0889-01-01');
  assert.is(result.iso, '0889-01-01');
  assert.is(result.value.iso, '0889-01-01');
});

test('parseDate supports five-digit years', () => {
  const result = defaultParser.parse('31 Dec 10000');
  assert.is(result.kind, 'exact');
  assert.is(result.value.year, 10000);
  assert.is(result.display, '10000-12-31');
  assert.is(result.iso, '10000-12-31');
  assert.is(result.value.iso, '10000-12-31');
});

test('parseDate treats literal high two-digit years as exact dates', () => {
  const result = defaultParser.parse('05 Jun 78');
  assert.is(result.kind, 'exact');
  assert.is(result.value.year, 78);
  assert.is(result.display, '0078-06-05');
  assert.is(result.iso, '0078-06-05');
});

test('small two-digit years require explicit opt-in', () => {
  const result = defaultParser.parse('05 Jun 21');
  assert.is(result.kind, 'partial');
  assert.is(result.value.year, null);
  assert.ok(collectIssues(result).includes('missing-year'));
  assert.is(result.iso, '--06-05');
  assert.is(result.value?.iso, '--06-05');
});

test('two-digit years within the day range can be enabled via configuration', () => {
  const parser = createDateParser({
    partial: { allowTwoDigitYears: false }
  });
  let result = parser.parse('05 Jun 21');
  assert.is(result.kind, 'partial');
  assert.ok(collectIssues(result).includes('missing-year'));
  assert.is(result.iso, '--06-05');

  const permissive = createDateParser({
    partial: { allowTwoDigitYears: true }
  });
  result = permissive.parse('05 Jun 21');
  assert.is(result.kind, 'exact');
  assert.is(result.value.year, 21);
  assert.ok(collectIssues(result).includes('two-digit-year'));
  assert.is(result.iso, '0021-06-05');
  assert.is(result.value.iso, '0021-06-05');
});

test.run();

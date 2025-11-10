import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { parseDate, createDateParser } from '../src/index.js';

test('parseDate recognizes exact date', () => {
  const result = parseDate('21 Sep 1978');
  assert.is(result.kind, 'exact');
  assert.is(result.value.year, 1978);
  assert.is(result.value.month, 9);
  assert.is(result.value.day, 21);
  assert.is(result.normalized, '1978-09-21');
  assert.ok(result.issues.length === 0);
});

test('parseDate recognizes partial month + year', () => {
  const result = parseDate('January 2000');
  assert.is(result.kind, 'partial');
  assert.is(result.value.year, 2000);
  assert.is(result.value.month, 1);
  assert.ok(result.issues.includes('missing-day'));
});

test('parseDate reports ambiguity for numeric date with multiple orders', () => {
  const result = parseDate('01/02/1900');
  assert.is(result.kind, 'ambiguous');
  assert.ok(Array.isArray(result.candidates));
  assert.ok(result.candidates.length >= 2);
  const normalized = result.candidates.map((c) => c.normalized);
  assert.ok(normalized.includes('1900-02-01'));
  assert.ok(normalized.includes('1900-01-02'));
});

test('parseDate handles range inputs', () => {
  const result = parseDate('between 1 jan 1980 and 1 oct 1980');
  assert.is(result.kind, 'range');
  assert.is(result.value.start.year, 1980);
  assert.is(result.value.end.month, 10);
  assert.is(result.precision, 'range');
});

test('createDateParser produces parser with parse function', () => {
  const parser = createDateParser();
  assert.type(parser.parse, 'function');
  const result = parser.parse('1978-09-21');
  assert.is(result.kind, 'exact');
});

test('parseDate attaches ISO display by default', () => {
  const result = parseDate('21 Sep 1978');
  assert.is(result.display, '1978-09-21');
  assert.is(result.value.display, '1978-09-21');
});

test('formatter respects locale style options', () => {
  const parser = createDateParser({
    normalizedFormat: {
      style: 'locale',
      options: { dayFirst: true }
    }
  });
  const result = parser.parse('21 Sep 1978');
  assert.is(result.display, '21 Sep 1978');
  assert.is(result.value.display, '21 Sep 1978');
});

test('formatter renders range with locale-aware separator', () => {
  const parser = createDateParser({
    normalizedFormat: {
      style: 'locale'
    }
  });
  const result = parser.parse('between 1 jan 1980 and 5 feb 1980');
  assert.is(result.display, 'Jan 01 1980 – Feb 05 1980');
  assert.is(result.value.start.display, 'Jan 01 1980');
  assert.is(result.value.end.display, 'Feb 05 1980');
});

test('custom formatter overrides default rendering', () => {
  const parser = createDateParser({
    normalizedFormat: {
      style: 'custom',
      formatter(entity, { context }) {
        if (context === 'value' && entity?.value) {
          const { year, month, day } = entity.value;
          const m = month != null ? String(month).padStart(2, '0') : '00';
          const d = day != null ? String(day).padStart(2, '0') : '00';
          return `value:${year ?? '0000'}-${m}-${d}`;
        }
        if (context === 'result' && entity?.normalized) {
          return `result:${entity.normalized}`;
        }
        if (context === 'range' && entity?.value) {
          const start = entity.value.start?.normalized ?? '';
          const end = entity.value.end?.normalized ?? '';
          return `range:${start}..${end}`;
        }
        return null;
      }
    }
  });

  const result = parser.parse('1978-09-21');
  assert.is(result.display, 'result:1978-09-21');
  assert.is(result.value.display, 'value:1978-09-21');
});

test('ambiguous results do not expose a default display string', () => {
  const result = parseDate('01/02/1900');
  assert.is(result.kind, 'ambiguous');
  assert.is(result.display, undefined);
});

test('invalid results do not include a display field', () => {
  const result = parseDate('@@@');
  assert.is(result.kind, 'invalid');
  assert.is(result.display, undefined);
});

test('open range formatting emits qualifier-based text', () => {
  const result = parseDate('after jan 1900');
  assert.is(result.kind, 'range');
  assert.is(result.display, 'after 1900-01');
});

test.run();

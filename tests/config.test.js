import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { createDateParser, registerLocale } from '../src/index.js';
import { resolveOptions, mergeOptions } from '../src/config/options.js';

const baseOptions = resolveOptions();

test('resolveOptions merges user options without mutating defaults', () => {
  const custom = resolveOptions({
    normalizedFormat: {
      options: {
        dayFirst: true,
        monthName: 'long'
      }
    }
  });

  assert.is(baseOptions.normalizedFormat.options.dayFirst, false);
  assert.is(custom.normalizedFormat.options.dayFirst, true);
  assert.is(custom.normalizedFormat.options.monthName, 'long');
  assert.ok(Object.isFrozen(custom));
});

test('mergeOptions produces a deep clone and preserves base options', () => {
  const overrides = {
    partial: { inferMissingDay: true },
    ranges: { defaultInclusivity: { start: false, end: false } }
  };
  const merged = mergeOptions(baseOptions, overrides);

  assert.is(baseOptions.partial.inferMissingDay, false);
  assert.is(merged.partial.inferMissingDay, true);
  assert.is(baseOptions.ranges.defaultInclusivity.start, true);
  assert.is(merged.ranges.defaultInclusivity.end, false);
});

test('per-call overrides adjust parser behavior without mutating defaults', () => {
  const parser = createDateParser({
    normalizedFormat: {
      style: 'locale',
      options: { dayFirst: false }
    }
  });

  const baseResult = parser.parse('21 Sep 1978');
  assert.is(baseResult.display, 'Sep 21 1978');

  const overrideResult = parser.parse('21 Sep 1978', {
    normalizedFormat: {
      options: { dayFirst: true, rangeSeparator: ' .. ' }
    }
  });
  assert.is(overrideResult.display, '21 Sep 1978');

  const rangeResult = parser.parse('between 1 jan 1980 and 5 feb 1980', {
    normalizedFormat: {
      options: { rangeSeparator: ' .. ' }
    }
  });
  assert.is(rangeResult.display, 'Jan 01 1980 .. Feb 05 1980');

  const postOverride = parser.parse('21 Sep 1978');
  assert.is(postOverride.display, 'Sep 21 1978');
});

test('parser respects fallback locales during registration', () => {
  registerLocale({
    id: 'test-locale',
    monthLookup: { enero: 1 },
    monthNames: { short: ['Ene'] }
  });

  const parser = createDateParser({
    locale: 'test-locale',
    fallbackLocales: ['en'],
    normalizedFormat: {
      style: 'locale',
      options: { monthName: 'short' }
    }
  });

  const result = parser.parse('enero 1900');
  assert.is(result.kind, 'partial');
  assert.is(result.value.month, 1);
  assert.is(result.display, 'Ene 1900');
});

test('createDateParser throws when locale is unknown and no fallback resolves', () => {
  assert.throws(() => createDateParser({ locale: 'xx', fallbackLocales: [] }));
});

test('per-call overrides throw when requesting unknown locale', () => {
  const parser = createDateParser();
  assert.throws(() => parser.parse('21 Sep 1978', { locale: 'zz', fallbackLocales: [] }));
});

test('custom formatter style without callback falls back to ISO output', () => {
  const parser = createDateParser({
    normalizedFormat: {
      style: 'custom',
      formatter: null
    }
  });
  const result = parser.parse('1978-09-21');
  assert.is(result.display, '1978-09-21');
});

test.run();

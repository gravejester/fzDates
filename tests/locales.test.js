import { test } from 'uvu';
import * as assert from 'uvu/assert';
import {
  registerLocale,
  ensureLocale,
  getLocale,
  listLocales,
  englishLocale
} from '../src/locales/index.js';

// ensure english locale is available
registerLocale(englishLocale);

test('english locale exposes expected tokens and display data', () => {
  const locale = getLocale('en');
  assert.is(locale.monthTokens.get('jan'), 1);
  const approximate = locale.qualifierTokens.get('ca');
  assert.ok(approximate);
  assert.is(approximate.name, 'approximate');
  assert.is(locale.qualifierDisplay.approximate, 'ca');
  assert.is(locale.rangeSeparator, ' – ');
});

test('registerLocale merges successive packs for a custom locale id', () => {
  registerLocale({
    id: 'tst',
    monthLookup: { primus: 1 },
    qualifiers: { approximate: ['apx'] },
    rangeMarkers: { boundedStart: ['entre'] },
    noiseTokens: ['de'],
    aliases: { 'prim.': 'primus' },
    ordinalSuffixes: ['er'],
    dayMonthOrder: ['DMY'],
    monthNames: { short: ['Prim'] },
    qualifierDisplay: { approximate: '~' },
    rangeSeparator: ' .. '
  });

  let locale = ensureLocale('tst');
  assert.is(locale.monthTokens.get('primus'), 1);
  const customApprox = locale.qualifierTokens.get('apx');
  assert.ok(customApprox);
  assert.is(customApprox.name, 'approximate');
  assert.ok(locale.noiseTokens.has('de'));
  assert.is(locale.ordinalSuffixes[0], 'er');
  assert.is(locale.rangeSeparator, ' .. ');

  registerLocale({
    id: 'tst',
    monthLookup: { secundus: 2 },
    qualifiers: { computed: ['calc'] },
    rangeMarkers: { openEnd: ['hasta'] },
    noiseTokens: ['del'],
    aliases: { 'sec.': 'secundus' },
    qualifierDisplay: { computed: 'calc' }
  });

  locale = ensureLocale('tst');
  assert.is(locale.monthTokens.get('primus'), 1);
  assert.is(locale.monthTokens.get('secundus'), 2);
  const mergedApprox = locale.qualifierTokens.get('apx');
  const mergedComputed = locale.qualifierTokens.get('calc');
  assert.ok(mergedApprox);
  assert.ok(mergedComputed);
  assert.is(mergedApprox.name, 'approximate');
  assert.is(mergedComputed.name, 'computed');
  assert.ok(locale.noiseTokens.has('de'));
  assert.ok(locale.noiseTokens.has('del'));
  const openEndMarker = locale.rangeMarkerTokens.get('hasta');
  assert.ok(openEndMarker);
  assert.is(openEndMarker.role, 'openEnd');
  assert.is(locale.aliases.get('sec.'), 'secundus');
  assert.is(locale.qualifierDisplay.computed, 'calc');
  assert.is(locale.rangeSeparator, ' .. ');
});

test('ensureLocale resolves fallback chain when primary id missing', () => {
  const locale = ensureLocale('missing-locale', ['tst', 'en']);
  assert.is(locale.id, 'tst');
});

test('listLocales exposes registered ids', () => {
  const locales = listLocales();
  assert.ok(locales.includes('en'));
  assert.ok(locales.includes('tst'));
});

test('registerLocale requires an id', () => {
  assert.throws(() => registerLocale({ monthLookup: {} }));
});

test('registerLocale overrides aliases while keeping existing data', () => {
  registerLocale({
    id: 'alias-check',
    monthLookup: { primus: 1 },
    aliases: { p: 'primus' }
  });

  let locale = ensureLocale('alias-check');
  assert.is(locale.aliases.get('p'), 'primus');

  registerLocale({
    id: 'alias-check',
    aliases: { p: 'primus', q: 'primus' }
  });

  locale = ensureLocale('alias-check');
  assert.is(locale.aliases.get('p'), 'primus');
  assert.is(locale.aliases.get('q'), 'primus');
  const english = ensureLocale('en');
  assert.is(english.monthTokens.get('jan'), 1);
});

test.run();

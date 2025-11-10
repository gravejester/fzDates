import { resolveOptions, mergeOptions } from './config/options.js';
import { normalizeInput } from './normalizer.js';
import { tokenizeInput } from './tokenizer.js';
import { ensureLocale, registerLocale, listLocales, englishLocale, getLocale } from './locales/index.js';
import { classifyTokens } from './classifier.js';
import { parseExact } from './parsers/exact.js';
import { parsePartial } from './parsers/partial.js';
import { parseRange } from './parsers/range.js';
import { mergeIssues, toIsoString, resolveAmbiguity } from './utils/result-utils.js';
import { applyFormatting, formatResult, formatValueForOptions } from './formatter.js';

const defaultParser = createDateParser();

export function createDateParser(defaultOptions) {
  const baseOptions = resolveOptions(defaultOptions);
  // Ensure locale is registered; this throws if missing, pushing callers to add packs.
  const baseLocale = ensureLocale(baseOptions.locale, baseOptions.fallbackLocales);

  function parse(input, overrides) {
    const options = overrides
      ? mergeOptions(baseOptions, overrides)
      : baseOptions;
    const locale = options === baseOptions
      ? baseLocale
      : ensureLocale(options.locale, options.fallbackLocales);

  const normalization = normalizeInput(input);
  const tokenization = tokenizeInput(normalization.normalized, options, normalization, locale);
    const classification = classifyTokens(tokenization.tokens, options);

    if (tokenization.normalization.isEmpty) {
      const result = {
        kind: 'invalid',
        original: normalization.original,
        normalized: normalization.normalized,
        precision: 'unknown',
        sortable: false,
        value: null,
        tokens: tokenization.tokens,
        classification,
        issues: ['input-empty']
      };
      applyFormatting(result, options, locale);
      return result;
    }

    if (classification.kind === 'exact') {
      const exactResult = parseExact(tokenization.tokens, normalization, options, classification);
      if (exactResult.candidates.length === 0) {
        const result = {
          kind: 'invalid',
          original: normalization.original,
          normalized: normalization.normalized,
          precision: 'unknown',
          sortable: false,
          value: null,
          tokens: tokenization.tokens,
          classification,
          issues: mergeIssues(tokenization.issues, exactResult.issues, ['parser-not-implemented'])
        };
        applyFormatting(result, options, locale);
        return result;
      }

      const resolution = resolveAmbiguity(exactResult.candidates, options, {
        localeOrders: locale?.dayMonthOrder
      });

      if (resolution.type === 'ambiguous') {
        const result = {
          kind: 'ambiguous',
          original: normalization.original,
          normalized: null,
          precision: 'day',
          sortable: false,
          value: null,
          tokens: tokenization.tokens,
          classification,
          candidates: resolution.candidates.map((candidate) => ({
            year: candidate.year,
            month: candidate.month,
            day: candidate.day,
            normalized: candidate.normalized ?? toIsoString(candidate.year, candidate.month, candidate.day),
            sortKey: candidate.sortKey,
            issues: candidate.issues || [],
            meta: candidate.meta || {}
          })),
          issues: mergeIssues(tokenization.issues, resolution.issues)
        };
        applyFormatting(result, options, locale);
        return result;
      }

      if (resolution.type === 'single' && resolution.candidate) {
        const candidate = resolution.candidate;
        const alternatives = resolution.alternateCandidates || null;
        const result = {
          kind: 'exact',
          original: normalization.original,
          normalized: candidate.normalized ?? toIsoString(candidate.year, candidate.month, candidate.day),
          precision: 'day',
          sortable: candidate.sortKey != null,
          sortKey: candidate.sortKey ?? null,
          value: {
            year: candidate.year,
            month: candidate.month,
            day: candidate.day
          },
          tokens: tokenization.tokens,
          classification,
          issues: mergeIssues(tokenization.issues, resolution.issues),
          alternatives: alternatives && alternatives.length > 1 ? alternatives : undefined
        };
        applyFormatting(result, options, locale);
        return result;
      }
    }

    if (classification.kind === 'partial') {
      const partialResult = parsePartial(tokenization.tokens, normalization, options, classification);
      if (!partialResult.success) {
        const result = {
          kind: 'invalid',
          original: normalization.original,
          normalized: normalization.normalized,
          precision: 'unknown',
          sortable: false,
          value: null,
          tokens: tokenization.tokens,
          classification,
          issues: mergeIssues(tokenization.issues, partialResult.issues, ['parser-not-implemented'])
        };
        applyFormatting(result, options, locale);
        return result;
      }

      const result = {
        kind: 'partial',
        original: normalization.original,
        normalized: partialResult.normalized,
        precision: partialResult.precision,
        qualifiers: partialResult.qualifiers,
        sortable: partialResult.sortKey != null,
        sortKey: partialResult.sortKey ?? null,
        value: partialResult.value,
        tokens: tokenization.tokens,
        classification,
        issues: mergeIssues(tokenization.issues, partialResult.issues)
      };
      applyFormatting(result, options, locale);
      return result;
    }

    if (classification.kind === 'range') {
      const rangeResult = parseRange(tokenization.tokens, normalization, options, classification, {
        locale
      });
      if (!rangeResult.success) {
        const result = {
          kind: 'invalid',
          original: normalization.original,
          normalized: normalization.normalized,
          precision: 'unknown',
          sortable: false,
          value: null,
          tokens: tokenization.tokens,
          classification,
          issues: mergeIssues(tokenization.issues, rangeResult.issues || ['parser-not-implemented'])
        };
        applyFormatting(result, options, locale);
        return result;
      }

      const result = {
        kind: 'range',
        original: normalization.original,
        normalized: rangeResult.normalized ?? normalization.normalized,
        precision: 'range',
        sortable: rangeResult.sortKey != null,
        sortKey: rangeResult.sortKey ?? null,
        value: rangeResult.value,
        tokens: tokenization.tokens,
        classification,
        issues: mergeIssues(tokenization.issues, rangeResult.issues)
      };

      const hasCandidates = rangeResult.candidates && (rangeResult.candidates.start || rangeResult.candidates.end);
      if (hasCandidates) {
        result.candidates = rangeResult.candidates;
        result.issues = mergeIssues(result.issues, ['range-bound-ambiguous']);
      }

      applyFormatting(result, options, locale);
      return result;
    }

    const result = {
      kind: classification.kind,
      original: normalization.original,
      normalized: normalization.normalized,
      precision: classification.precisionHint || 'unknown',
      sortable: false,
      value: null,
      tokens: tokenization.tokens,
      classification,
      issues: tokenization.issues.concat('parser-not-implemented')
    };
    applyFormatting(result, options, locale);
    return result;
  }

  return {
    parse,
    options: () => baseOptions
  };
}

export function parseDate(input, overrides) {
  return defaultParser.parse(input, overrides);
}

export { normalizeInput };
export { tokenizeInput };
export { classifyTokens };
export { parseExact };
export { parsePartial };
export { parseRange };
export { registerLocale, listLocales, englishLocale, ensureLocale, getLocale };
export { applyFormatting, formatResult, formatValueForOptions } from './formatter.js';

export default {
  parseDate,
  createDateParser,
  normalizeInput,
  tokenizeInput,
  classifyTokens,
  parseExact,
  parsePartial,
  parseRange,
  registerLocale,
  listLocales,
  ensureLocale,
  getLocale,
  applyFormatting,
  formatResult,
  formatValueForOptions
};

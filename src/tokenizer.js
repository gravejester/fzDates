import { normalizeInput } from './normalizer.js';
import { ensureLocale } from './locales/index.js';

const TOKEN_PATTERN = /[0-9]+(?:[A-Za-z]{2})?|[A-Za-z]+\.?|[^\sA-Za-z0-9]+/g;

function parseOrdinal(token, ordinalSuffixes) {
  for (const suffix of ordinalSuffixes) {
    if (token.length > suffix.length && token.endsWith(suffix)) {
      const numeric = token.slice(0, -suffix.length);
      if (/^\d+$/.test(numeric)) {
        return Number.parseInt(numeric, 10);
      }
    }
  }
  return null;
}

function normalizeWordToken(token) {
  return token.replace(/\.$/, '');
}

function classifyToken(rawToken, locale, position) {
  const raw = rawToken;
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const lowerCandidate = trimmed.toLowerCase();
  const canonicalCandidate = locale.aliases.get(lowerCandidate) || lowerCandidate;

  let type = 'word';
  let subtype = null;
  let value = null;
  let normalized = canonicalCandidate;

  if (/^\d+$/.test(trimmed)) {
    type = 'number';
    value = Number.parseInt(trimmed, 10);
    normalized = trimmed;
  } else if (locale.monthTokens.has(canonicalCandidate)) {
    type = 'month';
    value = locale.monthTokens.get(canonicalCandidate);
  } else if (locale.qualifierTokens.has(canonicalCandidate)) {
    type = 'qualifier';
    subtype = locale.qualifierTokens.get(canonicalCandidate).name;
  } else if (locale.rangeMarkerTokens.has(canonicalCandidate)) {
    type = 'range-marker';
    subtype = locale.rangeMarkerTokens.get(canonicalCandidate).role;
  } else if (locale.noiseTokens.has(canonicalCandidate)) {
    type = 'noise';
  } else if (/^[^A-Za-z0-9]+$/.test(trimmed)) {
    type = 'symbol';
    normalized = trimmed;
  } else {
    const ordinal = parseOrdinal(canonicalCandidate, locale.ordinalSuffixes);
    if (ordinal !== null) {
      type = 'number';
      subtype = 'ordinal';
      value = ordinal;
      normalized = String(ordinal);
    } else {
      const normalizedWord = normalizeWordToken(canonicalCandidate);
      if (locale.monthTokens.has(normalizedWord)) {
        type = 'month';
        value = locale.monthTokens.get(normalizedWord);
        normalized = normalizedWord;
      } else if (locale.qualifierTokens.has(normalizedWord)) {
        type = 'qualifier';
        subtype = locale.qualifierTokens.get(normalizedWord).name;
        normalized = normalizedWord;
      } else if (locale.rangeMarkerTokens.has(normalizedWord)) {
        type = 'range-marker';
        subtype = locale.rangeMarkerTokens.get(normalizedWord).role;
        normalized = normalizedWord;
      } else if (locale.noiseTokens.has(normalizedWord)) {
        type = 'noise';
        normalized = normalizedWord;
      } else {
        normalized = normalizedWord;
      }
    }
  }

  return {
    raw,
    normalized,
    lower: canonicalCandidate,
    type,
    subtype,
    value,
    index: position.index,
    start: position.offset,
    end: position.offset + raw.length
  };
}

export function tokenizeInput(input, options, normalizationOverride, localeOverride) {
  const normalization = normalizationOverride || normalizeInput(input);
  const locale = localeOverride || ensureLocale(options.locale, options.fallbackLocales);

  if (normalization.isEmpty) {
    return {
      tokens: [],
      issues: ['input-empty'],
      normalization
    };
  }

  const tokens = [];
  const issues = [];
  let match;
  let index = 0;

  TOKEN_PATTERN.lastIndex = 0;
  while ((match = TOKEN_PATTERN.exec(normalization.normalized)) !== null) {
    const token = match[0];
    const classified = classifyToken(token, locale, { index, offset: match.index });
    if (classified) {
      tokens.push(classified);
      index += 1;
    }
  }

  return {
    tokens,
    issues,
    normalization
  };
}

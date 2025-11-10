import { parseExact } from './exact.js';
import { parsePartial } from './partial.js';
import { toIsoString, mergeIssues, resolveAmbiguity } from '../utils/result-utils.js';

function isNoise(token) {
  return token.type === 'noise';
}

function isRangeMarker(token, subtype) {
  return token && token.type === 'range-marker' && (!subtype || token.subtype === subtype);
}

function isHyphenSymbol(token) {
  return token && token.type === 'symbol' && token.normalized.includes('-');
}

const OPEN_START_QUALIFIERS = new Set(['after']);
const OPEN_END_QUALIFIERS = new Set(['before']);
const INCLUSIVE_START_WORDS = new Set(['since']);
const EXCLUSIVE_START_WORDS = new Set(['after']);
const EXCLUSIVE_END_WORDS = new Set(['before']);
const INCLUSIVE_END_WORDS = new Set([]);

function isOpenStartToken(token) {
  if (!token) return false;
  if (isRangeMarker(token, 'openStart')) return true;
  if (token.type === 'qualifier' && OPEN_START_QUALIFIERS.has(token.subtype)) {
    return true;
  }
  return false;
}

function isOpenEndToken(token) {
  if (!token) return false;
  if (isRangeMarker(token, 'openEnd')) return true;
  if (token.type === 'qualifier' && OPEN_END_QUALIFIERS.has(token.subtype)) {
    return true;
  }
  return false;
}

function dropLeading(tokens, predicate) {
  let start = 0;
  while (start < tokens.length && predicate(tokens[start])) {
    start += 1;
  }
  return tokens.slice(start);
}

function dropTrailing(tokens, predicate) {
  let end = tokens.length;
  while (end > 0 && predicate(tokens[end - 1])) {
    end -= 1;
  }
  return tokens.slice(0, end);
}

function cleanupBoundary(tokens) {
  const cleaned = [];
  for (const token of tokens) {
    if (token.type === 'range-marker') {
      continue;
    }
    if (token.type === 'symbol' && token.normalized.includes('-')) {
      continue;
    }
    if (isNoise(token)) {
      continue;
    }
    cleaned.push(token);
  }
  return cleaned;
}

function isJoinToken(token) {
  return (
    token &&
    token.type === 'range-marker' &&
    (token.subtype === 'boundedJoin' || token.subtype === 'boundedEnd')
  );
}

function segmentRange(tokens, options) {
  const defaultInclusivity = options?.ranges?.defaultInclusivity || { start: true, end: true };
  const relevant = tokens.filter((token) => !isNoise(token));
  if (relevant.length === 0) {
    return null;
  }

  const first = relevant[0];

  if (isOpenStartToken(first)) {
    const remaining = cleanupBoundary(relevant.slice(1));
    const inclusiveStart = !EXCLUSIVE_START_WORDS.has(first.lower) && !EXCLUSIVE_START_WORDS.has(first.normalized);
    const inclusive = {
      start: inclusiveStart || INCLUSIVE_START_WORDS.has(first.lower) || INCLUSIVE_START_WORDS.has(first.normalized),
      end: defaultInclusivity.end
    };
    return {
      kind: 'open-start',
      startTokens: remaining,
      endTokens: [],
      inclusiveStart: inclusive.start,
      inclusiveEnd: inclusive.end
    };
  }

  if (isOpenEndToken(first)) {
    const remaining = cleanupBoundary(relevant.slice(1));
    const inclusiveEnd = INCLUSIVE_END_WORDS.has(first.lower) || INCLUSIVE_END_WORDS.has(first.normalized);
    const exclusiveEnd = EXCLUSIVE_END_WORDS.has(first.lower) || EXCLUSIVE_END_WORDS.has(first.normalized);
    const inclusive = {
      start: defaultInclusivity.start,
      end: exclusiveEnd ? false : inclusiveEnd || defaultInclusivity.end
    };
    return {
      kind: 'open-end',
      startTokens: [],
      endTokens: remaining,
      inclusiveStart: inclusive.start,
      inclusiveEnd: inclusive.end
    };
  }

  const joinIndex = relevant.findIndex((token) => isJoinToken(token));
  if (joinIndex >= 0) {
    const startTokens = cleanupBoundary(
      dropTrailing(relevant.slice(0, joinIndex), (token) => isRangeMarker(token))
    );
    const endTokens = cleanupBoundary(dropLeading(relevant.slice(joinIndex + 1), (token) => isRangeMarker(token)));
    return {
      kind: 'bounded',
      startTokens,
      endTokens,
      inclusiveStart: defaultInclusivity.start,
      inclusiveEnd: defaultInclusivity.end
    };
  }

  const hyphenIndex = relevant.findIndex((token) => isHyphenSymbol(token));
  if (hyphenIndex >= 0) {
    const startTokens = cleanupBoundary(relevant.slice(0, hyphenIndex));
    const endTokens = cleanupBoundary(relevant.slice(hyphenIndex + 1));
    return {
      kind: 'bounded',
      startTokens,
      endTokens,
      inclusiveStart: defaultInclusivity.start,
      inclusiveEnd: defaultInclusivity.end
    };
  }

  return null;
}

function parseBoundaryTokens(tokens, normalization, options) {
  if (!tokens || tokens.length === 0) {
    return {
      type: 'none',
      issues: [],
      normalized: null,
      sortKey: null
    };
  }

  const exact = parseExact(tokens, normalization, options);
  if (exact.candidates.length === 1) {
    const candidate = exact.candidates[0];
    return {
      type: 'exact',
      value: {
        kind: 'exact',
        year: candidate.year,
        month: candidate.month,
        day: candidate.day,
        normalized: toIsoString(candidate.year, candidate.month, candidate.day),
        precision: 'day',
        qualifiers: []
      },
      sortKey: candidate.sortKey,
  issues: mergeIssues(exact.issues, candidate.issues)
    };
  }

  if (exact.candidates.length > 1) {
    const candidates = exact.candidates.map((candidate) => ({
      kind: 'exact',
      year: candidate.year,
      month: candidate.month,
      day: candidate.day,
      normalized: toIsoString(candidate.year, candidate.month, candidate.day),
      precision: 'day',
      qualifiers: [],
      sortKey: candidate.sortKey,
      issues: candidate.issues
    }));
    return {
      type: 'ambiguous',
      candidates,
      issues: mergeIssues(exact.issues, ['range-bound-ambiguous'])
    };
  }

  const partial = parsePartial(tokens, normalization, options);
  if (partial.success) {
    return {
      type: 'partial',
      value: {
        kind: 'partial',
        year: partial.value.year,
        month: partial.value.month,
        day: partial.value.day,
        normalized: partial.normalized,
        precision: partial.precision,
        qualifiers: partial.qualifiers
      },
      sortKey: partial.sortKey,
  issues: mergeIssues(partial.issues)
    };
  }

  return {
    type: 'invalid',
    issues: mergeIssues(partial.issues, ['range-bound-invalid'])
  };
}

function rangeNormalized(startValue, endValue) {
  const startNorm = startValue?.normalized || null;
  const endNorm = endValue?.normalized || null;
  if (startNorm && endNorm) {
    return `${startNorm}..${endNorm}`;
  }
  if (startNorm) {
    return `${startNorm}..`;
  }
  if (endNorm) {
    return `..${endNorm}`;
  }
  return null;
}

function applyBoundaryStrategy(boundary, options, localeOrders) {
  if (boundary.type !== 'ambiguous') {
    return boundary;
  }

  const resolution = resolveAmbiguity(boundary.candidates, options, { localeOrders });

  if (resolution.type === 'ambiguous') {
    return {
      ...boundary,
      issues: mergeIssues(boundary.issues, resolution.issues),
      candidates: resolution.candidates
    };
  }

  if (resolution.type === 'single' && resolution.candidate) {
    const candidate = resolution.candidate;
    return {
      type: 'exact',
      value: {
        kind: 'exact',
        year: candidate.year,
        month: candidate.month,
        day: candidate.day,
        normalized: candidate.normalized ?? toIsoString(candidate.year, candidate.month, candidate.day),
        precision: 'day',
        qualifiers: []
      },
      sortKey: candidate.sortKey,
      issues: mergeIssues(boundary.issues, resolution.issues),
      meta: candidate.meta || {},
      alternatives: resolution.alternateCandidates || null
    };
  }

  return boundary;
}

export function parseRange(tokens, normalization, options, classification = null, context = {}) {
  const segments = segmentRange(tokens, options);
  if (!segments) {
    return {
      success: false,
      issues: ['range-no-match']
    };
  }

  const localeOrders = context?.locale?.dayMonthOrder;

  const startBoundaryRaw = parseBoundaryTokens(segments.startTokens, normalization, options);
  const endBoundaryRaw = parseBoundaryTokens(segments.endTokens, normalization, options);

  const startBoundary = applyBoundaryStrategy(startBoundaryRaw, options, localeOrders);
  const endBoundary = applyBoundaryStrategy(endBoundaryRaw, options, localeOrders);

  const issues = mergeIssues(
    startBoundary.issues,
    endBoundary.issues,
    segments.kind === 'bounded' && (!segments.startTokens.length || !segments.endTokens.length)
      ? ['range-bound-missing']
      : []
  );

  if (startBoundary.type === 'invalid' || endBoundary.type === 'invalid') {
    return {
      success: false,
      issues: issues.length ? issues : ['range-bound-invalid']
    };
  }

  const value = {
    start: startBoundary.value || null,
    end: endBoundary.value || null,
    inclusiveStart: segments.inclusiveStart,
    inclusiveEnd: segments.inclusiveEnd
  };

  const normalizedRange = rangeNormalized(value.start, value.end);
  const sortKey = startBoundary.sortKey ?? null;

  const candidates = {};
  if (startBoundary.type === 'ambiguous') {
    candidates.start = startBoundary.candidates;
  } else if (startBoundary.alternatives) {
    candidates.start = startBoundary.alternatives;
  }
  if (endBoundary.type === 'ambiguous') {
    candidates.end = endBoundary.candidates;
  } else if (endBoundary.alternatives) {
    candidates.end = endBoundary.alternatives;
  }

  return {
    success: true,
    value,
    normalized: normalizedRange,
    sortKey,
    issues,
    candidates,
    startBoundary,
    endBoundary
  };
}

export default parseRange;

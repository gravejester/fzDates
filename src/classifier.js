const RANGE_QUALIFIERS = new Set(['before', 'after']);

function isYearCandidate(value, options) {
  const absolute = Math.abs(value);
  if (absolute >= 32) {
    return true;
  }
  if (absolute === 0 && options?.partial?.allowTwoDigitYears) {
    return true;
  }
  if (absolute <= 31 && options?.partial?.allowTwoDigitYears) {
    return true;
  }
  return false;
}

function collectSignals(tokens) {
  const signals = {
    tokenCount: tokens.length,
    numbers: [],
    months: [],
    qualifiers: [],
    rangeMarkers: [],
    symbols: [],
    words: [],
    hasHyphenBetweenNumbers: false,
    hasRangeQualifier: false,
    hasRangeMarker: false
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    switch (token.type) {
      case 'number':
        signals.numbers.push(token);
        break;
      case 'month':
        signals.months.push(token);
        break;
      case 'qualifier':
        signals.qualifiers.push(token);
        if (RANGE_QUALIFIERS.has(token.subtype)) {
          signals.hasRangeQualifier = true;
        }
        break;
      case 'range-marker':
        signals.rangeMarkers.push(token);
        signals.hasRangeMarker = true;
        break;
      case 'symbol':
        signals.symbols.push(token);
        break;
      default:
        signals.words.push(token);
        break;
    }

    if (token.type === 'symbol' && token.normalized.includes('-')) {
      const prev = tokens[i - 1];
      const next = tokens[i + 1];
      if (prev && next && prev.type === 'number' && next.type === 'number') {
        signals.hasHyphenBetweenNumbers = true;
      }
    }
  }

  return signals;
}

function hasPossibleRange(signals, options) {
  if (signals.hasRangeMarker || signals.hasRangeQualifier) {
    return true;
  }

  if (signals.hasHyphenBetweenNumbers) {
    const numberCount = signals.numbers.length;
    const hasMonth = signals.months.length > 0;
    if (!hasMonth && numberCount <= 2) {
      return true;
    }
    if (!hasMonth && numberCount === 3) {
      // Distinguish numeric dates (e.g., 1978-09-21) from ranges (1980-1981).
      // Require at least two year-like values to classify as range.
      const yearish = signals.numbers.filter((token) => isYearCandidate(token.value, options));
      if (yearish.length >= 2) {
        return true;
      }
      return false;
    }
  }

  return false;
}

function classifyExactOrPartial(signals, options) {
  const hasMonth = signals.months.length > 0;
  const numberCount = signals.numbers.length;
  const yearCandidates = signals.numbers.filter((token) => isYearCandidate(token.value, options));
  const dayCandidates = signals.numbers.filter((token) => token.value >= 1 && token.value <= 31);

  const hasApproxQualifier = signals.qualifiers.some((token) => token.subtype === 'approximate');
  const hasCalculatedQualifier = signals.qualifiers.some((token) => token.subtype === 'calculated' || token.subtype === 'estimated');

  if (hasMonth && yearCandidates.length > 0 && dayCandidates.length > 0) {
    return {
      kind: 'exact',
      confidence: 'high',
      precisionHint: 'day',
      reasons: ['month-with-day-and-year']
    };
  }

  if (hasMonth && numberCount >= 2 && yearCandidates.length > 0) {
    return {
      kind: 'exact',
      confidence: 'medium',
      precisionHint: 'day',
      reasons: ['month-with-numeric-pattern']
    };
  }

  if (hasMonth && yearCandidates.length > 0) {
    return {
      kind: 'partial',
      confidence: 'medium',
      precisionHint: 'month',
      reasons: ['month-with-year']
    };
  }

  if (hasMonth && dayCandidates.length > 0) {
    return {
      kind: 'partial',
      confidence: 'medium',
      precisionHint: 'day',
      reasons: ['month-with-day']
    };
  }

  if (hasApproxQualifier || hasCalculatedQualifier) {
    return {
      kind: 'partial',
      confidence: 'medium',
      precisionHint: yearCandidates.length ? 'year' : 'unknown',
      reasons: ['approximate-qualifier']
    };
  }

  if (signals.tokenCount === 1 && yearCandidates.length === 1) {
    return {
      kind: 'partial',
      confidence: 'medium',
      precisionHint: 'year',
      reasons: ['single-year']
    };
  }

  if (numberCount >= 3 && yearCandidates.length > 0) {
    return {
      kind: 'exact',
      confidence: 'low',
      precisionHint: 'day',
      reasons: ['numeric-triplet']
    };
  }

  if (yearCandidates.length > 0 || hasMonth) {
    return {
      kind: 'partial',
      confidence: 'low',
      precisionHint: hasMonth ? 'month' : 'year',
      reasons: ['insufficient-components']
    };
  }

  return {
    kind: 'invalid',
    confidence: 'low',
    precisionHint: 'unknown',
    reasons: ['no-recognized-components']
  };
}

export function classifyTokens(tokens, options = {}) {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return {
      kind: 'invalid',
      confidence: 'low',
      precisionHint: 'unknown',
      reasons: ['no-tokens'],
      signals: {
        tokenCount: 0,
        numbers: [],
        months: [],
        qualifiers: [],
        rangeMarkers: [],
        symbols: [],
        words: [],
        hasHyphenBetweenNumbers: false,
        hasRangeQualifier: false,
        hasRangeMarker: false
      }
    };
  }

  const signals = collectSignals(tokens);

  if (hasPossibleRange(signals, options)) {
    return {
      kind: 'range',
      confidence: 'medium',
      precisionHint: 'range',
      reasons: ['range-signals'],
      signals
    };
  }

  const result = classifyExactOrPartial(signals, options);
  return {
    ...result,
    signals
  };
}

export default classifyTokens;

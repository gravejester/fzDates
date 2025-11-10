import { dedupeCandidates, isValidDay, isValidMonth, normalizeYear, makeSortKey } from '../utils/date-utils.js';
import { toIsoString } from '../utils/result-utils.js';

const NUMERIC_ORDER_FALLBACK = ['DMY', 'MDY', 'YMD'];

function extractMonth(tokens) {
  const months = tokens.filter((token) => token.type === 'month');
  if (months.length !== 1) {
    return null;
  }
  return {
    month: months[0].value,
    index: tokens.indexOf(months[0])
  };
}

function findNearestDay(tokens, monthIndex) {
  // Look left then right for day candidates between 1 and 31
  for (let i = monthIndex - 1; i >= 0; i -= 1) {
    const token = tokens[i];
    if (token.type === 'number' && token.value >= 1 && token.value <= 31) {
      return { day: token.value, token };
    }
    if (token.type !== 'number' && token.type !== 'symbol') {
      break;
    }
  }

  for (let i = monthIndex + 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token.type === 'number' && token.value >= 1 && token.value <= 31) {
      return { day: token.value, token };
    }
    if (token.type !== 'number' && token.type !== 'symbol') {
      break;
    }
  }

  return null;
}

function findYear(tokens, monthIndex, options, issues) {
  // Prefer numbers after the month, fallback to before
  let sawLargeCandidate = false;
  let sawValidLargeCandidate = false;

  const considerToken = (token) => {
    if (token.type !== 'number') {
      return null;
    }

    const value = token.value;
    const normalized = normalizeYear(value, options, issues);

    if (value >= 100) {
      sawLargeCandidate = true;
      if (normalized !== null) {
        sawValidLargeCandidate = true;
        return { year: normalized, token };
      }
      return null;
    }

    if (normalized !== null) {
      if (sawLargeCandidate && !sawValidLargeCandidate) {
        return null;
      }
      return { year: normalized, token };
    }

    return null;
  };

  for (let i = monthIndex + 1; i < tokens.length; i += 1) {
    const token = tokens[i];
    const candidate = considerToken(token);
    if (candidate) {
      return candidate;
    }
    if (token.type !== 'number' && token.type !== 'symbol') {
      break;
    }
  }

  for (let i = monthIndex - 1; i >= 0; i -= 1) {
    const token = tokens[i];
    const candidate = considerToken(token);
    if (candidate) {
      return candidate;
    }
    if (token.type !== 'number' && token.type !== 'symbol') {
      break;
    }
  }

  if (sawLargeCandidate && !sawValidLargeCandidate) {
    issues.push('invalid-year');
  }

  return null;
}

function validateCandidate(candidate, issues) {
  const localIssues = [];
  if (!isValidMonth(candidate.month)) {
    localIssues.push('invalid-month');
  }
  if (!isValidDay(candidate.year, candidate.month, candidate.day)) {
    localIssues.push('invalid-day');
  }
  if (candidate.year === null || candidate.year === undefined) {
    localIssues.push('invalid-year');
  }

  if (localIssues.length > 0) {
    issues.push(...localIssues);
    return false;
  }
  return true;
}

function buildCandidate(year, month, day, baseIssues = [], meta = {}) {
  const issues = [...baseIssues];
  const valid = validateCandidate({ year, month, day }, issues);
  if (!valid) {
    return null;
  }

  return {
    kind: 'exact',
    year,
    month,
    day,
    precision: 'day',
    sortKey: makeSortKey(year, month, day),
    normalized: toIsoString(year, month, day),
    issues,
    meta
  };
}

function parseWithMonth(tokens, options) {
  const monthInfo = extractMonth(tokens);
  if (!monthInfo) {
    return [];
  }
  const issues = [];
  const dayInfo = findNearestDay(tokens, monthInfo.index);
  const yearInfo = findYear(tokens, monthInfo.index, options, issues);
  if (!dayInfo || !yearInfo) {
    issues.push('missing-day-or-year');
    return [];
  }

  const candidate = buildCandidate(yearInfo.year, monthInfo.month, dayInfo.day, issues, {
    source: 'month-name'
  });
  return candidate ? [candidate] : [];
}

function extractNumbers(tokens) {
  return tokens.filter((token) => token.type === 'number');
}

function mapOrder(order, numbers) {
  const [a, b, c] = numbers;
  switch (order) {
    case 'DMY':
      return { day: a.value, month: b.value, yearValue: c.value };
    case 'MDY':
      return { day: b.value, month: a.value, yearValue: c.value };
    case 'YMD':
      return { day: c.value, month: b.value, yearValue: a.value };
    case 'YDM':
      return { day: b.value, month: c.value, yearValue: a.value };
    default:
      return null;
  }
}

function parseNumeric(tokens, options) {
  const numbers = extractNumbers(tokens);
  if (numbers.length !== 3) {
    return [];
  }

  const orders = options.ambiguity?.preferredOrders?.length
    ? [...options.ambiguity.preferredOrders]
    : [];

  for (const fallback of NUMERIC_ORDER_FALLBACK) {
    if (!orders.includes(fallback)) {
      orders.push(fallback);
    }
  }

  const candidates = [];

  for (const order of orders) {
    const mapped = mapOrder(order, numbers);
    if (!mapped) {
      continue;
    }

    const issues = [];
    const year = normalizeYear(mapped.yearValue, options, issues);
    const month = mapped.month;
    const day = mapped.day;

    if (year === null) {
      issues.push('invalid-year');
    }

    const candidate = buildCandidate(year, month, day, issues, { order, source: 'numeric' });
    if (candidate) {
      candidates.push({ candidate, order });
    }
  }

  if (candidates.length === 0) {
    return [];
  }

  const deduped = dedupeCandidates(candidates.map((entry) => entry.candidate));
  if (deduped.length > 1) {
    for (const candidate of deduped) {
      if (!candidate.issues.includes('ambiguous-order')) {
        candidate.issues.push('ambiguous-order');
      }
    }
  }

  return deduped;
}

export function parseExact(tokens, normalization, options, classification = null) {
  const withMonth = parseWithMonth(tokens, options);
  if (withMonth.length > 0) {
    const issues = new Set();
    for (const candidate of withMonth) {
      for (const issue of candidate.issues || []) {
        issues.add(issue);
      }
    }
    return {
      candidates: withMonth,
      issues: Array.from(issues)
    };
  }

  const numeric = parseNumeric(tokens, options);
  if (numeric.length > 0) {
    const seen = new Set();
    const allIssues = [];
    for (const candidate of numeric) {
      for (const issue of candidate.issues || []) {
        if (!seen.has(issue)) {
          seen.add(issue);
          allIssues.push(issue);
        }
      }
    }
    return {
      candidates: numeric,
      issues: allIssues
    };
  }

  return {
    candidates: [],
    issues: ['exact-no-match']
  };
}

export default parseExact;

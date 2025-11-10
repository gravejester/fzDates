import { normalizeYear, isValidMonth, isValidDay, makeSortKey } from '../utils/date-utils.js';

function unique(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (item != null && !seen.has(item)) {
      seen.add(item);
      out.push(item);
    }
  }
  return out;
}

function gather(tokens) {
  const data = {
    years: [],
    months: [],
    days: [],
    qualifiers: [],
    numbers: []
  };

  for (const token of tokens) {
    if (token.type === 'month') {
      data.months.push(token);
    } else if (token.type === 'qualifier') {
      data.qualifiers.push(token);
    } else if (token.type === 'number') {
      data.numbers.push(token);
      if (token.value >= 1 && token.value <= 31) {
        data.days.push(token);
      }
      if (token.value >= 1000) {
        data.years.push(token);
      }
    }
  }

  return data;
}

function resolveYear(numbers, options, issues, context) {
  const hasMonth = context.hasMonth;
  const allowSmallYear = !hasMonth || numbers.length > 1;

  const large = [];
  const medium = [];
  const small = [];

  for (const token of numbers) {
    if (token.value >= 1000) {
      large.push(token);
    } else if (token.value >= 100 || token.value > 31) {
      medium.push(token);
    } else {
      small.push(token);
    }
  }

  const ordered = [...large, ...medium];
  if (allowSmallYear) {
    ordered.push(...small);
  }

  for (const token of ordered) {
    const normalized = normalizeYear(token.value, options, issues);
    if (normalized !== null) {
      return { year: normalized, token };
    }
  }
  return { year: null, token: null };
}

function resolveDay(dayTokens, excludeToken) {
  for (const token of dayTokens) {
    if (excludeToken && token === excludeToken) {
      continue;
    }
    return { day: token.value, token };
  }
  return { day: null, token: null };
}

function primaryMonth(months) {
  if (months.length === 0) {
    return { month: null, token: null };
  }
  return { month: months[0].value, token: months[0] };
}

function isoForPartial(year, month, day) {
  if (year != null && month != null && day != null) {
    const y = String(year).padStart(4, '0');
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (year != null && month != null) {
    const y = String(year).padStart(4, '0');
    const m = String(month).padStart(2, '0');
    return `${y}-${m}`;
  }
  if (year != null) {
    return String(year).padStart(4, '0');
  }
  return null;
}

function determinePrecision(year, month, day, issues) {
  if (year != null && month != null && day != null) {
    return 'day';
  }
  if (year != null && month != null) {
    if (!issues.includes('missing-day')) issues.push('missing-day');
    return 'month';
  }
  if (year != null) {
    return 'year';
  }
  if (month != null && day != null) {
    if (!issues.includes('missing-year')) issues.push('missing-year');
    return 'day';
  }
  if (month != null) {
    if (!issues.includes('missing-year')) issues.push('missing-year');
    if (!issues.includes('missing-day')) issues.push('missing-day');
    return 'month';
  }
  if (day != null) {
    if (!issues.includes('missing-month')) issues.push('missing-month');
    if (!issues.includes('missing-year')) issues.push('missing-year');
    return 'day';
  }
  return 'unknown';
}

export function parsePartial(tokens, normalization, options, classification = null) {
  const gathered = gather(tokens);
  const issues = [];
  const qualifierNames = unique(gathered.qualifiers.map((token) => token.subtype || token.normalized));

  let { year, token: yearToken } = resolveYear(gathered.numbers, options, issues, {
    hasMonth: gathered.months.length > 0
  });
  if (year === null && gathered.years.length > 0) {
    issues.push('invalid-year');
  }

  const { month } = primaryMonth(gathered.months);

  const { day } = resolveDay(gathered.days, yearToken);
  if (day !== null && month === null) {
    issues.push('missing-month');
  }

  if (month !== null && !isValidMonth(month)) {
    issues.push('invalid-month');
  }
  if (day !== null && !isValidDay(year, month || 1, day)) {
    issues.push('invalid-day');
  }

  const precision = determinePrecision(year, month, day, issues);

  if (precision === 'unknown' && qualifierNames.length === 0) {
    return {
      success: false,
      issues: unique(issues.concat('partial-no-match'))
    };
  }

  let sortKey = null;
  if (year != null && month != null && day != null) {
    sortKey = makeSortKey(year, month, day);
  } else if (year != null && month != null && options.partial?.inferMissingDay) {
    const inferredDay = 1;
    sortKey = makeSortKey(year, month, inferredDay);
    issues.push('inferred-day');
  } else if (year != null && day == null && month == null && options.partial?.inferMissingMonth) {
    const inferredMonth = 1;
    const inferredDay = options.partial?.inferMissingDay ? 1 : null;
    if (inferredDay != null) {
      sortKey = makeSortKey(year, inferredMonth, inferredDay);
      issues.push('inferred-month');
      issues.push('inferred-day');
    }
  }

  const normalized = isoForPartial(year, month, day);

  return {
    success: true,
    value: {
      year,
      month,
      day
    },
    qualifiers: qualifierNames,
    precision,
    normalized,
    sortKey,
    issues: unique(issues)
  };
}

export default parsePartial;

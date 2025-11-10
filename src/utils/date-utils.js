const DAYS_PER_MONTH_COMMON = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31
];

export function isLeapYear(year) {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

export function daysInMonth(year, month) {
  if (month === 2 && isLeapYear(year)) {
    return 29;
  }
  return DAYS_PER_MONTH_COMMON[month - 1] || 31;
}

export function isValidYear(value, options) {
  if (value >= 1000 && value <= 9999) {
    return true;
  }
  if (value >= 0 && value <= 99 && options.partial?.allowTwoDigitYears) {
    return true;
  }
  return false;
}

export function normalizeYear(value, options, issues) {
  if (value >= 1000 && value <= 9999) {
    return value;
  }
  if (value >= 0 && value <= 99 && options.partial?.allowTwoDigitYears) {
    if (issues) {
      issues.push('two-digit-year');
    }
    return value;
  }
  return null;
}

export function isValidMonth(value) {
  return value >= 1 && value <= 12;
}

export function isValidDay(year, month, day) {
  if (day < 1 || day > 31) {
    return false;
  }
  if (!month || month < 1 || month > 12) {
    return true; // assume upper validation handles month
  }
  return day <= daysInMonth(year || 2000, month);
}

export function makeSortKey(year, month, day) {
  if (!isValidYear(year, { partial: { allowTwoDigitYears: true } })) {
    return null;
  }
  if (!isValidMonth(month) || day < 1 || day > 31) {
    return null;
  }
  return year * 10000 + month * 100 + day;
}

export function dedupeCandidates(candidates) {
  const seen = new Set();
  const result = [];
  for (const candidate of candidates) {
    const key = `${candidate.year}-${candidate.month}-${candidate.day}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(candidate);
    }
  }
  return result;
}

import { toIsoString } from './utils/result-utils.js';

const DEFAULT_RANGE_SEPARATOR = ' - ';

function isCustomFormatter(options) {
  const normalized = options?.normalizedFormat;
  return normalized && normalized.style === 'custom' && typeof normalized.formatter === 'function';
}

function tryCustomFormatter(target, options, locale, context) {
  if (!isCustomFormatter(options)) {
    return null;
  }
  try {
    const { normalizedFormat } = options;
    return normalizedFormat.formatter(target, { locale, options, context }) ?? null;
  } catch (error) {
    return null;
  }
}

function qualifierPrefix(qualifiers, options, locale) {
  if (!Array.isArray(qualifiers) || qualifiers.length === 0) {
    return '';
  }
  const include = options?.normalizedFormat?.options?.includeQualifiers;
  if (include === false) {
    return '';
  }
  const displayMap = locale?.qualifierDisplay || {};
  const rendered = qualifiers
    .map((qualifier) => displayMap[qualifier] || qualifier)
    .filter((value) => typeof value === 'string' && value.trim().length > 0);
  if (rendered.length === 0) {
    return '';
  }
  return `${rendered.join(' ')} `;
}

function formatIsoValue(value) {
  if (!value) {
    return '';
  }
  if (typeof value.normalized === 'string' && value.normalized.length > 0) {
    return value.normalized;
  }
  const { year, month, day } = value;
  if (year != null && month != null && day != null) {
    return toIsoString(year, month, day);
  }
  if (year != null && month != null) {
    return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
  }
  if (year != null) {
    return String(year).padStart(4, '0');
  }
  if (month != null && day != null) {
    return `--${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  if (month != null) {
    return `--${String(month).padStart(2, '0')}`;
  }
  if (day != null) {
    return String(day).padStart(2, '0');
  }
  return '';
}

function getMonthName(locale, month, style) {
  if (!locale || !locale.monthNames || month == null) {
    return null;
  }
  const store = locale.monthNames;
  const key = store[style] ? style : 'short';
  const names = store[key];
  if (!Array.isArray(names) || names.length < month) {
    return null;
  }
  return names[month - 1];
}

function formatLocaleValue(value, options, locale) {
  if (!value) {
    return '';
  }
  const { year, month, day } = value;
  const formatOptions = options?.normalizedFormat?.options || {};
  const monthStyle = formatOptions.monthName || 'short';
  const dayFirst = formatOptions.dayFirst === true;
  const monthName = month != null ? getMonthName(locale, month, monthStyle) : null;
  const monthText = monthName ?? (month != null ? String(month).padStart(2, '0') : '');
  const dayText = day != null ? String(day).padStart(2, '0') : '';

  if (year != null && month != null && day != null) {
    if (dayFirst) {
      return `${dayText} ${monthText} ${year}`.trim();
    }
    return `${monthText} ${dayText} ${year}`.trim();
  }
  if (year != null && month != null) {
    return `${monthText} ${year}`.trim();
  }
  if (year != null) {
    return String(year);
  }
  if (month != null && day != null) {
    if (dayFirst) {
      return `${dayText} ${monthText}`.trim();
    }
    return `${monthText} ${dayText}`.trim();
  }
  if (month != null) {
    return monthText;
  }
  if (day != null) {
    return dayText;
  }
  return '';
}

function formatValueCore(value, options, locale) {
  if (!value) {
    return '';
  }
  const custom = tryCustomFormatter({ type: 'value', value }, options, locale, 'value');
  if (typeof custom === 'string') {
    return custom;
  }

  const style = options?.normalizedFormat?.style || 'iso';
  if (style === 'locale') {
    return formatLocaleValue(value, options, locale);
  }
  return formatIsoValue(value);
}

function formatValueWithQualifiers(value, qualifiers, options, locale) {
  const core = formatValueCore(value, options, locale);
  if (!core) {
    return core;
  }
  const prefix = qualifierPrefix(qualifiers || value?.qualifiers, options, locale);
  return `${prefix}${core}`.trim();
}

function resolveRangeSeparator(options, locale) {
  const custom = options?.normalizedFormat?.options?.rangeSeparator;
  if (typeof custom === 'string' && custom.length > 0) {
    return custom;
  }
  if (typeof locale?.rangeSeparator === 'string' && locale.rangeSeparator.length > 0) {
    return locale.rangeSeparator;
  }
  return DEFAULT_RANGE_SEPARATOR;
}

function formatRangeValue(range, options, locale) {
  if (!range) {
    return '';
  }
  const custom = tryCustomFormatter({ type: 'range', value: range }, options, locale, 'range');
  if (typeof custom === 'string') {
    return custom;
  }

  const startText = range.start ? formatValueWithQualifiers(range.start, range.start?.qualifiers, options, locale) : '';
  const endText = range.end ? formatValueWithQualifiers(range.end, range.end?.qualifiers, options, locale) : '';

  if (startText && endText) {
    return `${startText}${resolveRangeSeparator(options, locale)}${endText}`;
  }
  if (startText) {
    return range.inclusiveStart === false ? `after ${startText}` : `since ${startText}`;
  }
  if (endText) {
    return range.inclusiveEnd === false ? `before ${endText}` : `until ${endText}`;
  }
  return '';
}

function formatResultCore(result, options, locale) {
  if (!result) {
    return '';
  }
  const custom = tryCustomFormatter(result, options, locale, 'result');
  if (typeof custom === 'string') {
    return custom;
  }

  switch (result.kind) {
    case 'exact':
    case 'partial':
      return formatValueWithQualifiers(result.value, result.qualifiers, options, locale);
    case 'range':
      return formatRangeValue(result.value, options, locale);
    case 'ambiguous':
      return '';
    default:
      return '';
  }
}

function assignDisplayToCandidates(candidates, options, locale) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return candidates;
  }
  return candidates.map((candidate) => ({
    ...candidate,
    display: formatValueWithQualifiers(candidate, candidate?.qualifiers, options, locale)
  }));
}

export function applyFormatting(result, options, locale) {
  if (!result) {
    return result;
  }

  const display = formatResultCore(result, options, locale);
  if (display) {
    result.display = display;
  }

  if ((result.kind === 'exact' || result.kind === 'partial') && result.value) {
    result.value.display = formatValueWithQualifiers(result.value, result.qualifiers, options, locale);
  }

  if (result.kind === 'range' && result.value) {
    if (result.value.start) {
      result.value.start.display = formatValueWithQualifiers(result.value.start, result.value.start?.qualifiers, options, locale);
    }
    if (result.value.end) {
      result.value.end.display = formatValueWithQualifiers(result.value.end, result.value.end?.qualifiers, options, locale);
    }
  }

  if (result.kind === 'ambiguous' && Array.isArray(result.candidates)) {
    result.candidates = assignDisplayToCandidates(result.candidates, options, locale);
  }

  if (Array.isArray(result.alternatives)) {
    result.alternatives = assignDisplayToCandidates(result.alternatives, options, locale);
  }

  if (result.value?.start && Array.isArray(result.value.start.alternatives)) {
    result.value.start.alternatives = assignDisplayToCandidates(result.value.start.alternatives, options, locale);
  }
  if (result.value?.end && Array.isArray(result.value.end.alternatives)) {
    result.value.end.alternatives = assignDisplayToCandidates(result.value.end.alternatives, options, locale);
  }

  if (result.candidates?.start) {
    result.candidates.start = assignDisplayToCandidates(result.candidates.start, options, locale);
  }
  if (result.candidates?.end) {
    result.candidates.end = assignDisplayToCandidates(result.candidates.end, options, locale);
  }

  return result;
}

export function formatResult(result, options, locale) {
  return formatResultCore(result, options, locale);
}

export function formatValueForOptions(value, options, locale) {
  return formatValueWithQualifiers(value, value?.qualifiers, options, locale);
}

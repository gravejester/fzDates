import { ensureLocale } from '../locales/index.js';

export function toIsoString(year, month, day) {
  if (year == null) {
    return null;
  }
  const y = String(year).padStart(4, '0');
  if (month == null) {
    return y;
  }
  const m = String(month).padStart(2, '0');
  if (day == null) {
    return `${y}-${m}`;
  }
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function mergeIssues(...lists) {
  const seen = new Set();
  const merged = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const issue of list) {
      if (issue && !seen.has(issue)) {
        seen.add(issue);
        merged.push(issue);
      }
    }
  }
  return merged;
}

function collectLocaleOrders(options) {
  try {
    const locale = ensureLocale(options.locale, options.fallbackLocales);
    return locale?.dayMonthOrder || [];
  } catch (error) {
    return [];
  }
}

function buildOrderPreference(options, context) {
  const preferences = [];
  const optOrders = options?.ambiguity?.preferredOrders || [];
  for (const order of optOrders) {
    if (!preferences.includes(order)) {
      preferences.push(order);
    }
  }

  if (options?.ambiguity?.preferLocaleOrder !== false) {
    const localeOrders = context?.localeOrders || collectLocaleOrders(options);
    for (const order of localeOrders) {
      if (!preferences.includes(order)) {
        preferences.push(order);
      }
    }
  }

  for (const fallback of ['DMY', 'MDY', 'YMD']) {
    if (!preferences.includes(fallback)) {
      preferences.push(fallback);
    }
  }

  return preferences;
}

export function resolveAmbiguity(candidates, options, context = {}) {
  const entries = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (entries.length === 0) {
    return {
      type: 'none',
      issues: ['ambiguity-no-candidates']
    };
  }

  if (entries.length === 1) {
    return {
      type: 'single',
      candidate: entries[0],
      issues: entries[0].issues || []
    };
  }

  const strategy = options?.ambiguity?.strategy || 'all';
  const combinedIssues = mergeIssues(entries.flatMap((entry) => entry.issues || []));

  if (strategy === 'all') {
    return {
      type: 'ambiguous',
      candidates: entries,
      issues: mergeIssues(combinedIssues, ['ambiguous-order'])
    };
  }

  let chosen = null;
  if (strategy === 'prefer-order') {
    const preferences = buildOrderPreference(options, context);
    chosen = entries.find((entry) => {
      const order = entry.meta?.order;
      return order && preferences.includes(order);
    });
  }

  if (!chosen) {
    chosen = entries[0];
  }

  const extraIssues = strategy === 'prefer-order'
    ? ['ambiguity-auto-resolved']
    : [];

  return {
    type: 'single',
    candidate: chosen,
    alternateCandidates: entries,
    issues: mergeIssues(combinedIssues, extraIssues)
  };
}

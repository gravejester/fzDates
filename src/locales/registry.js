const localeRegistry = new Map();

const DEFAULT_DAY_MONTH_ORDER = ['DMY', 'MDY'];
const DEFAULT_RANGE_SEPARATOR = ' – ';

function normalizeToken(token) {
  return token.trim().toLowerCase();
}

function clonePreparedLocale(prepared, idOverride) {
  if (!prepared) {
    return {
      id: idOverride,
      monthTokens: new Map(),
      qualifierTokens: new Map(),
      rangeMarkerTokens: new Map(),
      noiseTokens: new Set(),
      aliases: new Map(),
      ordinalSuffixes: [],
      dayMonthOrder: DEFAULT_DAY_MONTH_ORDER.slice(),
      monthNames: { long: [], short: [], numeric: [] },
      qualifierDisplay: {},
      rangeSeparator: DEFAULT_RANGE_SEPARATOR
    };
  }

  return {
    id: idOverride ?? prepared.id,
    monthTokens: new Map(prepared.monthTokens),
    qualifierTokens: new Map(prepared.qualifierTokens),
    rangeMarkerTokens: new Map(prepared.rangeMarkerTokens),
    noiseTokens: new Set(prepared.noiseTokens),
    aliases: new Map(prepared.aliases),
    ordinalSuffixes: prepared.ordinalSuffixes.slice(),
    dayMonthOrder: prepared.dayMonthOrder.slice(),
    monthNames: {
      long: prepared.monthNames.long.slice(),
      short: prepared.monthNames.short.slice(),
      numeric: prepared.monthNames.numeric.slice()
    },
    qualifierDisplay: { ...prepared.qualifierDisplay },
    rangeSeparator: prepared.rangeSeparator
  };
}

function applyPackToPrepared(base, localePack) {
  for (const [token, value] of Object.entries(localePack.monthLookup || {})) {
    base.monthTokens.set(normalizeToken(token), value);
  }

  for (const [name, tokens] of Object.entries(localePack.qualifiers || {})) {
    for (const token of tokens) {
      const normalized = normalizeToken(token);
      base.qualifierTokens.set(normalized, { name, token: normalized });
    }
  }

  for (const [role, tokens] of Object.entries(localePack.rangeMarkers || {})) {
    for (const token of tokens) {
      const normalized = normalizeToken(token);
      base.rangeMarkerTokens.set(normalized, { role, token: normalized });
    }
  }

  for (const token of localePack.noiseTokens || []) {
    base.noiseTokens.add(normalizeToken(token));
  }

  for (const [alias, canonical] of Object.entries(localePack.aliases || {})) {
    base.aliases.set(normalizeToken(alias), normalizeToken(canonical));
  }

  if (Array.isArray(localePack.ordinalSuffixes)) {
    base.ordinalSuffixes = localePack.ordinalSuffixes.map(normalizeToken);
  }

  if (Array.isArray(localePack.dayMonthOrder) && localePack.dayMonthOrder.length > 0) {
    base.dayMonthOrder = localePack.dayMonthOrder.slice();
  }

  if (localePack.monthNames) {
    if (Array.isArray(localePack.monthNames.long)) {
      base.monthNames.long = localePack.monthNames.long.slice();
    }
    if (Array.isArray(localePack.monthNames.short)) {
      base.monthNames.short = localePack.monthNames.short.slice();
    }
    if (Array.isArray(localePack.monthNames.numeric)) {
      base.monthNames.numeric = localePack.monthNames.numeric.slice();
    }
  }

  if (localePack.qualifierDisplay) {
    for (const [name, display] of Object.entries(localePack.qualifierDisplay)) {
      base.qualifierDisplay[name] = display;
    }
  }

  if (typeof localePack.rangeSeparator === 'string') {
    base.rangeSeparator = localePack.rangeSeparator;
  }

  return base;
}

function prepareLocalePack(localePack, existing) {
  if (!localePack || typeof localePack.id !== 'string') {
    throw new Error('Locale pack requires an id.');
  }

  const id = localePack.id.trim().toLowerCase();
  const base = clonePreparedLocale(existing, id);
  base.id = id;
  return applyPackToPrepared(base, localePack);
}

export function registerLocale(localePack) {
  const existing = localeRegistry.get((localePack?.id || '').trim().toLowerCase());
  const prepared = prepareLocalePack(localePack, existing);
  localeRegistry.set(prepared.id, prepared);
  return prepared;
}

export function getLocale(id) {
  const key = (id || '').toLowerCase();
  if (localeRegistry.has(key)) {
    return localeRegistry.get(key);
  }
  throw new Error(`Locale '${id}' is not registered.`);
}

export function ensureLocale(id, fallbackIds = []) {
  const attempts = [id, ...fallbackIds];
  for (const candidate of attempts) {
    const key = (candidate || '').toLowerCase();
    if (localeRegistry.has(key)) {
      return localeRegistry.get(key);
    }
  }
  throw new Error(`Unable to resolve locale from [${attempts.filter(Boolean).join(', ')}].`);
}

export function listLocales() {
  return Array.from(localeRegistry.keys());
}

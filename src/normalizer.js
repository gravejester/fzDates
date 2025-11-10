const SPACE_REGEX = /\s+/g;
const DASH_REGEX = /[\u2012-\u2015\u2212]/g; // various dashes
const DOT_REGEX = /[\u2024\u2027]/g; // dot-like characters
const COMMA_REGEX = /[\u201a\u201e]/g;
const NBSP_REGEX = /\u00a0/g;
const MULTISPACE_REGEX = /\s{2,}/g;

export function normalizeInput(input) {
  const original = typeof input === 'string' ? input : '';
  let normalized = original
    .replace(NBSP_REGEX, ' ')
    .replace(DASH_REGEX, '-')
    .replace(DOT_REGEX, '.')
    .replace(COMMA_REGEX, ',');

  normalized = normalized.replace(SPACE_REGEX, ' ');
  normalized = normalized.trim();
  normalized = normalized.replace(MULTISPACE_REGEX, ' ');

  const lowered = normalized.toLowerCase();

  return {
    original,
    normalized,
    lowered,
    isEmpty: normalized.length === 0
  };
}

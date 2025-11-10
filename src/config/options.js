import { DEFAULT_OPTIONS } from './default-options.js';

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeDeep(target, source) {
  const output = { ...target };
  for (const [key, value] of Object.entries(source || {})) {
    if (isPlainObject(value) && isPlainObject(output[key])) {
      output[key] = mergeDeep(output[key], value);
    } else if (Array.isArray(value)) {
      output[key] = value.slice();
    } else if (value !== undefined) {
      output[key] = value;
    }
  }
  return output;
}

export function mergeOptions(base, overrides) {
  if (!isPlainObject(overrides)) {
    return deepClone(base);
  }
  return mergeDeep(deepClone(base), overrides);
}

function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  if (isPlainObject(value)) {
    const copy = {};
    for (const [key, inner] of Object.entries(value)) {
      copy[key] = deepClone(inner);
    }
    return copy;
  }
  return value;
}

export function resolveOptions(userOptions = {}) {
  const base = deepClone(DEFAULT_OPTIONS);
  if (!isPlainObject(userOptions)) {
    return Object.freeze(base);
  }

  const merged = mergeDeep(base, userOptions);
  return Object.freeze(merged);
}

export function cloneOptions(options) {
  if (!isPlainObject(options)) {
    return resolveOptions();
  }
  return resolveOptions(options);
}

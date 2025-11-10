import { registerLocale, ensureLocale, getLocale, listLocales } from './registry.js';
import { englishLocale } from './en.js';

const DEFAULT_LOCALE_ID = 'en';

if (!listLocales().includes(DEFAULT_LOCALE_ID)) {
  registerLocale(englishLocale);
}

export { registerLocale, ensureLocale, getLocale, listLocales };
export { englishLocale };
export { DEFAULT_LOCALE_ID };

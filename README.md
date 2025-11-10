# fzDates

Fuzzy date parsing - supports exact, incomplete or ranges of dates.

## Installation

```sh
npm install fzdates
```

## Quick Start

```js
import { parseDate } from 'fzdates';

const result = parseDate('21 Sep 1978');

console.log(result.kind);       // "exact"
console.log(result.value.year); // 1978
console.log(result.display);    // "1978-09-21"
```

## Custom Parser Configuration

```js
import { createDateParser } from 'fzdates';

const parser = createDateParser({
	normalizedFormat: {
		style: 'locale',
		options: { dayFirst: true, monthName: 'long' }
	},
	ambiguity: {
		strategy: 'prefer-order',
		preferredOrders: ['DMY', 'MDY']
	},
	partial: {
		inferMissingDay: false,
		inferMissingMonth: false
	}
});

const morning = parser.parse('01/02/1900');

const range = parser.parse('between 1 jan 1980 and 5 feb 1980');
console.log(range.display);
```

Pass overrides on individual calls:

```js
const alternate = parser.parse('21 Sep 1978', {
	normalizedFormat: {
		style: 'locale',
		options: { dayFirst: false, rangeSeparator: ' .. ' }
	}
});
```

## Locale Registration

Register additional locales or extend the defaults by calling `registerLocale` before parsing.

```js
import { registerLocale, createDateParser, englishLocale } from 'fzdates';

registerLocale(englishLocale);
registerLocale({
	id: 'fr',
	monthLookup: {
		janvier: 1,
		janv: 1
	},
	monthNames: {
		short: ['Janv', 'Fev', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sept', 'Oct', 'Nov', 'Dec']
	},
	qualifiers: {
		approximate: ['vers', 'ca']
	},
	qualifierDisplay: {
		approximate: 'ca'
	}
});

const parser = createDateParser({ locale: 'fr', fallbackLocales: ['en'] });
const resultat = parser.parse('vers 12 mars 1890');
console.log(resultat.display); // "ca 12 Mars 1890"
```

## Examples

Vanilla JavaScript demo included:

```sh
cd examples/vanilla
npm install
npm run dev
```

## Scripts

- `npm run build` – produce both ESM and CommonJS outputs into `dist/`.
- `npm test` – run the test suite via [uvu](https://github.com/lukeed/uvu).
- `npm run clean` – remove build artifacts.

## NOTE

This project is realized with the use of AI.
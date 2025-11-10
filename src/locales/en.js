const monthEntries = {
  january: 1,
  jan: 1,
  'jan.': 1,
  february: 2,
  feb: 2,
  'feb.': 2,
  march: 3,
  mar: 3,
  'mar.': 3,
  april: 4,
  apr: 4,
  'apr.': 4,
  may: 5,
  june: 6,
  jun: 6,
  'jun.': 6,
  july: 7,
  jul: 7,
  'jul.': 7,
  august: 8,
  aug: 8,
  'aug.': 8,
  september: 9,
  sept: 9,
  sep: 9,
  'sep.': 9,
  'sept.': 9,
  october: 10,
  oct: 10,
  'oct.': 10,
  november: 11,
  nov: 11,
  'nov.': 11,
  december: 12,
  dec: 12,
  'dec.': 12
};

const qualifiers = {
  approximate: ['ca', 'circa', 'abt', 'about', '~', 'c.'],
  before: ['before', 'bef', 'prior'],
  after: ['after', 'aft', 'post'],
  calculated: ['calc', 'calculated'],
  estimated: ['est', 'estimated']
};

const rangeMarkers = {
  boundedStart: ['between', 'from'],
  boundedJoin: ['and', 'to', 'through', 'thru'],
  boundedEnd: ['and', 'to', 'through', 'thru'],
  openStart: ['after', 'since'],
  openEnd: ['before', 'until', 'till']
};

const monthNames = {
  long: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ],
  short: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec'
  ],
  numeric: [
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08',
    '09',
    '10',
    '11',
    '12'
  ]
};

const qualifierDisplay = {
  approximate: 'ca',
  before: 'before',
  after: 'after',
  calculated: 'calc',
  estimated: 'est'
};

export const englishLocale = {
  id: 'en',
  monthLookup: monthEntries,
  qualifiers,
  rangeMarkers,
  noiseTokens: [','],
  ordinalSuffixes: ['st', 'nd', 'rd', 'th'],
  dayMonthOrder: ['DMY', 'MDY'],
  aliases: {
    circa: 'ca',
    approx: 'ca'
  },
  monthNames,
  qualifierDisplay,
  rangeSeparator: ' – '
};

export default englishLocale;

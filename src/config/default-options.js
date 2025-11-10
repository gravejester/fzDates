export const DEFAULT_OPTIONS = {
  locale: 'en',
  fallbackLocales: ['en'],
  normalizedFormat: {
    style: 'iso',
    formatter: null,
    options: {
      dayFirst: false,
      monthName: 'short',
      includeQualifiers: true
    }
  },
  ambiguity: {
    strategy: 'all',
    preferredOrders: ['DMY', 'MDY'],
    preferLocaleOrder: true
  },
  partial: {
    inferMissingDay: false,
    inferMissingMonth: false,
    allowTwoDigitYears: true
  },
  ranges: {
    openRangeStrategy: 'allow',
    defaultInclusivity: { start: true, end: true }
  },
  issues: {
    suppress: [],
    escalate: []
  }
};

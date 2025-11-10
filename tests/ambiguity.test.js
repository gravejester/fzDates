import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { parseDate, createDateParser } from '../src/index.js';

test('default ambiguity strategy returns ambiguous result for slash dates', () => {
  const result = parseDate('01/02/1900');
  assert.is(result.kind, 'ambiguous');
  assert.ok(Array.isArray(result.candidates));
  assert.ok(result.candidates.length >= 2);
  const normalized = result.candidates.map((candidate) => candidate.normalized);
  assert.ok(normalized.includes('1900-02-01'));
  assert.ok(normalized.includes('1900-01-02'));
});

test('strategy "first" resolves to first candidate without altering base parser options', () => {
  const parser = createDateParser({
    ambiguity: {
      strategy: 'first'
    }
  });

  const result = parser.parse('01/02/1900');
  assert.is(result.kind, 'exact');
  assert.is(result.normalized, '1900-02-01');
  assert.ok(result.issues.includes('ambiguous-order'));
  assert.ok(Array.isArray(result.alternatives));
  assert.ok(result.alternatives.length >= 2);

  const defaultResult = parser.parse('21 Sep 1978');
  assert.is(defaultResult.kind, 'exact');
  assert.is(defaultResult.normalized, '1978-09-21');
});

test('strategy "prefer-order" honors preferredOrders and records auto-resolution issue', () => {
  const parser = createDateParser({
    ambiguity: {
      strategy: 'prefer-order',
      preferredOrders: ['MDY']
    }
  });

  const result = parser.parse('01/02/1900');
  assert.is(result.kind, 'exact');
  assert.is(result.normalized, '1900-01-02');
  assert.ok(result.issues.includes('ambiguity-auto-resolved'));
  assert.ok(Array.isArray(result.alternatives));
  assert.ok(result.alternatives.length >= 2);
});

test.run();

import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { parseDate } from '../src/index.js';

const sampleInputs = [
  '21 Sep 1978',
  'January 2000',
  'between 1 jan 1900 and 5 feb 1900',
  '01/02/1900',
  'before 1899',
  'after circa 1900',
  '1978-09-21',
  'foo bar',
  '   ',
  '',
  'abt 1870',
  '1900-1905',
  'Dec 9999'
];

test('bulk parsing smoke test does not throw', () => {
  const results = sampleInputs.map((input) => {
    try {
      return parseDate(input);
    } catch (error) {
      assert.unreachable(`parseDate threw for input "${input}": ${error.message}`);
    }
  });

  assert.is(results.length, sampleInputs.length);
  results.forEach((result) => {
    assert.ok(result && typeof result === 'object');
  });
});

test.run();

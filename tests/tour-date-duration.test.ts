import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { calculateTourDuration } from '@/lib/tour-design/tour-durations';

test('calculates inclusive tour days and nights from start and end dates', () => {
  assert.deepEqual(calculateTourDuration('2026-10-10', '2026-10-16'), {
    days: 7,
    nights: 6,
    label: '7 Days 6 Nights',
  });
  assert.deepEqual(calculateTourDuration('2028-02-28', '2028-03-01'), {
    days: 3,
    nights: 2,
    label: '3 Days 2 Nights',
  });
  assert.deepEqual(calculateTourDuration('2026-10-10', '2026-10-10'), {
    days: 1,
    nights: 0,
    label: '1 Day 0 Nights',
  });
});

test('does not calculate a duration for missing, malformed, or reversed dates', () => {
  assert.equal(calculateTourDuration('', '2026-10-16'), null);
  assert.equal(calculateTourDuration('2026-02-30', '2026-03-01'), null);
  assert.equal(calculateTourDuration('2026-10-16', '2026-10-10'), null);
});

test('Client Brief replaces manual Duration with paired dates and derived output', () => {
  const source = readFileSync(join(process.cwd(), 'components/tour-design/ClientBriefStep.tsx'), 'utf8');

  assert.match(source, /calculateTourDuration/);
  assert.match(source, /brief\.startDate/);
  assert.match(source, /brief\.endDate/);
  assert.match(source, /briefEndDate/);
  assert.match(source, /briefTravelDates/);
  assert.doesNotMatch(source, /DURATION_PRESETS/);
  assert.doesNotMatch(source, /td-duration-list/);
});

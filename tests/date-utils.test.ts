import test from 'node:test';
import assert from 'node:assert/strict';
import {
  daysAgoIso,
  localIsoDate,
  localTodayIso,
  mondayWeekRange,
  weekDaysFromMonday,
} from '../lib/date-utils';

test('localIsoDate formats YYYY-MM-DD', () => {
  const d = new Date('2026-07-03T15:00:00+07:00');
  assert.equal(localIsoDate(d, 'Asia/Ho_Chi_Minh'), '2026-07-03');
});

test('mondayWeekRange returns Mon–Sun for a Wednesday', () => {
  const range = mondayWeekRange('2026-07-08');
  assert.equal(range.start, '2026-07-06');
  assert.equal(range.end, '2026-07-12');
});

test('mondayWeekRange for Sunday starts previous Monday', () => {
  const range = mondayWeekRange('2026-07-12');
  assert.equal(range.start, '2026-07-06');
  assert.equal(range.end, '2026-07-12');
});

test('weekDaysFromMonday returns 7 days', () => {
  const days = weekDaysFromMonday('2026-07-08');
  assert.equal(days.length, 7);
  assert.equal(days[0], '2026-07-06');
  assert.equal(days[6], '2026-07-12');
});

test('daysAgoIso subtracts days', () => {
  assert.equal(daysAgoIso('2026-07-10', 3), '2026-07-07');
});

test('localTodayIso returns a valid ISO date string', () => {
  const today = localTodayIso();
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToIsoDate,
  createOutlineDay,
  nextOutlineDateFromRows,
} from '../lib/tour-draft-utils';
import type { TourOutlineDay } from '../lib/types';

function row(dayNumber: number, date: string): TourOutlineDay {
  return {
    id: `ol-${dayNumber}`,
    draftId: 'TD-LD-1',
    dayNumber,
    date,
    activities: '',
    sortOrder: dayNumber,
  };
}

describe('outline date helpers', () => {
  it('addDaysToIsoDate increments by one day', () => {
    assert.equal(addDaysToIsoDate('2026-10-05', 1), '2026-10-06');
    assert.equal(addDaysToIsoDate('2026-10-31', 1), '2026-11-01');
  });

  it('nextOutlineDateFromRows uses brief start date for first day', () => {
    assert.equal(nextOutlineDateFromRows([], '2026-10-05'), '2026-10-05');
    assert.equal(nextOutlineDateFromRows([], ''), '');
  });

  it('nextOutlineDateFromRows adds one day after latest dated row', () => {
    const rows = [row(1, '2026-10-05'), row(2, '2026-10-06')];
    assert.equal(nextOutlineDateFromRows(rows), '2026-10-07');
  });

  it('nextOutlineDateFromRows skips rows without dates', () => {
    const rows = [row(1, '2026-10-05'), row(2, '2026-10-06'), row(3, '')];
    assert.equal(nextOutlineDateFromRows(rows), '2026-10-07');
  });

  it('createOutlineDay auto-fills date when adding days', () => {
    const first = createOutlineDay('TD-LD-1', [], '2026-10-05');
    assert.equal(first.dayNumber, 1);
    assert.equal(first.date, '2026-10-05');

    const second = createOutlineDay('TD-LD-1', [first]);
    assert.equal(second.dayNumber, 2);
    assert.equal(second.date, '2026-10-06');

    const third = createOutlineDay('TD-LD-1', [first, second]);
    assert.equal(third.dayNumber, 3);
    assert.equal(third.date, '2026-10-07');
  });
});

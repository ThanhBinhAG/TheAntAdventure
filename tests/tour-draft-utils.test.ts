import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysToIsoDate,
  briefFromDraft,
  buildTourDraft,
  createOutlineDay,
  mergeProposalExportStateIntoBriefJson,
  nextOutlineDateFromRows,
  PROPOSAL_HOTEL_RATES_KEY,
  PROPOSAL_SPECIAL_NOTES_KEY,
  PROPOSAL_TEMPLATE_OVERRIDES_KEY,
  resolveProposalExportState,
} from '../lib/tour-design/tour-draft-utils';
import { DEFAULT_TOUR_BRIEF } from '../lib/tour-design/tour-design-types';
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

describe('proposal export persist in brief_json', () => {
  it('round-trips template overrides, special notes, and hotel rates', () => {
    const draft = buildTourDraft({
      leadId: 'LD-1',
      custId: 'CU-1',
      brief: { ...DEFAULT_TOUR_BRIEF, clientName: 'Ada' },
      outlineStatus: 'draft',
      selectedCodes: [],
      selectedPackageId: null,
      markupPct: 30,
      clientType: 'b2c',
      currentStep: 4,
      proposalExport: {
        templateOverrides: { tagline: 'Custom tagline', inclusions: ['Guide'] },
        specialNotes: 'Vegetarian meals',
        hotelRates: {
          optionA: [
            {
              id: 'h1',
              hotelName: 'Hotel A',
              location: 'Hanoi',
              stayFrom: '2027-03-01',
              stayTo: '2027-03-03',
              roomType: 'Deluxe',
              nights: 2,
              ratePerNight: 100,
            },
          ],
          optionB: [],
          seedKey: 'seed-1',
        },
      },
    });

    assert.ok(draft.briefJson?.[PROPOSAL_TEMPLATE_OVERRIDES_KEY]);
    assert.equal(draft.briefJson?.[PROPOSAL_SPECIAL_NOTES_KEY], 'Vegetarian meals');
    assert.ok(draft.briefJson?.[PROPOSAL_HOTEL_RATES_KEY]);

    const resolved = resolveProposalExportState(draft);
    assert.equal(resolved.templateOverrides?.tagline, 'Custom tagline');
    assert.deepEqual(resolved.templateOverrides?.inclusions, ['Guide']);
    assert.equal(resolved.specialNotes, 'Vegetarian meals');
    assert.equal(resolved.hotelRates?.optionA[0]?.hotelName, 'Hotel A');
    assert.equal(resolved.hotelRates?.seedKey, 'seed-1');

    const briefOnly = briefFromDraft(draft);
    assert.equal(briefOnly?.clientName, 'Ada');
    assert.equal((briefOnly as Record<string, unknown>)?.[PROPOSAL_TEMPLATE_OVERRIDES_KEY], undefined);
    assert.equal((briefOnly as Record<string, unknown>)?.[PROPOSAL_SPECIAL_NOTES_KEY], undefined);
  });

  it('clears empty proposal export keys from brief_json', () => {
    const merged = mergeProposalExportStateIntoBriefJson(
      { clientName: 'Ada', [PROPOSAL_SPECIAL_NOTES_KEY]: 'old' },
      { templateOverrides: {}, specialNotes: '  ', hotelRates: { optionA: [], optionB: [] } }
    );
    assert.equal(merged[PROPOSAL_TEMPLATE_OVERRIDES_KEY], undefined);
    assert.equal(merged[PROPOSAL_SPECIAL_NOTES_KEY], undefined);
    assert.equal(merged[PROPOSAL_HOTEL_RATES_KEY], undefined);
    assert.equal(merged.clientName, 'Ada');
  });
});

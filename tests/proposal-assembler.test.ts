import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assembleProposalDoc,
  extractHotelBlocksFromOutline,
  generateQuoteRef,
} from '../lib/proposal-assembler';
import { DEFAULT_TOUR_BRIEF } from '../lib/tour-design-types';
import type { TourOutlineDay } from '../lib/types';

const brief = {
  ...DEFAULT_TOUR_BRIEF,
  clientName: 'James Miller',
  pax: 2,
  startDate: '2027-03-01',
  travelMonth: 'Mar',
  duration: '10 Days 9 Nights',
  hotelTier: '4★ Boutique Properties',
  nationality: 'Australian',
  salesperson: 'Tai Pham',
};

describe('proposal-assembler', () => {
  it('generateQuoteRef uses lead id suffix', () => {
    assert.equal(generateQuoteRef('LD-001'), `TAD-${new Date().getFullYear()}-001`);
  });

  it('B2C doc has group pricing from package when no product codes', () => {
    const doc = assembleProposalDoc({
      brief,
      clientType: 'b2c',
      customerName: 'James Miller',
      outlineRows: [],
      products: [],
      selectedCodes: [],
      selectedPackageId: 'PKG-01',
      markupPct: 30,
      leadId: 'LD-001',
    });
    assert.equal(doc.variant, 'b2c');
    assert.equal(doc.pricing.kind, 'b2c');
    if (doc.pricing.kind === 'b2c') {
      assert.ok(doc.pricing.perPerson > 0);
      assert.equal(doc.pricing.groupTotal, doc.pricing.perPerson * 2);
    }
  });

  it('B2B doc splits tourings and flights totals', () => {
    const doc = assembleProposalDoc({
      brief,
      clientType: 'b2b',
      customerName: 'Agent Co',
      outlineRows: [],
      products: [],
      selectedCodes: [],
      selectedPackageId: 'PKG-01',
      markupPct: 30,
      hotelRates: [
        {
          id: 'h1',
          hotelName: 'La Siesta',
          location: 'Hanoi',
          stayFrom: '01 Mar 2027',
          stayTo: '03 Mar 2027',
          roomType: 'Superior Double',
          nights: 2,
          ratePerNight: 120,
        },
      ],
    });
    assert.equal(doc.variant, 'b2b');
    assert.equal(doc.pricing.kind, 'b2b');
    if (doc.pricing.kind === 'b2b') {
      assert.ok(doc.pricing.touringsTotal >= 0);
      assert.equal(doc.pricing.hotelsTotal, 240);
    }
  });

  it('prefers outline rows over package for itinerary', () => {
    const rows: TourOutlineDay[] = [
      {
        id: 'd1',
        draftId: 'TD-1',
        dayNumber: 1,
        date: '2027-03-01',
        location: 'Ha Noi',
        activities: 'Arrival and welcome',
        hotels: 'La Siesta Classic',
      },
    ];
    const doc = assembleProposalDoc({
      brief,
      clientType: 'b2c',
      customerName: 'Guest',
      outlineRows: rows,
      products: [],
      selectedCodes: [],
      selectedPackageId: 'PKG-01',
      markupPct: 30,
    });
    assert.equal(doc.itineraryGlance.length, 1);
    assert.equal(doc.itineraryGlance[0].destination, 'Ha Noi');
    assert.equal(doc.itineraryGlance[0].theme, 'Arrival and welcome');
  });

  it('extractHotelBlocksFromOutline groups consecutive nights', () => {
    const rows: TourOutlineDay[] = [
      { id: '1', draftId: 'TD', dayNumber: 1, date: '2027-03-01', hotels: 'Hotel A', location: 'Hue' },
      { id: '2', draftId: 'TD', dayNumber: 2, date: '2027-03-02', hotels: 'Hotel A', location: 'Hue' },
      { id: '3', draftId: 'TD', dayNumber: 3, date: '2027-03-03', hotels: 'Hotel B', location: 'Hoi An' },
    ];
    const blocks = extractHotelBlocksFromOutline(brief, rows);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].nights, 2);
    assert.equal(blocks[0].hotelName, 'Hotel A');
    assert.equal(blocks[1].hotelName, 'Hotel B');
  });

  it('travel date range uses start and end from outline day count', () => {
    const rows: TourOutlineDay[] = Array.from({ length: 10 }, (_, i) => ({
      id: `d${i}`,
      draftId: 'TD',
      dayNumber: i + 1,
      date: `2027-03-${String(i + 1).padStart(2, '0')}`,
      location: 'Vietnam',
      activities: `Day ${i + 1}`,
      hotels: 'Test Hotel',
    }));
    const doc = assembleProposalDoc({
      brief,
      clientType: 'b2c',
      customerName: 'Guest',
      outlineRows: rows,
      products: [],
      selectedCodes: [],
      selectedPackageId: null,
      markupPct: 30,
    });
    assert.match(doc.travelDateRange, /March 2027/);
    assert.equal(doc.days.length, 10);
  });
});

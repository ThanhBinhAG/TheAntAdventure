import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assembleProposalDoc,
  extractHotelBlocksFromOutline,
  generateQuoteRef,
  seedOptionBHotelRates,
} from '../lib/proposals/proposal-assembler';
import { buildProposalHTML } from '../lib/proposals/proposal-html';
import { DEFAULT_TOUR_BRIEF } from '../lib/tour-design/tour-design-types';
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

const SAMPLE_GALLERY = [
  { id: 'PH-N1', caption: 'Hanoi Old Quarter morning', region: 'north', url: 'https://cdn.example/n1.jpg' },
  { id: 'PH-N2', caption: 'Halong Bay cruise dawn', region: 'north', url: 'https://cdn.example/n2.jpg' },
  { id: 'PH-N3', caption: 'Ninh Binh river boat', region: 'north', url: 'https://cdn.example/n3.jpg' },
  { id: 'PH-N4', caption: 'Sapa rice terraces trek', region: 'north', url: 'https://cdn.example/n4.jpg' },
  { id: 'PH-C1', caption: 'Hoi An lantern night', region: 'central', url: 'https://cdn.example/c1.jpg' },
  { id: 'PH-C2', caption: 'Hue citadel history', region: 'central', url: 'https://cdn.example/c2.jpg' },
  { id: 'PH-S1', caption: 'Mekong floating market', region: 'south', url: 'https://cdn.example/s1.jpg' },
  { id: 'PH-S2', caption: 'Saigon skyline dusk', region: 'south', url: 'https://cdn.example/s2.jpg' },
];

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

  it('B2B doc splits tourings and dual hotel option totals', () => {
    const optionA = [
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
    ];
    const optionB = [
      {
        id: 'optb-h1',
        hotelName: 'Sofitel Metropole',
        location: 'Hanoi',
        stayFrom: '01 Mar 2027',
        stayTo: '03 Mar 2027',
        roomType: 'Deluxe Double',
        nights: 2,
        ratePerNight: 350,
      },
    ];
    const doc = assembleProposalDoc({
      brief,
      clientType: 'b2b',
      customerName: 'Agent Co',
      outlineRows: [],
      products: [],
      selectedCodes: [],
      selectedPackageId: 'PKG-01',
      markupPct: 30,
      hotelRatesOptionA: optionA,
      hotelRatesOptionB: optionB,
    });
    assert.equal(doc.variant, 'b2b');
    assert.equal(doc.pricing.kind, 'b2b');
    if (doc.pricing.kind === 'b2b') {
      assert.ok(doc.pricing.touringsTotal >= 0);
      assert.equal(doc.pricing.hotelsTotalOptionA, 240);
      assert.equal(doc.pricing.hotelsTotalOptionB, 700);
      assert.equal(doc.pricing.hotelRatesOptionB[0].hotelName, 'Sofitel Metropole');
    }
    assert.equal(doc.hotelRatesOptionA.length, 1);
    assert.equal(doc.hotelRatesOptionB.length, 1);
  });

  it('seeds Option B rows parallel to Option A stays', () => {
    const optionA = [
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
    ];
    const optionB = seedOptionBHotelRates(optionA, [
      {
        id: 'HT-1',
        name: 'Sofitel Legend Metropole',
        dest: 'Hanoi',
        cat: 'Luxury',
        stars: '5',
        region: 'north',
        rooms: [],
      },
    ]);
    assert.equal(optionB.length, 1);
    assert.equal(optionB[0].nights, 2);
    assert.equal(optionB[0].location, 'Hanoi');
    assert.equal(optionB[0].hotelName, 'Sofitel Legend Metropole');
    assert.equal(optionB[0].ratePerNight, 0);
  });

  it('attaches imageUrls to detailed program days', () => {
    const doc = assembleProposalDoc({
      brief,
      clientType: 'b2c',
      customerName: 'Guest',
      outlineRows: [],
      products: [],
      selectedCodes: [],
      selectedPackageId: 'PKG-01',
      markupPct: 30,
      galleryPhotos: SAMPLE_GALLERY,
    });
    assert.ok(doc.days.length > 0);
    assert.ok(doc.days.every((d) => Array.isArray(d.imageUrls) && d.imageUrls.length > 0));
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

  it('prefers selected products over outline for Detailed Program', () => {
    const rows: TourOutlineDay[] = [
      {
        id: 'd1',
        draftId: 'TD-1',
        dayNumber: 1,
        date: '2027-03-01',
        location: 'Ha Noi',
        activities: 'Outline-only activity title',
        hotels: 'La Siesta Classic',
      },
    ];
    const a = {
      code: 'EXP-A',
      name: 'Morning walk',
      logic: '',
      dur: 'Full Day',
      cat: 'cultural',
      dest: 'Hanoi',
      lvl: '',
      desc: 'Morning.',
      usp: '',
      price: '',
      region: 'north',
    };
    const b = { ...a, code: 'EXP-B', name: 'Afternoon cyclo', desc: 'Afternoon.' };
    const doc = assembleProposalDoc({
      brief,
      clientType: 'b2c',
      customerName: 'Guest',
      outlineRows: rows,
      products: [a, b],
      selectedCodes: ['EXP-A', 'EXP-B'],
      selectedPackageId: null,
      markupPct: 30,
      experienceOverrides: {
        'EXP-A': { durOverride: 'half', dayIndex: 1 },
        'EXP-B': { durOverride: 'half', dayIndex: 1 },
      },
    });
    assert.equal(doc.days.length, 1);
    assert.equal(doc.days[0].hotel, 'La Siesta Classic');
    assert.equal(doc.days[0].destination, 'Ha Noi');
    assert.ok(doc.days[0].segments);
    assert.equal(doc.days[0].segments!.length, 2);
    assert.equal(doc.days[0].segments![0].title, 'Morning walk');
    assert.equal(doc.days[0].segments![1].title, 'Afternoon cyclo');
    assert.doesNotMatch(doc.days[0].title, /Outline-only/);
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

  it('B2B HTML includes Option B hotels and Brief Itinerary at a Glance', () => {
    const doc = assembleProposalDoc({
      brief,
      clientType: 'b2b',
      customerName: 'Agent Co',
      outlineRows: [
        {
          id: 'd1',
          draftId: 'TD',
          dayNumber: 1,
          date: '2027-03-01',
          location: 'Ha Noi',
          activities: 'Arrival',
          hotels: 'La Siesta',
        },
      ],
      products: [],
      selectedCodes: [],
      selectedPackageId: null,
      markupPct: 30,
      hotelRatesOptionA: [
        {
          id: 'h1',
          hotelName: 'La Siesta',
          location: 'Ha Noi',
          stayFrom: '01 Mar 2027',
          stayTo: '02 Mar 2027',
          roomType: 'Superior',
          nights: 1,
          ratePerNight: 100,
        },
      ],
      hotelRatesOptionB: [
        {
          id: 'optb-h1',
          hotelName: 'Sofitel',
          location: 'Ha Noi',
          stayFrom: '01 Mar 2027',
          stayTo: '02 Mar 2027',
          roomType: 'Deluxe',
          nights: 1,
          ratePerNight: 300,
        },
      ],
    });
    const html = buildProposalHTML(doc, 'https://example.com');
    assert.match(html, /INCLUSIONS/);
    assert.match(html, /EXCLUSIONS/);
    assert.match(html, /background:#545454/);
    assert.match(html, /OPTION B/);
    assert.match(html, /#8B6913/);
    assert.match(html, /#4A6FA5/);
    assert.match(html, /Sofitel/);
    assert.match(html, /Detailed Program/);
    assert.match(html, /Day 1/);
    assert.match(html, /background:#E8F5EE/);
    assert.match(html, /border:1px solid #E2E8E4/);
    assert.match(html, /table-layout:fixed/);
    assert.match(html, /border-spacing:0/);
    assert.match(html, /<title><\/title>/);
  });

  it('inline layout keeps horizontal photo grid', () => {
    const doc = assembleProposalDoc({
      brief,
      clientType: 'b2c',
      customerName: 'Guest',
      outlineRows: [],
      products: [],
      selectedCodes: [],
      selectedPackageId: 'PKG-01',
      markupPct: 30,
      detailedProgramLayout: 'inline',
      galleryPhotos: SAMPLE_GALLERY,
    });
    assert.equal(doc.detailedProgramLayout, 'inline');
    const html = buildProposalHTML(doc, 'https://example.com');
    assert.match(html, /grid-template-columns:repeat/);
    assert.doesNotMatch(html, /background:#E8F5EE/);
  });

  it('applies experienceOverrides desc, date, and clientNote on product path', () => {
    const product = {
      code: 'EXP-TEST',
      name: 'Hanoi City Walk',
      logic: '',
      dur: 'Full Day',
      cat: 'cultural',
      dest: 'Hanoi',
      lvl: '',
      desc: 'Catalog description of the walk.',
      usp: '',
      price: '',
      region: 'north',
    };
    const doc = assembleProposalDoc({
      brief,
      clientType: 'b2c',
      customerName: 'James Miller',
      outlineRows: [],
      products: [product],
      selectedCodes: ['EXP-TEST'],
      selectedPackageId: null,
      markupPct: 30,
      experienceOverrides: {
        'EXP-TEST': {
          desc: 'Custom client-facing description.',
          date: '2027-03-05',
          clientNote: 'Meet at hotel lobby 8:00am.',
        },
      },
    });
    assert.ok(doc.days.length >= 1);
    assert.match(doc.days[0].dateLabel, /5 Mar 2027|Thu, 5 Mar 2027/);
    assert.match(doc.days[0].body, /Custom client-facing description/);
    assert.match(doc.days[0].body, /Note: Meet at hotel lobby 8:00am/);
    assert.doesNotMatch(doc.days[0].body, /Catalog description/);
  });

  it('packs two half-overridden full days and uses dayIndex for label', () => {
    const a = {
      code: 'EXP-A',
      name: 'Morning walk',
      logic: '',
      dur: 'Full Day',
      cat: 'cultural',
      dest: 'Hanoi',
      lvl: '',
      desc: 'Morning.',
      usp: '',
      price: '',
      region: 'north',
      photoIds: ['PH-N1', 'PH-N2'],
      linkedPhotoIds: ['PH-N1', 'PH-N2'],
    };
    const b = {
      ...a,
      code: 'EXP-B',
      name: 'Afternoon cyclo',
      desc: 'Afternoon.',
      photoIds: ['PH-N3', 'PH-N4'],
      linkedPhotoIds: ['PH-N3', 'PH-N4'],
    };
    const doc = assembleProposalDoc({
      brief,
      clientType: 'b2c',
      customerName: 'James Miller',
      outlineRows: [],
      products: [a, b],
      selectedCodes: ['EXP-A', 'EXP-B'],
      selectedPackageId: null,
      markupPct: 30,
      galleryPhotos: SAMPLE_GALLERY,
      experienceOverrides: {
        'EXP-A': { durOverride: 'half', dayIndex: 1, date: '2027-03-01' },
        'EXP-B': { durOverride: 'half', dayIndex: 1 },
      },
    });
    assert.equal(doc.days.length, 1);
    assert.match(doc.days[0].dateLabel, /1 Mar 2027|Mon, 1 Mar 2027/);
    assert.match(doc.days[0].title, /Morning walk/);
    assert.match(doc.days[0].title, /Afternoon cyclo/);
    assert.ok(doc.days[0].segments);
    assert.equal(doc.days[0].segments!.length, 2);
    assert.equal(doc.days[0].segments![0].title, 'Morning walk');
    assert.equal(doc.days[0].segments![1].title, 'Afternoon cyclo');
    assert.match(doc.days[0].segments![0].body, /Morning/);
    assert.match(doc.days[0].segments![1].body, /Afternoon/);
    assert.ok(doc.days[0].segments![0].imageUrls.length >= 2);
    assert.ok(doc.days[0].segments![1].imageUrls.length >= 2);
    assert.notEqual(
      doc.days[0].segments![0].imageUrls[0],
      doc.days[0].segments![1].imageUrls[0]
    );

    const html = buildProposalHTML(doc, 'https://example.com');
    assert.match(html, /Morning walk/);
    assert.match(html, /Afternoon cyclo/);
    const morningIdx = html.indexOf('Morning walk');
    const afternoonIdx = html.indexOf('Afternoon cyclo');
    assert.ok(morningIdx > 0 && afternoonIdx > morningIdx);
    const dayBlockIdx = html.indexOf('DAY 1 |');
    const nextDayIdx = html.indexOf('DAY 2 |');
    const scoped =
      dayBlockIdx >= 0
        ? html.slice(dayBlockIdx, nextDayIdx > dayBlockIdx ? nextDayIdx : undefined)
        : html;
    const imageCount = (scoped.match(/<img\b/g) || []).length;
    assert.ok(imageCount >= 4);
    assert.doesNotMatch(scoped, /grid-template-columns:repeat\(2,1fr\)/);
    const sidebarPanels = scoped.match(/background:#E8F5EE/g) || [];
    assert.ok(sidebarPanels.length >= 2);
    assert.match(html, /proposal-day--segments/);
    assert.match(html, /proposal-segment-row/);
    assert.match(html, /\.proposal-segment-row[\s\S]*break-inside:\s*avoid/);
    const segmentsBlock = scoped.match(
      /<div class="proposal-day proposal-day--segments"[^>]*>[\s\S]*?<\/div>\s*(?=<div class="proposal-day|$)/
    );
    if (segmentsBlock) {
      assert.doesNotMatch(segmentsBlock[0], /page-break-inside:\s*avoid/);
    }
  });

  it('single-day sidebar uses proposal-day--single row break guard', () => {
    const doc = assembleProposalDoc({
      brief,
      clientType: 'b2c',
      customerName: 'Guest',
      outlineRows: [
        {
          id: 'd1',
          draftId: 'TD',
          dayNumber: 1,
          date: '2027-03-01',
          location: 'Ha Noi',
          activities: 'City tour',
          hotels: 'La Siesta',
        },
      ],
      products: [],
      selectedCodes: [],
      selectedPackageId: null,
      markupPct: 30,
    });
    const html = buildProposalHTML(doc, 'https://example.com');
    assert.match(html, /proposal-day--single/);
    assert.match(html, /proposal-day-single-row/);
    assert.doesNotMatch(
      html,
      /<div class="proposal-day proposal-day--single"[^>]*style="[^"]*page-break-inside:\s*avoid/
    );
  });
});

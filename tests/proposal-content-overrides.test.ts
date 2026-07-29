import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyProposalContentOverrides,
  defaultOverviewRows,
  hasProposalContentOverrides,
} from '../lib/proposals/proposal-content-overrides';
import { buildProposalHTML } from '../lib/proposals/proposal-html';
import { assembleProposalDoc } from '../lib/proposals/proposal-assembler';
import { DEFAULT_TOUR_BRIEF } from '../lib/tour-design/tour-design-types';

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

function baseDoc() {
  return assembleProposalDoc({
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
}

describe('proposal-content-overrides', () => {
  it('merges tourTitle and day body by dayNumber', () => {
    const doc = baseDoc();
    const dayNumber = doc.days[0]?.dayNumber ?? 1;
    const merged = applyProposalContentOverrides(doc, {
      tourTitle: 'Custom Vietnam Journey',
      days: [{ dayNumber, body: '<b>Luxury</b> day narrative' }],
    });
    assert.equal(merged.tourTitle, 'Custom Vietnam Journey');
    const day = merged.days.find((d) => d.dayNumber === dayNumber);
    assert.ok(day);
    assert.equal(day!.body, '<b>Luxury</b> day narrative');
  });

  it('applies overview row overrides', () => {
    const doc = baseDoc();
    const rows = defaultOverviewRows(doc);
    rows[0] = { label: 'Duration', optionA: '12 Days', optionB: '12 Days' };
    const merged = applyProposalContentOverrides(doc, { overviewRows: rows });
    assert.equal(merged.overviewRows?.[0].optionA, '12 Days');
    const html = buildProposalHTML(merged);
    assert.match(html, /12 Days/);
  });

  it('renders rich HTML in proposal output and strips scripts', () => {
    const doc = baseDoc();
    const merged = applyProposalContentOverrides(doc, {
      tagline: 'A <b>bold</b> tagline<script>alert(1)</script>',
    });
    const html = buildProposalHTML(merged);
    assert.match(html, /<b>bold<\/b>/);
    assert.doesNotMatch(html, /<script/i);
  });

  it('hasProposalContentOverrides detects non-empty overrides', () => {
    assert.equal(hasProposalContentOverrides({}), false);
    assert.equal(hasProposalContentOverrides({ tourTitle: 'X' }), true);
  });

  it('preserves layout classes when overrides applied', () => {
    const doc = baseDoc();
    const merged = applyProposalContentOverrides(doc, { tourTitle: 'Edited Title' });
    const html = buildProposalHTML(merged);
    assert.match(html, /INCLUSIONS/);
    assert.match(html, /EXCLUSIONS/);
    if (merged.days.some((d) => d.segments?.length)) {
      assert.match(html, /proposal-day--segments/);
    }
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { harvestOverridesFromRoot } from '../lib/proposals/proposal-editable-harvest';
import { assembleProposalDoc } from '../lib/proposals/proposal-assembler';
import { buildProposalEditableHTML, buildProposalHTML } from '../lib/proposals/proposal-html';
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

function mockField(field: string, content: string, rich = false): HTMLElement {
  return {
    getAttribute: (name: string) => {
      if (name === 'data-proposal-field') return field;
      if (name === 'data-rich') return rich ? '1' : null;
      return null;
    },
    innerHTML: content,
    textContent: content.replace(/<[^>]+>/g, ''),
  } as HTMLElement;
}

function mockRoot(fields: HTMLElement[]): ParentNode {
  return {
    querySelectorAll: (selector: string) =>
      selector === '[data-proposal-field]' ? fields : [],
  } as unknown as ParentNode;
}

describe('proposal-editable-html', () => {
  it('buildProposalEditableHTML includes contenteditable tourTitle field', () => {
    const html = buildProposalEditableHTML(baseDoc());
    assert.match(html, /data-proposal-field="tourTitle"/);
    assert.match(html, /contenteditable="true"/);
    assert.match(html, /proposal-doc-page/);
  });

  it('buildProposalHTML export has no contenteditable', () => {
    const html = buildProposalHTML(baseDoc());
    assert.doesNotMatch(html, /contenteditable/i);
    assert.doesNotMatch(html, /data-proposal-field/i);
  });

  it('harvestOverridesFromRoot reads tourTitle and rich tagline', () => {
    const doc = baseDoc();
    const harvested = harvestOverridesFromRoot(
      mockRoot([
        mockField('tourTitle', 'Custom Journey Title'),
        mockField('tagline', 'A <b>bold</b> tagline<script>x</script>', true),
      ]),
      doc
    );
    assert.equal(harvested.tourTitle, 'Custom Journey Title');
    assert.match(harvested.tagline ?? '', /<b>bold<\/b>/);
    assert.doesNotMatch(harvested.tagline ?? '', /<script/i);
  });

  it('harvestOverridesFromRoot reads day body by dayNumber', () => {
    const doc = baseDoc();
    const dayNumber = doc.days[0]?.dayNumber ?? 1;
    const harvested = harvestOverridesFromRoot(
      mockRoot([mockField(`days.${dayNumber}.body`, 'Updated day narrative', true)]),
      doc
    );
    const day = harvested.days?.find((d) => d.dayNumber === dayNumber);
    assert.ok(day);
    assert.equal(day!.body, 'Updated day narrative');
  });
});

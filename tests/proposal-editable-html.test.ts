import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { harvestOverridesFromRoot } from '../lib/proposals/proposal-editable-harvest';
import { assembleProposalDoc } from '../lib/proposals/proposal-assembler';
import { buildProposalEditableHTML, buildProposalHTML } from '../lib/proposals/proposal-html';
import { isTemplateEditPath } from '../lib/proposals/proposal-content-overrides';
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
  it('buildProposalEditableHTML marks template fields only', () => {
    const html = buildProposalEditableHTML(baseDoc());
    assert.match(html, /data-proposal-field="tagline"/);
    assert.match(html, /data-proposal-field="inclusions\.0"/);
    assert.match(html, /contenteditable="true"/);
    assert.match(html, /proposal-doc-page/);
    assert.doesNotMatch(html, /data-proposal-field="tourTitle"/);
    assert.doesNotMatch(html, /data-proposal-field="days\./);
    assert.doesNotMatch(html, /data-proposal-field="overviewRows\./);
    assert.doesNotMatch(html, /data-proposal-field="pricingText\.packageLabel"/);
  });

  it('isTemplateEditPath allows commercial fields and rejects tour narrative', () => {
    assert.equal(isTemplateEditPath('tagline'), true);
    assert.equal(isTemplateEditPath('inclusions.0'), true);
    assert.equal(isTemplateEditPath('legalText.paymentTerms'), true);
    assert.equal(isTemplateEditPath('bookingFields.Payment%20Terms'), true);
    assert.equal(isTemplateEditPath('tourTitle'), false);
    assert.equal(isTemplateEditPath('days.1.body'), false);
    assert.equal(isTemplateEditPath('bookingFields.Quote%20Ref.'), false);
  });

  it('buildProposalHTML export has no contenteditable', () => {
    const html = buildProposalHTML(baseDoc());
    assert.doesNotMatch(html, /contenteditable/i);
    assert.doesNotMatch(html, /data-proposal-field/i);
  });

  it('harvestOverridesFromRoot reads template tagline and ignores tourTitle', () => {
    const doc = baseDoc();
    const harvested = harvestOverridesFromRoot(
      mockRoot([
        mockField('tourTitle', 'Custom Journey Title'),
        mockField('tagline', 'A <b>bold</b> tagline<script>x</script>', true),
        mockField('days.1.body', 'Should be ignored', true),
      ]),
      doc
    );
    assert.equal('tourTitle' in harvested, false);
    assert.match(harvested.tagline ?? '', /<b>bold<\/b>/);
    assert.doesNotMatch(harvested.tagline ?? '', /<script/i);
    assert.equal('days' in harvested, false);
  });

  it('harvestOverridesFromRoot reads inclusions and legal text', () => {
    const doc = baseDoc();
    const harvested = harvestOverridesFromRoot(
      mockRoot([
        mockField('inclusions.0', 'Private guide', true),
        mockField('legalText.paymentTerms', 'Custom payment terms', true),
      ]),
      doc
    );
    assert.equal(harvested.inclusions?.[0], 'Private guide');
    assert.equal(harvested.legalText?.paymentTerms, 'Custom payment terms');
  });
});

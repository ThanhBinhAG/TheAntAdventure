import {
  isTemplateEditPath,
  toProposalTemplateOverrides,
  type ProposalTemplateOverrides,
} from './proposal-content-overrides';
import { proposalRichHtml } from './proposal-rich-text';
import type { ProposalDoc } from './proposal-types';

function fieldValue(el: HTMLElement): string {
  const isRich = el.getAttribute('data-rich') === '1';
  if (isRich) {
    const html = el.innerHTML.trim();
    if (html === '' || html === '<br>') return '';
    return proposalRichHtml(html);
  }
  return (el.textContent ?? '').trim();
}

type MutableTemplate = {
  tagline?: string;
  bookingFields: Record<string, string>;
  inclusions: string[];
  exclusions: string[];
  pricingText: NonNullable<ProposalTemplateOverrides['pricingText']>;
  legalText: NonNullable<ProposalTemplateOverrides['legalText']>;
};

function createMutable(): MutableTemplate {
  return {
    bookingFields: {},
    inclusions: [],
    exclusions: [],
    pricingText: {},
    legalText: {},
  };
}

function applyField(m: MutableTemplate, path: string, value: string): void {
  if (!isTemplateEditPath(path)) return;

  if (path === 'tagline') {
    m.tagline = value;
    return;
  }

  const booking = path.match(/^bookingFields\.(.+)$/);
  if (booking) {
    m.bookingFields[decodeURIComponent(booking[1]!)] = value;
    return;
  }

  const incl = path.match(/^inclusions\.(\d+)$/);
  if (incl) {
    const idx = Number(incl[1]);
    while (m.inclusions.length <= idx) m.inclusions.push('');
    m.inclusions[idx] = value;
    return;
  }

  const excl = path.match(/^exclusions\.(\d+)$/);
  if (excl) {
    const idx = Number(excl[1]);
    while (m.exclusions.length <= idx) m.exclusions.push('');
    m.exclusions[idx] = value;
    return;
  }

  const pricing = path.match(/^pricingText\.(b2bGroundDesc|b2bFlightsDesc|footnote)$/);
  if (pricing) {
    m.pricingText[pricing[1] as keyof typeof m.pricingText] = value;
    return;
  }

  const legal = path.match(/^legalText\.(paymentTerms|cancellation|amendment|importantNotes)$/);
  if (legal) {
    m.legalText[legal[1] as keyof typeof m.legalText] = value;
  }
}

/** Harvest only template `data-proposal-field` nodes (tour narrative is not editable). */
export function harvestOverridesFromRoot(root: ParentNode, _baseDoc: ProposalDoc): ProposalTemplateOverrides {
  const m = createMutable();
  root.querySelectorAll('[data-proposal-field]').forEach((node) => {
    const el = node as HTMLElement;
    const path = el.getAttribute('data-proposal-field');
    if (!path) return;
    applyField(m, path, fieldValue(el));
  });

  const overrides: ProposalTemplateOverrides = {};
  if (m.tagline != null) overrides.tagline = m.tagline;
  if (Object.keys(m.bookingFields).length) overrides.bookingFields = m.bookingFields;
  if (m.inclusions.length) overrides.inclusions = m.inclusions;
  if (m.exclusions.length) overrides.exclusions = m.exclusions;
  if (Object.keys(m.pricingText).length) overrides.pricingText = m.pricingText;
  if (Object.keys(m.legalText).length) overrides.legalText = m.legalText;
  return toProposalTemplateOverrides(overrides);
}

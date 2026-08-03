import type { ProposalContentOverrides, ProposalDayOverride } from './proposal-content-overrides';
import { proposalRichHtml } from './proposal-rich-text';
import type { ProposalDoc, ProposalOverviewRow } from './proposal-types';

function fieldValue(el: HTMLElement): string {
  const isRich = el.getAttribute('data-rich') === '1';
  if (isRich) {
    const html = el.innerHTML.trim();
    if (html === '' || html === '<br>') return '';
    return proposalRichHtml(html);
  }
  return (el.textContent ?? '').trim();
}

type MutableOverrides = {
  tourTitle?: string;
  tagline?: string;
  specialNotes?: string;
  bookingFields: Record<string, string>;
  overviewRows: ProposalOverviewRow[];
  itineraryGlance: Array<{ dayNumber: number; destination?: string; theme?: string; hotel?: string }>;
  days: Map<number, ProposalDayOverride>;
  inclusions: string[];
  exclusions: string[];
  pricingText: NonNullable<ProposalContentOverrides['pricingText']>;
  legalText: NonNullable<ProposalContentOverrides['legalText']>;
};

function createMutable(): MutableOverrides {
  return {
    bookingFields: {},
    overviewRows: [],
    itineraryGlance: [],
    days: new Map(),
    inclusions: [],
    exclusions: [],
    pricingText: {},
    legalText: {},
  };
}

function ensureDay(m: MutableOverrides, dayNumber: number): ProposalDayOverride {
  let d = m.days.get(dayNumber);
  if (!d) {
    d = { dayNumber };
    m.days.set(dayNumber, d);
  }
  return d;
}

function applyField(m: MutableOverrides, path: string, value: string, baseDoc: ProposalDoc): void {
  if (path === 'tourTitle') {
    m.tourTitle = value;
    return;
  }
  if (path === 'tagline') {
    m.tagline = value;
    return;
  }
  if (path === 'specialNotes') {
    m.specialNotes = value;
    return;
  }

  const booking = path.match(/^bookingFields\.(.+)$/);
  if (booking) {
    m.bookingFields[decodeURIComponent(booking[1]!)] = value;
    return;
  }

  const overview = path.match(/^overviewRows\.(\d+)\.(label|optionA|optionB)$/);
  if (overview) {
    const idx = Number(overview[1]);
    const key = overview[2] as 'label' | 'optionA' | 'optionB';
    while (m.overviewRows.length <= idx) {
      const base = baseDoc.overviewRows?.[m.overviewRows.length];
      m.overviewRows.push({
        label: base?.label ?? '',
        optionA: base?.optionA ?? '',
        optionB: base?.optionB ?? '',
      });
    }
    m.overviewRows[idx]![key] = value;
    return;
  }

  const glance = path.match(/^itineraryGlance\.(\d+)\.(destination|theme|hotel)$/);
  if (glance) {
    const idx = Number(glance[1]);
    const key = glance[2] as 'destination' | 'theme' | 'hotel';
    while (m.itineraryGlance.length <= idx) {
      const base = baseDoc.itineraryGlance[m.itineraryGlance.length];
      m.itineraryGlance.push({ dayNumber: base?.dayNumber ?? m.itineraryGlance.length + 1 });
    }
    m.itineraryGlance[idx]![key] = value;
    if (!m.itineraryGlance[idx]!.dayNumber) {
      m.itineraryGlance[idx]!.dayNumber = baseDoc.itineraryGlance[idx]?.dayNumber ?? idx + 1;
    }
    return;
  }

  const seg = path.match(/^days\.(\d+)\.segments\.(\d+)\.(title|body)$/);
  if (seg) {
    const dayNumber = Number(seg[1]);
    const segIdx = Number(seg[2]);
    const key = seg[3] as 'title' | 'body';
    const day = ensureDay(m, dayNumber);
    if (!day.segments) day.segments = [];
    while (day.segments.length <= segIdx) day.segments.push({});
    day.segments[segIdx]![key] = value;
    return;
  }

  const dayField = path.match(/^days\.(\d+)\.(title|body|hotel|meals)$/);
  if (dayField) {
    const dayNumber = Number(dayField[1]);
    const key = dayField[2] as 'title' | 'body' | 'hotel' | 'meals';
    ensureDay(m, dayNumber)[key] = value;
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

  const pricing = path.match(/^pricingText\.(packageLabel|b2bGroundDesc|b2bFlightsDesc|footnote)$/);
  if (pricing) {
    m.pricingText[pricing[1] as keyof typeof m.pricingText] = value;
    return;
  }

  const legal = path.match(/^legalText\.(paymentTerms|cancellation|amendment|importantNotes)$/);
  if (legal) {
    m.legalText[legal[1] as keyof typeof m.legalText] = value;
  }
}

export function harvestOverridesFromRoot(root: ParentNode, baseDoc: ProposalDoc): ProposalContentOverrides {
  const m = createMutable();
  root.querySelectorAll('[data-proposal-field]').forEach((node) => {
    const el = node as HTMLElement;
    const path = el.getAttribute('data-proposal-field');
    if (!path) return;
    applyField(m, path, fieldValue(el), baseDoc);
  });

  const overrides: ProposalContentOverrides = {};
  if (m.tourTitle != null) overrides.tourTitle = m.tourTitle;
  if (m.tagline != null) overrides.tagline = m.tagline;
  if (m.specialNotes != null) overrides.specialNotes = m.specialNotes;
  if (Object.keys(m.bookingFields).length) overrides.bookingFields = m.bookingFields;
  if (m.overviewRows.length) overrides.overviewRows = m.overviewRows;
  if (m.itineraryGlance.length) overrides.itineraryGlance = m.itineraryGlance;
  if (m.days.size) overrides.days = [...m.days.values()];
  if (m.inclusions.length) overrides.inclusions = m.inclusions;
  if (m.exclusions.length) overrides.exclusions = m.exclusions;
  if (Object.keys(m.pricingText).length) overrides.pricingText = m.pricingText;
  if (Object.keys(m.legalText).length) overrides.legalText = m.legalText;
  return overrides;
}

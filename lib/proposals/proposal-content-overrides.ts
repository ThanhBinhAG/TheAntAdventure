import type {
  ProposalDayDetail,
  ProposalDoc,
  ProposalItineraryRow,
  ProposalLegalText,
  ProposalOverviewRow,
  ProposalPricingText,
} from './proposal-types';
import {
  PROPOSAL_AMENDMENT_POLICY,
  PROPOSAL_CANCELLATION_POLICY,
  PROPOSAL_IMPORTANT_NOTES,
  PROPOSAL_PAYMENT_TERMS,
} from './proposal-boilerplate';

export interface ProposalDayOverride {
  dayNumber: number;
  title?: string;
  body?: string;
  hotel?: string;
  meals?: string;
  segments?: Array<{ title?: string; body?: string }>;
}

/** Full override shape (apply still accepts legacy tour fields). */
export interface ProposalContentOverrides {
  tourTitle?: string;
  tagline?: string;
  specialNotes?: string;
  bookingFields?: Partial<Record<string, string>>;
  overviewRows?: ProposalOverviewRow[];
  itineraryGlance?: Partial<ProposalItineraryRow>[];
  days?: ProposalDayOverride[];
  inclusions?: string[];
  exclusions?: string[];
  pricingText?: Partial<ProposalPricingText>;
  legalText?: Partial<ProposalLegalText>;
}

/** Commercial / legal template fields editable in Step 5. */
export type ProposalTemplateOverrides = {
  tagline?: string;
  bookingFields?: Partial<Record<string, string>>;
  inclusions?: string[];
  exclusions?: string[];
  pricingText?: Pick<ProposalPricingText, 'footnote' | 'b2bGroundDesc' | 'b2bFlightsDesc'>;
  legalText?: Partial<ProposalLegalText>;
};

export const TEMPLATE_BOOKING_FIELD_KEYS = ['Payment Terms', 'Commission', 'Valid Until'] as const;

const TEMPLATE_PRICING_KEYS = ['footnote', 'b2bGroundDesc', 'b2bFlightsDesc'] as const;

/** True when `data-proposal-field` path is part of the editable template surface. */
export function isTemplateEditPath(path: string): boolean {
  if (path === 'tagline') return true;
  if (/^inclusions\.\d+$/.test(path)) return true;
  if (/^exclusions\.\d+$/.test(path)) return true;
  if (/^pricingText\.(footnote|b2bGroundDesc|b2bFlightsDesc)$/.test(path)) return true;
  if (/^legalText\.(paymentTerms|cancellation|amendment|importantNotes)$/.test(path)) return true;
  const booking = path.match(/^bookingFields\.(.+)$/);
  if (booking) {
    const label = decodeURIComponent(booking[1]!);
    return (TEMPLATE_BOOKING_FIELD_KEYS as readonly string[]).includes(label);
  }
  return false;
}

function pickTemplateBookingFields(
  fields?: Partial<Record<string, string>> | null
): Partial<Record<string, string>> | undefined {
  if (!fields) return undefined;
  const out: Record<string, string> = {};
  for (const key of TEMPLATE_BOOKING_FIELD_KEYS) {
    const val = fields[key];
    if (typeof val === 'string') out[key] = val;
  }
  return Object.keys(out).length ? out : undefined;
}

function pickTemplatePricingText(
  pricing?: Partial<ProposalPricingText> | null
): ProposalTemplateOverrides['pricingText'] | undefined {
  if (!pricing) return undefined;
  const out: NonNullable<ProposalTemplateOverrides['pricingText']> = {};
  for (const key of TEMPLATE_PRICING_KEYS) {
    const val = pricing[key];
    if (typeof val === 'string') out[key] = val;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Strip tour-specific / legacy keys down to the template subset. */
export function toProposalTemplateOverrides(
  overrides?: ProposalContentOverrides | ProposalTemplateOverrides | null
): ProposalTemplateOverrides {
  if (!overrides) return {};
  const out: ProposalTemplateOverrides = {};
  if (typeof overrides.tagline === 'string') out.tagline = overrides.tagline;
  const booking = pickTemplateBookingFields(overrides.bookingFields);
  if (booking) out.bookingFields = booking;
  if (overrides.inclusions?.length) out.inclusions = [...overrides.inclusions];
  if (overrides.exclusions?.length) out.exclusions = [...overrides.exclusions];
  const pricing = pickTemplatePricingText(overrides.pricingText);
  if (pricing) out.pricingText = pricing;
  if (overrides.legalText && Object.keys(overrides.legalText).length) {
    out.legalText = { ...overrides.legalText };
  }
  return out;
}

export function hasProposalTemplateOverrides(
  overrides?: ProposalContentOverrides | ProposalTemplateOverrides | null
): boolean {
  const t = toProposalTemplateOverrides(overrides);
  return !!(
    t.tagline ||
    (t.bookingFields && Object.keys(t.bookingFields).length) ||
    (t.inclusions && t.inclusions.length) ||
    (t.exclusions && t.exclusions.length) ||
    (t.pricingText && Object.keys(t.pricingText).length) ||
    (t.legalText && Object.keys(t.legalText).length)
  );
}

export function defaultOverviewRows(doc: ProposalDoc): ProposalOverviewRow[] {
  return [
    { label: 'Duration', optionA: doc.durationLabel, optionB: doc.durationLabel },
    { label: 'Travel Dates', optionA: doc.travelDateRange, optionB: doc.travelDateRange },
    { label: 'Season', optionA: doc.season, optionB: doc.season },
    {
      label: 'Guests',
      optionA: `${doc.guestCountLabel} (private tour)`,
      optionB: `${doc.guestCountLabel} (private tour)`,
    },
    { label: 'Route', optionA: doc.route, optionB: doc.route },
    {
      label: 'Domestic Flights',
      optionA: doc.flights.length
        ? `${doc.flights.map((f) => f.route).join(' + ')} included`
        : 'Land only / TBC',
      optionB: doc.flights.length
        ? `${doc.flights.map((f) => f.route).join(' + ')} included`
        : 'Land only / TBC',
    },
    {
      label: 'Accommodation',
      optionA: doc.accommodationOptionA,
      optionB: doc.accommodationOptionB,
    },
    {
      label: 'Guide',
      optionA: `${doc.brief.language}-speaking, private, per region`,
      optionB: `${doc.brief.language}-speaking, private, per region`,
    },
    { label: 'Transport', optionA: 'Private A/C vehicle throughout', optionB: 'Private A/C vehicle throughout' },
    { label: 'Format', optionA: 'Private, fully customisable', optionB: 'Private, fully customisable' },
  ];
}

export function defaultBookingFields(doc: ProposalDoc): Record<string, string> {
  const isB2c = doc.variant === 'b2c';
  const fields: Record<string, string> = {
    'Quote Ref.': doc.quoteRef,
    'Guest Name(s)': doc.customerName,
    Nationality: doc.brief.nationality || 'To be confirmed',
    'Prepared Date': doc.preparedDate,
    [isB2c ? 'No. of Guests' : 'No. of Passengers']: doc.guestCountLabel,
    'Valid Until': doc.validUntil,
    Rooming: doc.rooming,
    'Travel Dates': doc.travelDateRange,
  };
  if (isB2c) {
    fields['Your Consultant'] = `${doc.consultant.name} | ${doc.consultant.email}`;
    fields['Payment Terms'] = '30% deposit to confirm · Balance 60 days prior to departure';
  } else {
    fields['Agent / Company'] = doc.agentName || 'To be confirmed';
    fields['Sales Person'] = `${doc.consultant.name} | ${doc.consultant.email}`;
    fields.Commission = 'As per agent agreement';
  }
  return fields;
}

function mergeDay(day: ProposalDayDetail, patch?: ProposalDayOverride): ProposalDayDetail {
  if (!patch) return day;
  const segments =
    patch.segments && day.segments?.length
      ? day.segments.map((seg, i) => ({
          ...seg,
          title: patch.segments?.[i]?.title ?? seg.title,
          body: patch.segments?.[i]?.body ?? seg.body,
        }))
      : day.segments;
  return {
    ...day,
    title: patch.title ?? day.title,
    body: patch.body ?? day.body,
    hotel: patch.hotel ?? day.hotel,
    meals: patch.meals ?? day.meals,
    segments,
  };
}

function mergeGlanceRow(row: ProposalItineraryRow, patch?: Partial<ProposalItineraryRow>): ProposalItineraryRow {
  if (!patch) return row;
  return {
    ...row,
    destination: patch.destination ?? row.destination,
    theme: patch.theme ?? row.theme,
    hotel: patch.hotel ?? row.hotel,
    dateLabel: patch.dateLabel ?? row.dateLabel,
  };
}

export function applyProposalContentOverrides(
  doc: ProposalDoc,
  overrides?: ProposalContentOverrides | ProposalTemplateOverrides | null
): ProposalDoc {
  if (!overrides || !hasProposalContentOverrides(overrides)) return doc;

  const full = overrides as ProposalContentOverrides;
  const dayPatches = new Map((full.days ?? []).map((d) => [d.dayNumber, d]));
  const glancePatches = new Map(
    (full.itineraryGlance ?? [])
      .filter((r) => r.dayNumber != null)
      .map((r) => [r.dayNumber as number, r])
  );

  const templateBooking = pickTemplateBookingFields(full.bookingFields);
  const templatePricing = pickTemplatePricingText(full.pricingText);
  // Preserve legacy packageLabel if still present on a full override object.
  const pricingMerge =
    full.pricingText || templatePricing
      ? {
          ...(doc.pricingText ?? {}),
          ...(templatePricing ?? {}),
          ...(typeof full.pricingText?.packageLabel === 'string'
            ? { packageLabel: full.pricingText.packageLabel }
            : {}),
        }
      : doc.pricingText;

  return {
    ...doc,
    tourTitle: full.tourTitle ?? doc.tourTitle,
    tagline: full.tagline ?? doc.tagline,
    specialNotes: full.specialNotes ?? doc.specialNotes,
    bookingFields: templateBooking
      ? ({ ...defaultBookingFields(doc), ...(doc.bookingFields ?? {}), ...templateBooking } as Record<
          string,
          string
        >)
      : full.bookingFields
        ? ({ ...defaultBookingFields(doc), ...full.bookingFields } as Record<string, string>)
        : doc.bookingFields,
    overviewRows: full.overviewRows ?? doc.overviewRows,
    itineraryGlance: doc.itineraryGlance.map((row) =>
      mergeGlanceRow(row, glancePatches.get(row.dayNumber))
    ),
    days: doc.days.map((day) => mergeDay(day, dayPatches.get(day.dayNumber))),
    inclusions: full.inclusions ?? doc.inclusions,
    exclusions: full.exclusions ?? doc.exclusions,
    pricingText: pricingMerge,
    legalText: full.legalText ? { ...(doc.legalText ?? {}), ...full.legalText } : doc.legalText,
  };
}

export function hasProposalContentOverrides(
  overrides?: ProposalContentOverrides | ProposalTemplateOverrides | null
): boolean {
  if (!overrides) return false;
  const full = overrides as ProposalContentOverrides;
  return !!(
    full.tourTitle ||
    full.tagline ||
    full.specialNotes ||
    (full.bookingFields && Object.keys(full.bookingFields).length) ||
    (full.overviewRows && full.overviewRows.length) ||
    (full.itineraryGlance && full.itineraryGlance.length) ||
    (full.days && full.days.length) ||
    (full.inclusions && full.inclusions.length) ||
    (full.exclusions && full.exclusions.length) ||
    (full.pricingText && Object.keys(full.pricingText).length) ||
    (full.legalText && Object.keys(full.legalText).length)
  );
}

/** Template-only snapshot for editor Reset / initial draft. */
export function snapshotFromDoc(doc: ProposalDoc): ProposalTemplateOverrides {
  return snapshotTemplateFromDoc(doc);
}

export function snapshotTemplateFromDoc(doc: ProposalDoc): ProposalTemplateOverrides {
  const booking = doc.bookingFields ?? defaultBookingFields(doc);
  const bookingFields = pickTemplateBookingFields(booking);
  const pricingText = pickTemplatePricingText(doc.pricingText);
  const out: ProposalTemplateOverrides = {
    tagline: doc.tagline,
    inclusions: [...doc.inclusions],
    exclusions: [...doc.exclusions],
  };
  if (bookingFields) out.bookingFields = bookingFields;
  if (pricingText) out.pricingText = pricingText;
  if (doc.legalText) out.legalText = { ...doc.legalText };
  else out.legalText = defaultLegalText();
  return out;
}

function formatLegalKv(
  rows: Array<{ label?: string; detail?: string; notice?: string; charge?: string; title?: string; body?: string }>
): string {
  return rows
    .map((r) => {
      const label = r.label ?? r.notice ?? r.title ?? '';
      const detail = r.detail ?? r.charge ?? r.body ?? '';
      return `${label}: ${detail}`;
    })
    .join('\n\n');
}

export function defaultLegalText(): ProposalLegalText {
  return {
    paymentTerms: formatLegalKv(PROPOSAL_PAYMENT_TERMS),
    cancellation: formatLegalKv([
      { notice: 'Notice Required', charge: 'Notice must be submitted in writing to sales@theantadventures.com.' },
      ...PROPOSAL_CANCELLATION_POLICY,
    ]),
    amendment: formatLegalKv(PROPOSAL_AMENDMENT_POLICY),
    importantNotes: formatLegalKv(PROPOSAL_IMPORTANT_NOTES),
  };
}

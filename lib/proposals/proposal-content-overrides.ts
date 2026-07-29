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
  overrides?: ProposalContentOverrides | null
): ProposalDoc {
  if (!overrides || !hasProposalContentOverrides(overrides)) return doc;

  const dayPatches = new Map((overrides.days ?? []).map((d) => [d.dayNumber, d]));
  const glancePatches = new Map(
    (overrides.itineraryGlance ?? [])
      .filter((r) => r.dayNumber != null)
      .map((r) => [r.dayNumber as number, r])
  );

  return {
    ...doc,
    tourTitle: overrides.tourTitle ?? doc.tourTitle,
    tagline: overrides.tagline ?? doc.tagline,
    specialNotes: overrides.specialNotes ?? doc.specialNotes,
    bookingFields: overrides.bookingFields
      ? ({ ...defaultBookingFields(doc), ...overrides.bookingFields } as Record<string, string>)
      : doc.bookingFields,
    overviewRows: overrides.overviewRows ?? doc.overviewRows,
    itineraryGlance: doc.itineraryGlance.map((row) =>
      mergeGlanceRow(row, glancePatches.get(row.dayNumber))
    ),
    days: doc.days.map((day) => mergeDay(day, dayPatches.get(day.dayNumber))),
    inclusions: overrides.inclusions ?? doc.inclusions,
    exclusions: overrides.exclusions ?? doc.exclusions,
    pricingText: overrides.pricingText
      ? { ...(doc.pricingText ?? {}), ...overrides.pricingText }
      : doc.pricingText,
    legalText: overrides.legalText ? { ...(doc.legalText ?? {}), ...overrides.legalText } : doc.legalText,
  };
}

export function hasProposalContentOverrides(overrides?: ProposalContentOverrides | null): boolean {
  if (!overrides) return false;
  return !!(
    overrides.tourTitle ||
    overrides.tagline ||
    overrides.specialNotes ||
    (overrides.bookingFields && Object.keys(overrides.bookingFields).length) ||
    (overrides.overviewRows && overrides.overviewRows.length) ||
    (overrides.itineraryGlance && overrides.itineraryGlance.length) ||
    (overrides.days && overrides.days.length) ||
    (overrides.inclusions && overrides.inclusions.length) ||
    (overrides.exclusions && overrides.exclusions.length) ||
    (overrides.pricingText && Object.keys(overrides.pricingText).length) ||
    (overrides.legalText && Object.keys(overrides.legalText).length)
  );
}

/** Build a full override snapshot from current doc values (for editor initial state). */
export function snapshotFromDoc(doc: ProposalDoc): ProposalContentOverrides {
  return {
    tourTitle: doc.tourTitle,
    tagline: doc.tagline,
    specialNotes: doc.specialNotes,
    bookingFields: doc.bookingFields ?? defaultBookingFields(doc),
    overviewRows: doc.overviewRows ?? defaultOverviewRows(doc),
    itineraryGlance: doc.itineraryGlance.map((r) => ({ ...r })),
    days: doc.days.map((d) => ({
      dayNumber: d.dayNumber,
      title: d.title,
      body: d.body,
      hotel: d.hotel,
      meals: d.meals,
      segments: d.segments?.map((s) => ({ title: s.title, body: s.body })),
    })),
    inclusions: [...doc.inclusions],
    exclusions: [...doc.exclusions],
    pricingText: doc.pricingText ? { ...doc.pricingText } : undefined,
    legalText: doc.legalText ? { ...doc.legalText } : undefined,
  };
}

export function defaultPricingText(doc: ProposalDoc): ProposalPricingText {
  const packageLabel = doc.pricing.kind === 'b2c' ? doc.pricing.packageLabel : undefined;
  return {
    packageLabel,
    b2bGroundDesc:
      'Ground arrangements — private tour (transfers, guide, vehicle, activities & entrance fees as per program)',
    b2bFlightsDesc: 'Domestic flights as per program · Economy class',
    footnote:
      doc.variant === 'b2b'
        ? 'This quotation is prepared exclusively for B2B partners. All rates are net and do not include agent commission. Valid for travel dates specified only.'
        : 'All prices are quoted in USD and include applicable taxes. Rates are valid for the travel dates specified and subject to availability at time of booking confirmation.',
  };
}

function formatLegalKv(rows: Array<{ label?: string; detail?: string; notice?: string; charge?: string; title?: string; body?: string }>): string {
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

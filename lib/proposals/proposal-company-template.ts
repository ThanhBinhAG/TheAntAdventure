import {
  applyProposalContentOverrides,
  defaultLegalText,
  hasProposalTemplateOverrides,
  snapshotTemplateFromDoc,
  toProposalTemplateOverrides,
  type ProposalTemplateOverrides,
} from './proposal-content-overrides';
import {
  DEFAULT_PROPOSAL_THEME,
  isCustomProposalTheme,
  pickProposalTheme,
} from './proposal-theme';
import {
  PROPOSAL_B2B_FOOTER_NOTE,
  PROPOSAL_DEFAULT_EXCLUSIONS,
  PROPOSAL_DEFAULT_INCLUSIONS,
  PROPOSAL_FLIGHT_NOTE,
} from './proposal-boilerplate';
import type { ProposalDoc, ProposalVariant } from './proposal-types';

export const PROPOSAL_TEMPLATE_VARIANTS = ['b2c', 'b2b'] as const;

export type CompanyTemplateSource = 'company' | 'system';

export type CompanyTemplateRecord = {
  fields: ProposalTemplateOverrides;
  source: CompanyTemplateSource;
  updatedAt?: string | null;
};

export type CompanyTemplatesMap = Record<ProposalVariant, CompanyTemplateRecord>;

const B2C_PAYMENT_TERMS = '30% deposit to confirm · Balance 60 days prior to departure';
const B2B_COMMISSION = 'As per agent agreement';
const VALID_UNTIL_DEFAULT = '30 days from issue';
const B2B_GROUND_DESC =
  'Ground arrangements — private tour (transfers, guide, vehicle, activities & entrance fees as per program)';
const B2B_FLIGHTS_DESC = 'Domestic flights as per program · Economy class';
const DEFAULT_JOURNEY_TAGLINE =
  "A private journey through Vietnam's most remarkable landscapes and cultures.";

export function emptyCompanyTemplatesMap(): CompanyTemplatesMap {
  return {
    b2c: { fields: {}, source: 'system' },
    b2b: { fields: {}, source: 'system' },
  };
}

/** Built-in commercial/legal copy when no company row is saved. */
export function defaultCompanyTemplate(variant: ProposalVariant): ProposalTemplateOverrides {
  const bookingFields =
    variant === 'b2c'
      ? { 'Payment Terms': B2C_PAYMENT_TERMS, 'Valid Until': VALID_UNTIL_DEFAULT }
      : { Commission: B2B_COMMISSION, 'Valid Until': VALID_UNTIL_DEFAULT };
  const pricingText =
    variant === 'b2b'
      ? {
          footnote: PROPOSAL_B2B_FOOTER_NOTE,
          b2bGroundDesc: B2B_GROUND_DESC,
          b2bFlightsDesc: B2B_FLIGHTS_DESC,
        }
      : { footnote: PROPOSAL_FLIGHT_NOTE };
  return {
    tagline: DEFAULT_JOURNEY_TAGLINE,
    bookingFields,
    inclusions: [...PROPOSAL_DEFAULT_INCLUSIONS],
    exclusions: [...PROPOSAL_DEFAULT_EXCLUSIONS],
    pricingText,
    legalText: defaultLegalText(),
    theme: { ...DEFAULT_PROPOSAL_THEME },
  };
}

export function parseCompanyTemplateFields(raw: unknown): ProposalTemplateOverrides {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  return toProposalTemplateOverrides(raw as ProposalTemplateOverrides);
}

export function isStoredCompanyTemplateEmpty(fields?: ProposalTemplateOverrides | null): boolean {
  return !hasProposalTemplateOverrides(fields);
}

export function resolveCompanyTemplate(
  variant: ProposalVariant,
  stored?: ProposalTemplateOverrides | null
): CompanyTemplateRecord {
  const fields = toProposalTemplateOverrides(stored);
  if (isStoredCompanyTemplateEmpty(fields)) {
    return { fields: {}, source: 'system' };
  }
  return { fields, source: 'company' };
}

/**
 * Form seed: saved company copy, else this tour's assembled snapshot, else system boilerplate.
 * Does not replace product-aggregated inclusions until the user saves a company template.
 */
export function hydrateTemplateForm(
  variant: ProposalVariant,
  stored?: ProposalTemplateOverrides | null,
  assembledFallback?: ProposalDoc | null
): ProposalTemplateOverrides {
  const resolved = resolveCompanyTemplate(variant, stored);
  if (resolved.source === 'company') {
    const defaults = defaultCompanyTemplate(variant);
    return {
      ...defaults,
      ...resolved.fields,
      bookingFields: { ...defaults.bookingFields, ...resolved.fields.bookingFields },
      pricingText: { ...defaults.pricingText, ...resolved.fields.pricingText },
      legalText: { ...defaults.legalText, ...resolved.fields.legalText },
      theme: { ...defaults.theme, ...resolved.fields.theme },
      inclusions: resolved.fields.inclusions?.length
        ? [...resolved.fields.inclusions]
        : [...(defaults.inclusions ?? [])],
      exclusions: resolved.fields.exclusions?.length
        ? [...resolved.fields.exclusions]
        : [...(defaults.exclusions ?? [])],
    };
  }
  if (assembledFallback) {
    const snap = snapshotTemplateFromDoc(assembledFallback);
    return { ...snap, theme: { ...DEFAULT_PROPOSAL_THEME, ...snap.theme } };
  }
  return defaultCompanyTemplate(variant);
}

/** company template (if saved) then per-quote overrides. Empty company → assembler defaults stay. */
export function mergeProposalTemplateLayers(
  doc: ProposalDoc,
  company?: ProposalTemplateOverrides | null,
  draft?: ProposalTemplateOverrides | null
): ProposalDoc {
  let next = doc;
  if (hasProposalTemplateOverrides(company)) {
    next = applyProposalContentOverrides(next, company);
  }
  if (hasProposalTemplateOverrides(draft)) {
    next = applyProposalContentOverrides(next, draft);
  }
  return next;
}

export function normalizeLineList(lines?: string[] | null): string[] {
  if (!lines?.length) return [];
  return lines.map((line) => line.trim()).filter(Boolean);
}

/** Persist shape: drop empty keys so `{}` still means “use system defaults”. */
export function serializeCompanyTemplate(fields: ProposalTemplateOverrides): ProposalTemplateOverrides {
  const next = toProposalTemplateOverrides({
    ...fields,
    inclusions: normalizeLineList(fields.inclusions),
    exclusions: normalizeLineList(fields.exclusions),
  });
  if (typeof next.tagline === 'string' && !next.tagline.trim()) delete next.tagline;
  const theme = pickProposalTheme(fields.theme);
  if (theme && isCustomProposalTheme(theme)) next.theme = theme;
  else delete next.theme;
  return next;
}

import { PRODUCT_DESTINATIONS, parseProductCode, type ProductRegion } from '@/lib/product-code';
import { PRODUCT_CATEGORIES, PRODUCT_DURATIONS } from '@/lib/product-form';
import type { Product } from '@/lib/types';

/** Editable draft row after Excel parse + auto-classification. */
export interface PortfolioDraftProduct {
  code: string;
  name: string;
  desc: string;
  notesToSales: string;
  dur: string;
  cat: string;
  dest: string;
  region: ProductRegion | string;
  lvl: string;
  /** True when dest/cat/dur needed a guess or stayed unmatched. */
  needsReview: boolean;
  reviewReasons: string[];
}

const REGION_FROM_CODE: Record<string, ProductRegion> = {
  NV: 'north',
  CV: 'central',
  SV: 'south',
};

/** First token of type segment → category. */
const TYPE_PREFIX_TO_CAT: Record<string, string> = {
  CULI: 'Culinary',
  CT: 'Cultural',
  BOA: 'Boat',
  CRU: 'Boat',
  NAT: 'Nature',
  ADV: 'Adventure',
  TRF: 'Transfer',
  TRK: 'Adventure',
  CYC: 'Cycling',
  PHO: 'Photography',
  HMS: 'Cultural',
  LUX: 'Wellness',
  BCH: 'Nature',
  ECO: 'Nature',
  SEA: 'Nature',
  DAY: 'Experience',
  FLT: 'Transfer',
  SVC: 'Service',
  JEP: 'Adventure',
  COM: 'Experience',
  HD: 'Experience',
  FD: 'Experience',
  EVE: 'Culinary',
};

const SECTION_TITLE_TO_DEST: Record<string, string> = {
  'HO CHI MINH CITY': 'Ho Chi Minh City',
  'HO CHI MINH': 'Ho Chi Minh City',
  SAIGON: 'Ho Chi Minh City',
  'CU CHI': 'Cu Chi',
  'MEKONG DELTA': 'Mekong Delta',
  MEKONG: 'Mekong Delta',
  'PHU QUOC': 'Phu Quoc Island',
  'PHU QUOC ISLAND': 'Phu Quoc Island',
  'NHA TRANG': 'Nha Trang',
  'DA LAT': 'Da Lat',
  HANOI: 'Hanoi',
  'HALONG BAY': 'Halong Bay',
  SAPA: 'Sapa',
  HUE: 'Hue',
  'HOI AN': 'Hoi An & Da Nang',
  'DA NANG': 'Da Nang',
};

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function destLabelFromCode(destCode: string | null | undefined): string | null {
  if (!destCode) return null;
  const upper = destCode.toUpperCase();
  const hit = PRODUCT_DESTINATIONS.find((d) => d.code === upper);
  return hit?.label ?? null;
}

export function destFromSectionTitle(title: string): string | null {
  const key = normalizeWhitespace(title).toUpperCase();
  if (SECTION_TITLE_TO_DEST[key]) return SECTION_TITLE_TO_DEST[key];
  const ci = PRODUCT_DESTINATIONS.find((d) => d.label.toUpperCase() === key);
  return ci?.label ?? null;
}

export function normalizeDuration(raw: string): { dur: string; matched: boolean } {
  const t = normalizeWhitespace(raw);
  if (!t) return { dur: 'Full Day', matched: false };

  const exact = PRODUCT_DURATIONS.find((d) => d.toLowerCase() === t.toLowerCase());
  if (exact) return { dur: exact, matched: true };

  const compact = t.toLowerCase().replace(/[–—]/g, '-');
  if (/evening.*2\s*-\s*3/.test(compact) || /evening\s*\(2/.test(compact)) {
    return { dur: 'Evening (2–3 hours)', matched: true };
  }
  if (/evening.*3\s*-\s*4/.test(compact) || /evening\s*\(3/.test(compact)) {
    return { dur: 'Evening (3–4 hours)', matched: true };
  }
  if (/^half\s*day/i.test(t) || /\bhd\b/i.test(t)) return { dur: 'Half Day', matched: true };
  if (/^full\s*day/i.test(t) || /\bfd\b/i.test(t)) return { dur: 'Full Day', matched: true };
  if (/2\s*days?\s*1\s*night/i.test(t) || /2d\s*1n/i.test(t)) {
    return { dur: '2 Days 1 Night', matched: true };
  }
  if (/3\s*days?\s*2\s*nights?/i.test(t) || /3d\s*2n/i.test(t)) {
    return { dur: '3 Days 2 Nights', matched: true };
  }
  if (/4\s*days?\s*3\s*nights?/i.test(t) || /4d\s*3n/i.test(t)) {
    return { dur: '4 Days 3 Nights', matched: true };
  }
  if (/^evening/i.test(t)) return { dur: 'Evening (3–4 hours)', matched: true };
  if (/^service/i.test(t)) return { dur: 'Service', matched: true };

  return { dur: t, matched: false };
}

function categoryFromTypeSegment(typeSegment: string): { cat: string; matched: boolean } {
  const parts = typeSegment.split('-').filter(Boolean);
  for (const part of parts) {
    const mapped = TYPE_PREFIX_TO_CAT[part.toUpperCase()];
    if (mapped) return { cat: mapped, matched: true };
  }
  return { cat: 'Experience', matched: false };
}

function regionFromCodePart(regionCode: string | null | undefined, brand: string): ProductRegion {
  if (brand === 'SV' && !regionCode) return 'services';
  if (regionCode && REGION_FROM_CODE[regionCode.toUpperCase()]) {
    return REGION_FROM_CODE[regionCode.toUpperCase()];
  }
  return 'south';
}

export interface ClassifyPortfolioRowInput {
  code: string;
  name: string;
  durationRaw: string;
  description: string;
  notesToSales: string;
  /** Destination from brown section header rows. */
  sectionDest: string | null;
}

export function classifyPortfolioRow(input: ClassifyPortfolioRowInput): PortfolioDraftProduct {
  const reviewReasons: string[] = [];
  const parts = parseProductCode(input.code);

  let region: ProductRegion | string = 'south';
  let dest = input.sectionDest ?? '';
  let cat = 'Experience';

  if (!parts) {
    reviewReasons.push('Code format not recognized');
  } else {
    region = regionFromCodePart(parts.regionCode, parts.brand);
    const fromCode = destLabelFromCode(parts.destCode);
    if (fromCode) {
      dest = fromCode;
    } else if (!dest) {
      reviewReasons.push('Destination unknown — set manually');
    }
    const catResult = categoryFromTypeSegment(parts.typeSegment);
    cat = catResult.cat;
    if (!catResult.matched) reviewReasons.push('Category guessed from code');
  }

  if (!dest) {
    dest = input.sectionDest ?? '';
    if (!dest) reviewReasons.push('No destination');
  }

  const durResult = normalizeDuration(input.durationRaw);
  if (!durResult.matched) reviewReasons.push('Duration not in catalog — review');

  if (!PRODUCT_CATEGORIES.includes(cat as (typeof PRODUCT_CATEGORIES)[number])) {
    reviewReasons.push('Category outside default list');
  }

  if (!input.name.trim()) reviewReasons.push('Missing name');

  return {
    code: input.code.trim(),
    name: normalizeWhitespace(input.name),
    desc: input.description.trim(),
    notesToSales: input.notesToSales.trim(),
    dur: durResult.dur,
    cat,
    dest,
    region,
    lvl: 'Easy & Comfortable',
    needsReview: reviewReasons.length > 0,
    reviewReasons,
  };
}

export function draftToProduct(draft: PortfolioDraftProduct): Product {
  return {
    code: draft.code,
    name: draft.name,
    logic: '',
    dur: draft.dur,
    cat: draft.cat,
    dest: draft.dest,
    lvl: draft.lvl,
    desc: draft.desc,
    usp: '',
    notesToSales: draft.notesToSales,
    price: '',
    region: draft.region,
    status: 'active',
  };
}

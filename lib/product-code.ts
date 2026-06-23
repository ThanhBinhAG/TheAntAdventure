export type ProductRegion = 'north' | 'central' | 'south' | 'services';

export interface ProductDestination {
  label: string;
  code: string;
  region: ProductRegion;
}

export const PRODUCT_DESTINATIONS: readonly ProductDestination[] = [
  { label: 'An Giang / Mekong Delta', code: 'ANG', region: 'south' },
  { label: 'Ba Be / Bac Kan', code: 'BBC', region: 'north' },
  { label: 'Can Tho / Mekong Delta', code: 'CTH', region: 'south' },
  { label: 'Cao Bang', code: 'CAO', region: 'north' },
  { label: 'Cu Chi', code: 'CCH', region: 'south' },
  { label: 'Da Lat', code: 'DAL', region: 'south' },
  { label: 'Da Nang', code: 'DAN', region: 'central' },
  { label: 'Ha Giang', code: 'HAG', region: 'north' },
  { label: 'Halong Bay', code: 'HAL', region: 'north' },
  { label: 'Hanoi', code: 'HAN', region: 'north' },
  { label: 'Ho Chi Minh City', code: 'SGN', region: 'south' },
  { label: 'Hoi An & Da Nang', code: 'HOI', region: 'central' },
  { label: 'Hue', code: 'HUE', region: 'central' },
  { label: 'Kon Tum / Central Highlands', code: 'KON', region: 'central' },
  { label: 'Lan Ha Bay / Cat Ba', code: 'LHBA', region: 'north' },
  { label: 'Mai Chau', code: 'MCC', region: 'north' },
  { label: 'Mekong Delta', code: 'MKG', region: 'south' },
  { label: 'Mekong Delta → Cambodia', code: 'MKG', region: 'south' },
  { label: 'Nha Trang', code: 'NTR', region: 'south' },
  { label: 'Nha Trang / Ninh Van Bay', code: 'NTR', region: 'south' },
  { label: 'Ninh Binh', code: 'NBI', region: 'north' },
  { label: 'Phong Nha', code: 'PHN', region: 'central' },
  { label: 'Phu Quoc Island', code: 'PHQ', region: 'south' },
  { label: 'Sapa', code: 'SPA', region: 'north' },
  { label: 'Sapa / Fansipan', code: 'SPA', region: 'north' },
  { label: 'Sapa & Lao Cai', code: 'SPA', region: 'north' },
] as const;

/** Display-only destination tags for services (no AA dest code). */
export const SERVICE_DESTINATION_TAGS = ['All Vietnam', 'SGN / HAN / DAD'] as const;

export type ServiceDestinationTag = (typeof SERVICE_DESTINATION_TAGS)[number];

/** Short airport / city aliases for search (query → catalog labels). */
const DEST_SEARCH_ALIASES: Record<string, string[]> = {
  sgn: ['Ho Chi Minh City'],
  hcm: ['Ho Chi Minh City'],
  saigon: ['Ho Chi Minh City'],
  han: ['Hanoi'],
  hanoi: ['Hanoi'],
  dad: ['Da Nang', 'Hoi An & Da Nang'],
  danang: ['Da Nang', 'Hoi An & Da Nang'],
  hal: ['Halong Bay', 'Lan Ha Bay / Cat Ba'],
  halong: ['Halong Bay'],
  hoi: ['Hoi An & Da Nang'],
  hue: ['Hue'],
  spa: ['Sapa', 'Sapa / Fansipan', 'Sapa & Lao Cai'],
  sapa: ['Sapa', 'Sapa / Fansipan', 'Sapa & Lao Cai'],
  mkg: ['Mekong Delta', 'Mekong Delta → Cambodia', 'An Giang / Mekong Delta'],
  phq: ['Phu Quoc Island'],
  ntr: ['Nha Trang', 'Nha Trang / Ninh Van Bay'],
};

export const TYPE_SEGMENT_OPTIONS = [
  'HD',
  'FD',
  'TRF',
  '2D',
  '3D',
  'SEA-HD',
  'ECO-HD',
  'CT-FD',
  'DAY-FD',
  'ADV-FD',
  'FLT-FD',
  'BOA-EVE',
  'CULI-EVE',
  'CRU-2D1N',
  'NAT-2D1N',
  'COM-2D1N',
  'HMS-2D1N',
  'LUX-3D2N',
  'ADV-3D2N',
  'BCH-3D2N',
  'PHO-3D2N',
  'TRK-3D2N',
  'LUX-4D3N',
  'CRU-4D3N',
  'JEP-4D3N',
  'SVC-VOA',
  'SGN-HD',
] as const;

export type TypeSegment = (typeof TYPE_SEGMENT_OPTIONS)[number];

export interface ProductCodeInput {
  region: string;
  dest: string;
  dur: string;
  cat: string;
  typeSegment?: string;
}

export interface ProductCodeParts {
  brand: 'AA' | 'SV';
  regionCode: string;
  destCode: string | null;
  typeSegment: string;
  sequence: string;
  raw: string;
}

const REGION_CODES: Record<string, string> = {
  north: 'NV',
  central: 'CV',
  south: 'SV',
  services: 'SV',
};

export function regionToCode(region: string): string {
  return REGION_CODES[region] ?? 'NV';
}

export function resolveDestCode(destName: string): string | null {
  const trimmed = destName.trim();
  if (!trimmed) return null;
  if (isServiceOnlyDestination(trimmed)) return null;
  const exact = PRODUCT_DESTINATIONS.find((d) => d.label === trimmed);
  if (exact) return exact.code;
  const ci = PRODUCT_DESTINATIONS.find((d) => d.label.toLowerCase() === trimmed.toLowerCase());
  if (ci) return ci.code;
  return null;
}

export function isServiceOnlyDestination(dest: string): boolean {
  const t = dest.trim().toLowerCase();
  return SERVICE_DESTINATION_TAGS.some((tag) => tag.toLowerCase() === t);
}

export function destinationsForRegion(region: string): ProductDestination[] {
  if (region === 'services') return [];
  return PRODUCT_DESTINATIONS.filter((d) => d.region === region);
}

/**
 * Build destination tag options: catalog for region + service specials + labels already used on products.
 */
export function deriveDestinationOptions(
  region: string,
  products: { dest?: string; region?: string }[] = []
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const push = (label: string) => {
    const t = label.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    result.push(t);
  };

  if (region === 'services') {
    SERVICE_DESTINATION_TAGS.forEach((tag) => push(tag));
  } else {
    destinationsForRegion(region).forEach((d) => push(d.label));
  }

  for (const p of products) {
    if (!p.dest?.trim()) continue;
    if (region === 'services' || p.region === region) push(p.dest);
  }

  return result;
}

function destOptionSearchText(label: string): string {
  const code = resolveDestCode(label);
  return `${label} ${code ?? ''}`.toLowerCase();
}

/**
 * Filter destination suggestions as the user types (e.g. "H" → Hanoi, Halong Bay, Ha Giang).
 */
export function filterDestinationSuggestions(
  query: string,
  options: string[],
  limit = 10
): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return options.slice(0, limit);

  const aliasHits = DEST_SEARCH_ALIASES[q] ?? [];
  const scored: { label: string; score: number }[] = [];

  for (const label of options) {
    const text = destOptionSearchText(label);
    let score = 0;
    if (label.toLowerCase() === q) score = 100;
    else if (label.toLowerCase().startsWith(q)) score = 80;
    else if (text.includes(q)) score = 60;
    else if (aliasHits.includes(label)) score = 70;
    if (score > 0) scored.push({ label, score });
  }

  for (const label of aliasHits) {
    if (!options.includes(label)) continue;
    if (!scored.some((s) => s.label === label)) scored.push({ label, score: 65 });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((s) => s.label);
}

function catIncludes(cat: string, ...needles: string[]): boolean {
  const lower = cat.toLowerCase();
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

export function suggestTypeSegment(region: string, dur: string, cat: string): string {
  if (region === 'services') {
    if (cat === 'Visa' || catIncludes(cat, 'visa')) return 'SVC-VOA';
    return 'SGN-HD';
  }

  if (dur === 'Half Day') {
    if (cat === 'Transfer' || catIncludes(cat, 'transfer')) return 'TRF';
    return 'HD';
  }

  if (dur === 'Full Day') {
    if (catIncludes(cat, 'cultural', 'history')) return 'CT-FD';
    if (catIncludes(cat, 'nature', 'adventure')) return 'DAY-FD';
    return 'FD';
  }

  if (dur === 'Evening (2–3 hours)') return 'BOA-EVE';
  if (dur === 'Evening (3–4 hours)') return 'CULI-EVE';

  if (dur === '2 Days 1 Night') {
    if (catIncludes(cat, 'cruise')) return 'CRU-2D1N';
    if (catIncludes(cat, 'community', 'slow travel')) return 'HMS-2D1N';
    if (catIncludes(cat, 'community', 'culture')) return 'COM-2D1N';
    if (catIncludes(cat, 'nature')) return 'NAT-2D1N';
    return '2D';
  }

  if (dur === '3 Days 2 Nights') {
    if (catIncludes(cat, 'luxury')) return 'LUX-3D2N';
    if (catIncludes(cat, 'adventure')) return 'ADV-3D2N';
    if (catIncludes(cat, 'beach')) return 'BCH-3D2N';
    return '3D';
  }

  if (dur === '4 Days 3 Nights') {
    if (catIncludes(cat, 'cruise')) return 'CRU-4D3N';
    if (catIncludes(cat, 'adventure', 'scenic')) return 'JEP-4D3N';
    if (catIncludes(cat, 'luxury', 'wellness', 'leisure')) return 'LUX-4D3N';
    return 'LUX-4D3N';
  }

  if (dur === 'Service') {
    if (cat === 'Visa' || catIncludes(cat, 'visa')) return 'SVC-VOA';
    return 'SGN-HD';
  }

  return 'HD';
}

export function buildCodePrefix(input: ProductCodeInput): string | null {
  const typeSegment = input.typeSegment?.trim() || suggestTypeSegment(input.region, input.dur, input.cat);

  if (input.region === 'services') {
    return `SV-${typeSegment}`;
  }

  const destCode = resolveDestCode(input.dest);
  if (!destCode) return null;

  const regionCode = regionToCode(input.region);
  return `AA-${regionCode}-${destCode}-${typeSegment}`;
}

export function nextSequence(prefix: string, existingCodes: string[]): string {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^${escaped}-(\\d{2})$`);
  let max = 0;
  for (const code of existingCodes) {
    const m = code.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const next = max + 1;
  if (next > 99) {
    throw new Error(`No available sequence for prefix ${prefix} (max 99 reached).`);
  }
  return String(next).padStart(2, '0');
}

export function buildProductCode(input: ProductCodeInput, existingCodes: string[]): string {
  const prefix = buildCodePrefix(input);
  if (!prefix) {
    throw new Error('Cannot build product code: destination is required and must match a known location.');
  }
  const seq = nextSequence(prefix, existingCodes);
  return `${prefix}-${seq}`;
}

export function parseProductCode(code: string): ProductCodeParts | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('SV-')) {
    const m = trimmed.match(/^SV-(.+)-(\d{2})$/);
    if (!m) return null;
    return {
      brand: 'SV',
      regionCode: 'SV',
      destCode: null,
      typeSegment: m[1],
      sequence: m[2],
      raw: trimmed,
    };
  }

  if (trimmed.startsWith('AA-')) {
    const m = trimmed.match(/^AA-([^-]+)-([^-]+)-(.+)-(\d{2})$/);
    if (!m) return null;
    return {
      brand: 'AA',
      regionCode: m[1],
      destCode: m[2],
      typeSegment: m[3],
      sequence: m[4],
      raw: trimmed,
    };
  }

  return null;
}

export function formatCodeBreakdown(code: string): string {
  const parts = parseProductCode(code);
  if (!parts) return code;
  if (parts.brand === 'SV') {
    return `SV · ${parts.typeSegment} · ${parts.sequence}`;
  }
  return `AA · ${parts.regionCode} · ${parts.destCode} · ${parts.typeSegment} · ${parts.sequence}`;
}

export function validateProductCodeInput(input: ProductCodeInput): string | null {
  if (!input.dest.trim()) {
    return 'Please enter a destination tag.';
  }
  if (input.region === 'services') {
    return null;
  }
  if (!resolveDestCode(input.dest)) {
    return 'Choose a catalog destination from suggestions (e.g. Hanoi, Halong Bay) so the product code can be generated.';
  }
  return null;
}

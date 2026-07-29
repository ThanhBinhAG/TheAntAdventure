import type { ExtendedSupplier } from './types';

export type SupplierFilters = {
  search: string;
  region: string;
  tier: string;
};

export const EXTENDED_TAG_OPTIONS = [
  'Preferred',
  'Luxury',
  'Premium',
  'UHNW',
  'Exclusive',
  'Advance Book',
  'Seasonal',
  'Weather',
  'Private Only',
] as const;

export const EXTENDED_CATEGORY_OPTIONS = [
  { value: 'visa', label: 'Visa Services' },
  { value: 'fasttrack', label: 'Airport Fast Track' },
  { value: 'aviation', label: 'Aviation' },
  { value: 'river', label: 'River Sampan' },
  { value: 'coastal', label: 'Coastal Speedboat' },
  { value: 'park', label: 'National Park Boats' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'trekking', label: 'Trekking & Camping' },
  { value: 'wildlife', label: 'Wildlife Expert' },
  { value: 'artisan', label: 'Master Artisan' },
  { value: 'wellness', label: 'Luxury Wellness' },
  { value: 'events', label: 'Events & Decor' },
  { value: 'specguide', label: 'Specialist Guide' },
  { value: 'media', label: 'Media Production' },
  { value: 'safety', label: 'Security & Health' },
] as const;

const TAB_CAT_PRESELECT: Record<string, string> = {
  logistics: 'visa',
  water: 'river',
  adventure: 'cycling',
  experience: 'artisan',
  personnel: 'specguide',
};

export function preselectCategoryForTab(tab: string): string {
  return TAB_CAT_PRESELECT[tab] ?? 'visa';
}

export function supplierMatchesSearch(query: string, fields: (string | number | undefined | null)[]): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = fields
    .filter((v) => v != null && String(v).length > 0)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function filterByRegion<T extends { region?: string }>(items: T[], region: string): T[] {
  if (!region) return items;
  return items.filter((item) => item.region === region);
}

export function filterByTier(tags: string[] | undefined, tier: string): boolean {
  if (!tier) return true;
  return (tags || []).some((t) => t.toLowerCase() === tier.toLowerCase());
}

export function filterExtendedSuppliers(
  items: ExtendedSupplier[],
  cats: string[],
  filters: SupplierFilters
): ExtendedSupplier[] {
  return items.filter(
    (s) =>
      cats.includes(s.cat) &&
      supplierMatchesSearch(filters.search, [s.name, s.desc, s.location, s.email, s.phone, s.contact, s.subcat]) &&
      (!filters.region || s.region === filters.region) &&
      filterByTier(s.tags, filters.tier)
  );
}

export function nextSupplierId(prefix: string, existing: { id?: string }[]): string {
  const nums = existing
    .map((row) => {
      const id = row.id ?? '';
      if (!id.startsWith(prefix)) return NaN;
      const tail = id.slice(prefix.length);
      return parseInt(tail.replace(/\D/g, ''), 10);
    })
    .filter((n) => !isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  const pad = prefix.includes('HTL') ? 3 : 3;
  return `${prefix}${String(next).padStart(pad, '0')}`;
}

export function emptyExtendedSupplier(cat = 'visa'): ExtendedSupplier {
  return {
    id: '',
    cat,
    subcat: '',
    name: '',
    ename: '',
    contact: '',
    phone: '',
    email: '',
    location: '',
    region: 'national',
    rate: '',
    currency: 'USD',
    payment: '',
    contract: 'verbal',
    cancel: '',
    insurance: '',
    avail: '',
    desc: '',
    notes: '',
    tags: [],
    rating: '★★★★',
    status: 'Active',
  };
}

export const REG_BADGE: Record<string, string> = {
  north: '🏔 North',
  central: '🏯 Central',
  south: '🌿 South',
};

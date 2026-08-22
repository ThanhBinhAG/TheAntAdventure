import type { BackupData, PageSlug } from '../types';

/** v5 relational tables synced from Zustand arrays */
export const SYNC_ARRAY_TABLES = [
  'customers',
  'comms',
  'leads',
  'tour_drafts',
  'tour_outline_days',
  'bookings',
  'agents',
  'attractions',
  'guides',
  'products',
  'product_pricing',
  'finance',
  'accounts_receivable',
  'accounts_payable',
  'tax_reports',
  'staff',
  'tasks',
  'feedback',
  'contracts',
  'photo_folders',
  'photos',
  'cal_events',
  'dev_notes',
  'cruises',
  'transport',
  'restaurants',
  'hotels',
  'suppliers',
] as const;

export type SyncArrayTable = (typeof SYNC_ARRAY_TABLES)[number];

/** Customer profile modal — lazy on open. */
export const PROFILE_LAZY_TABLES: readonly SyncArrayTable[] = ['comms', 'bookings'] as const;

/**
 * Tables mirrored by route boot when visiting Tour Design / Planner / Sales.
 * Sidebar badges no longer global-fetch these — see `hooks/useSidebarBadges` + `/api/sidebar/badges`.
 */
export const SIDEBAR_BADGE_TABLES: readonly SyncArrayTable[] = [
  'leads',
  'tour_drafts',
  'tasks',
] as const;

/**
 * Tables fetched immediately when entering a CRM route (route-first boot).
 * Omitted slugs load nothing until explicitly needed (e.g. pricing catalog APIs).
 */
export const PAGE_BOOT_TABLES: Partial<Record<PageSlug, readonly SyncArrayTable[]>> = {
  dashboard: ['customers', 'leads', 'bookings', 'agents', 'feedback'],
  planner: ['cal_events'],
  customers: ['customers', 'leads', 'feedback'],
  agents: ['agents', 'customers', 'leads'],
  sales: ['leads', 'customers', 'comms', 'tour_drafts', 'bookings'],
  /** Customer, lead, hotel, and comm data are still owned by their existing loaders. */
  tourdesign: [
    'customers',
    'leads',
    'hotels',
    'comms',
  ],
  // Catalogue pages use the paginated server API. The full data set is loaded
  // only when a user opens a detail drawer or enters Manage mode.
  products: [],
  /** attractions deferred — Gallery lazy-loads for ?attraction= filter / delete unlink */
  gallery: ['photos', 'photo_folders'],
  /** Pricing loads its catalogue through Product/Pricing BFF routes. */
  pricing: [],
  bookings: ['bookings', 'customers'],
  contracts: ['contracts', 'bookings'],
  suppliers: ['hotels', 'transport', 'restaurants', 'cruises', 'suppliers'],
  guides: ['guides'],
  attractions: ['photos', 'photo_folders'],
  /** Covers come from destinations API; no gallery hydrate on this route. */
  weather: [],
  posttour: ['feedback'],
  finance: ['finance', 'accounts_receivable', 'accounts_payable'],
  tax: ['tax_reports'],
  salary: ['staff'],
  hr: ['staff'],
  devnotes: ['dev_notes'],
  teamchat: [],
};

/** @deprecated Use PAGE_BOOT_TABLES — kept for wave-1 full hydrate. */
export const SHELL_HYDRATE_TABLES: readonly SyncArrayTable[] = [
  'customers',
  'leads',
  'bookings',
  'agents',
  'feedback',
  'tasks',
  'tour_drafts',
] as const;

/** @deprecated Messages only on teamchat / manual load. */
export const SHELL_HYDRATE_MESSAGES = false;

/** Unique boot tables for a route. */
export function bootTablesForPage(slug: PageSlug): SyncArrayTable[] {
  const boot = PAGE_BOOT_TABLES[slug];
  if (!boot?.length) return [];
  return [...new Set(boot)];
}

/**
 * Legacy extras — merged into PAGE_BOOT_TABLES; kept empty for compat.
 * @deprecated Use PAGE_BOOT_TABLES only.
 */
export const PAGE_HYDRATE_TABLES: Partial<Record<PageSlug, readonly SyncArrayTable[]>> = {};

/** @deprecated Use bootTablesForPage */
export function tablesForPage(slug: PageSlug): SyncArrayTable[] {
  return bootTablesForPage(slug);
}

/**
 * Legacy full-hydrate wave order (ensureAllTablesLoaded / migration).
 */
export const SYNC_HYDRATE_WAVES: SyncArrayTable[][] = [
  ['customers', 'leads', 'bookings', 'agents', 'feedback', 'tasks', 'tour_drafts'],
  [
    'comms',
    'tour_outline_days',
    'guides',
    'products',
    'product_pricing',
    'finance',
    'accounts_receivable',
    'accounts_payable',
    'tax_reports',
    'staff',
    'contracts',
    'cal_events',
    'dev_notes',
    'cruises',
    'transport',
    'restaurants',
    'hotels',
    'suppliers',
  ],
  ['photo_folders', 'photos', 'attractions'],
];

/** True when hydrate waves partition SYNC_ARRAY_TABLES exactly once. */
export function hydrateWavesCoverAllTables(): boolean {
  const seen = new Set<string>();
  for (const wave of SYNC_HYDRATE_WAVES) {
    for (const table of wave) {
      if (seen.has(table)) return false;
      seen.add(table);
    }
  }
  return seen.size === SYNC_ARRAY_TABLES.length && SYNC_ARRAY_TABLES.every((t) => seen.has(t));
}

/**
 * FK-safe push order. Tables in the same wave may run in parallel;
 * each wave completes before the next starts.
 */
export const SYNC_PUSH_WAVES: SyncArrayTable[][] = [
  [
    'customers',
    'agents',
    'guides',
    'leads',
    'tour_drafts',
    'products',
    'staff',
    'tax_reports',
    'tasks',
    'feedback',
    'contracts',
    'dev_notes',
    'cruises',
    'transport',
    'restaurants',
    'hotels',
    'suppliers',
    'comms',
    'photo_folders',
  ],
  ['tour_outline_days'],
  ['bookings'],
  ['product_pricing', 'photos'],
  ['attractions'],
  ['finance'],
  ['accounts_receivable', 'accounts_payable'],
  ['cal_events'],
];

/** Maps Supabase v5 table name → Zustand / BackupData key */
export const TABLE_TO_STORE_KEY: Record<SyncArrayTable, keyof BackupData> = {
  customers: 'customers',
  comms: 'comms',
  leads: 'leads',
  tour_drafts: 'tourDrafts',
  tour_outline_days: 'tourOutlineDays',
  bookings: 'bookings',
  agents: 'agents',
  attractions: 'attractions',
  guides: 'guides',
  products: 'products',
  product_pricing: 'productPricing',
  finance: 'finance',
  accounts_receivable: 'ar',
  accounts_payable: 'ap',
  tax_reports: 'tax',
  staff: 'staff',
  tasks: 'tasks',
  feedback: 'feedback',
  contracts: 'contracts',
  photo_folders: 'photoFolders',
  photos: 'photos',
  cal_events: 'calEvents',
  dev_notes: 'devNotes',
  cruises: 'cruises',
  transport: 'transport',
  restaurants: 'restaurants',
  hotels: 'hotels',
  suppliers: 'specialSuppliers',
};

export const MESSAGES_TABLE = 'chat_messages' as const;

/**
 * Nested/child tables counted in health checks via PostgREST `countTable`
 * (not exposed on `db[table]` — only parent SyncArrayTables are).
 */
export const HEALTH_CHILD_COUNT_TABLES = [
  'booking_itinerary',
  'booking_activities',
  'hotel_rooms',
  'attraction_photos',
] as const;

/** Tables included in health-check row counts */
export const HEALTH_COUNT_TABLES = [
  ...SYNC_ARRAY_TABLES,
  ...HEALTH_CHILD_COUNT_TABLES,
  MESSAGES_TABLE,
] as const;

export function countBackupRows(backup: BackupData): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const table of SYNC_ARRAY_TABLES) {
    const key = TABLE_TO_STORE_KEY[table];
    const rows = backup[key];
    counts[table] = Array.isArray(rows) ? rows.length : 0;
  }
  let msgCount = 0;
  for (const list of Object.values(backup.messages ?? {})) {
    if (Array.isArray(list)) msgCount += list.length;
  }
  counts[MESSAGES_TABLE] = msgCount;
  return counts;
}

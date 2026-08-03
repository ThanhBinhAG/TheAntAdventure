import type { BackupData } from '../types';

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

/** Tables included in health-check row counts */
export const HEALTH_COUNT_TABLES = [
  ...SYNC_ARRAY_TABLES,
  'booking_itinerary',
  'booking_activities',
  'tour_outline_days',
  'hotel_rooms',
  'attraction_photos',
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

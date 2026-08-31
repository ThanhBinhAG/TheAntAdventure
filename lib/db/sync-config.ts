import type { BackupData } from '../types';

/** v5 relational tables mirrored in Zustand for UI cache (BFF is source of truth for writes). */
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

/** Tables used by sidebar badge count logic when mirrored in Zustand. */
export const SIDEBAR_BADGE_TABLES: readonly SyncArrayTable[] = [
  'leads',
  'tour_drafts',
  'tasks',
] as const;

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

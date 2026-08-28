import assert from 'node:assert/strict';
import test from 'node:test';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';
import { PAGE_BOOT_TABLES, SHELL_HYDRATE_TABLES } from '@/lib/db/sync-config';

const SCOPED_ROUTE_SLUGS = [
  'planner',
  'customers',
  'agents',
  'sales',
  'tourdesign',
  'products',
  'pricing',
  'pricing-essentials',
  'pricing-accommodation',
  'gallery',
  'attractions',
  'weather',
] as const;

const SCOPED_SYNC_TABLES = [
  'customers',
  'comms',
  'agents',
  'leads',
  'tasks',
  'attractions',
  'tour_drafts',
  'tour_outline_days',
  'products',
  'product_pricing',
  'photos',
  'photo_folders',
] as const;

test('all nine scoped BFF features bypass legacy browser hydrate and auto-sync', () => {
  for (const slug of SCOPED_ROUTE_SLUGS) {
    assert.equal((PAGE_BOOT_TABLES[slug] ?? []).length, 0, `${slug} must not boot Supabase tables`);
  }

  const shell = SHELL_HYDRATE_TABLES as readonly string[];
  for (const table of SCOPED_SYNC_TABLES) {
    assert.equal(BFF_MANAGED_TABLES.has(table), true, `${table} must be BFF-managed`);
    assert.equal(shell.includes(table), false, `${table} must not be in legacy shell hydrate`);
  }

  // These deferred domains are intentionally untouched by this scoped cutover.
  assert.equal(shell.includes('bookings'), false);
  assert.equal(shell.includes('feedback'), true);
});

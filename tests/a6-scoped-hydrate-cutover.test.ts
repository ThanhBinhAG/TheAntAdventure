import assert from 'node:assert/strict';
import test from 'node:test';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';

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

test('scoped Dev A BFF tables stay BFF-managed after D2.13 stack removal', () => {
  for (const table of SCOPED_SYNC_TABLES) {
    assert.equal(BFF_MANAGED_TABLES.has(table), true, `${table} must be BFF-managed`);
  }
});

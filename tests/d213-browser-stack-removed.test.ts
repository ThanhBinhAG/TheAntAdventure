import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';
import { SYNC_ARRAY_TABLES } from '@/lib/db/sync-config';

const ROOT = process.cwd();

const REMOVED_PATHS = [
  'lib/db/hydrate.ts',
  'lib/db/auto-sync.ts',
  'lib/db/sync-push.ts',
  'lib/db/remote-delete.ts',
  'lib/db/sync-lifecycle.ts',
  'lib/db/sync-policy.ts',
  'lib/db/route-cache.ts',
  'lib/db/shell-cache.ts',
  'lib/db/supabase.ts',
  'lib/supabase/client.ts',
  'lib/supabase/index.ts',
  'components/AutoSyncListener.tsx',
  'components/PageDataGate.tsx',
  'lib/context/SupabaseContext.tsx',
];

test('D2.13 removed legacy browser Supabase stack modules', () => {
  for (const rel of REMOVED_PATHS) {
    assert.equal(existsSync(join(ROOT, rel)), false, `${rel} must be deleted`);
  }
  assert.equal(existsSync(join(ROOT, 'lib/db/sync-guard.ts')), true);
});

test('all sync array tables remain BFF-managed after D2.13', () => {
  for (const table of SYNC_ARRAY_TABLES) {
    assert.equal(BFF_MANAGED_TABLES.has(table), true, `${table} must stay BFF-managed`);
  }
});

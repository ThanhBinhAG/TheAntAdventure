import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('Travel Styles can be deleted only through the guarded customer-write endpoint', () => {
  const root = process.cwd();
  const migration = join(root, 'supabase/migrations/20260902041500_allow_travel_style_deletion.sql');
  const guardMigration = join(root, 'supabase/migrations/20260902041926_guard_used_travel_style_deletion.sql');
  const route = readFileSync(join(root, 'app/api/customers/travel-styles/route.ts'), 'utf8');
  const repository = readFileSync(join(root, 'lib/customers/travel-style-repository.ts'), 'utf8');
  const manager = readFileSync(join(root, 'components/customers/TravelStyleManagerModal.tsx'), 'utf8');

  assert.equal(existsSync(migration), true);
  assert.match(readFileSync(migration, 'utf8'), /grant delete on table public\.travel_styles to authenticated/i);
  assert.match(readFileSync(guardMigration, 'utf8'), /prevent_used_travel_style_delete/i);
  assert.match(readFileSync(guardMigration, 'utf8'), /from public\.customers/i);
  assert.match(route, /export const DELETE/);
  assert.match(route, /requiredPermission: 'customers\.write'/);
  assert.match(repository, /from\('customers'\)/);
  assert.match(repository, /delete\(\)/);
  assert.match(manager, /confirmDialog\(/);
  assert.doesNotMatch(manager, /window\.confirm\(/);
});

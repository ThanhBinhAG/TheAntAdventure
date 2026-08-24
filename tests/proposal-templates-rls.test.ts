import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260824033627_protect_proposal_templates_permissions.sql'),
  'utf8'
);

test('proposal templates require Tour Design permissions at the database boundary', () => {
  assert.match(migration, /revoke all on table public\.proposal_templates from anon;/);
  assert.match(migration, /grant select on table public\.proposal_templates to authenticated;/);
  assert.match(migration, /grant insert, update on table public\.proposal_templates to authenticated;/);
  assert.match(migration, /drop policy if exists authenticated_access on public\.proposal_templates;/);
  assert.match(migration, /create policy rls_proposal_templates_select[\s\S]*?public\.has_permission\('tour_design\.read'\)/);
  assert.match(migration, /create policy rls_proposal_templates_insert[\s\S]*?public\.has_permission\('tour_design\.write'\)/);
  assert.match(migration, /create policy rls_proposal_templates_update[\s\S]*?public\.has_permission\('tour_design\.write'\)/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(
  'supabase/migrations/20260816081452_add_core_owner_attribution_triggers.sql',
  'utf8',
);

test('core owner attribution only runs when a record is inserted', () => {
  for (const table of ['customers', 'leads', 'tour_drafts', 'bookings', 'tasks', 'comms']) {
    assert.match(sql, new RegExp(`before insert on public\\.${table}`, 'i'));
  }

  assert.doesNotMatch(sql, /before insert or update/i);
  assert.match(sql, /coalesce\(inherited_owner_id, auth\.uid\(\)/i);
  assert.match(sql, /revoke all on function private\.assign_customer_owner\(\) from public/i);
});

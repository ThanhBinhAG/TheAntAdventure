import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const migrationPath = new URL(
  '../supabase/migrations/20260901130630_retire_assigned_scope_logic.sql',
  import.meta.url,
);

test('retired Assigned scopes are hidden, rejected, and cannot grant booking or task access', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /where r\.is_system = false\s+and rrs\.scope in \('own', 'all'\)/);
  assert.match(sql, /scope not in \('own', 'all'\)/);
  assert.match(sql, /drop function if exists public\.set_core_record_assignee\(text, text, uuid\)/);

  for (const policy of [
    'rls_bookings_select',
    'rls_bookings_insert',
    'rls_bookings_update',
    'rls_bookings_delete',
    'rls_tasks_select',
    'rls_tasks_insert',
    'rls_tasks_update',
    'rls_tasks_delete',
  ]) {
    assert.match(sql, new RegExp(`drop policy if exists ${policy} on public\\.`));
  }

  const bookingAccessFunction = sql.match(
    /create or replace function private\.can_access_booking_record\([\s\S]*?\n\$function\$;/,
  )?.[0] ?? '';
  assert.doesNotMatch(bookingAccessFunction, /assigned_user_id|array\['assigned'\]/);
});

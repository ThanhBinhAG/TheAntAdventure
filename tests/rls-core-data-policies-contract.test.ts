import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(
  'supabase/migrations/20260816111141_enforce_core_resource_rls.sql',
  'utf8',
);

test('core RLS policies require both RBAC permission and a configured data scope', () => {
  assert.match(sql, /create or replace function private\.can_access_core_resource/i);
  assert.match(sql, /public\.has_permission\(required_permission\)/i);
  assert.match(sql, /private\.has_resource_scope/i);

  for (const table of ['customers', 'leads', 'tour_drafts', 'bookings', 'tasks', 'comms']) {
    assert.match(sql, new RegExp(`create policy rls_${table}_select`, 'i'));
    assert.match(sql, new RegExp(`create policy rls_${table}_insert`, 'i'));
    assert.match(sql, new RegExp(`create policy rls_${table}_update`, 'i'));
    assert.match(sql, new RegExp(`create policy rls_${table}_delete`, 'i'));
  }

  assert.match(sql, /drop policy if exists authenticated_access on public\.customers/i);
  assert.match(sql, /owner_user_id = \(select auth\.uid\(\)\)/i);
});

test('dependent tour and booking tables inherit the parent record scope efficiently', () => {
  for (const table of [
    'tour_outline_days',
    'booking_changes',
    'booking_itinerary',
    'booking_activities',
  ]) {
    assert.match(sql, new RegExp(`create policy rls_${table}_select`, 'i'));
    assert.match(sql, new RegExp(`create policy rls_${table}_insert`, 'i'));
    assert.match(sql, new RegExp(`create policy rls_${table}_update`, 'i'));
    assert.match(sql, new RegExp(`create policy rls_${table}_delete`, 'i'));
  }

  assert.match(sql, /idx_booking_changes_booking_id/i);
  assert.match(sql, /idx_booking_activities_itinerary_id/i);
  assert.match(sql, /can_access_booking_record/i);
  assert.match(sql, /can_access_tour_draft_record/i);
});

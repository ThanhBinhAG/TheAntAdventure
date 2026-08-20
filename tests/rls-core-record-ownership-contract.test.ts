import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('core RLS ownership migration keeps ownership nullable and indexed', () => {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20260816074357_add_core_record_ownership.sql'), 'utf8');
  for (const column of ['customers.owner_user_id', 'leads.owner_user_id', 'tour_drafts.owner_user_id', 'bookings.owner_user_id', 'bookings.assigned_user_id', 'tasks.creator_user_id', 'tasks.assignee_user_id', 'comms.access_owner_user_id']) assert.match(sql, new RegExp(column.replace('.', "[\\s\\S]{0,180}"), 'i'));
  assert.doesNotMatch(sql, /set not null/i);
  assert.match(sql, /on delete set null/i);
  assert.match(sql, /idx_tasks_assignee_user_id/i);
});

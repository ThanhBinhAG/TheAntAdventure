import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Guide calendar uses CRM BFF instead of browser auto-sync', () => {
  const calendar = source('components/guides/GuideCalendar.tsx');
  const hook = source('hooks/useCalEventsPage.ts');
  const createHook = source('hooks/useCreateCalEvent.ts');
  const deleteHook = source('hooks/useDeleteCalEvent.ts');

  assert.match(calendar, /useCalEventsPage/);
  assert.match(calendar, /useCreateCalEvent/);
  assert.match(calendar, /useDeleteCalEvent/);
  assert.doesNotMatch(calendar, /addCalEvent\(\{ id: `CE-/);
  assert.doesNotMatch(calendar, /lib\/supabase\/client/);

  assert.match(hook, /getBffArray/);
  assert.match(hook, /\/api\/cal-events/);
  assert.match(hook, /withoutAutoSyncAsync/);
  assert.match(createHook, /\/api\/cal-events/);
  assert.match(deleteHook, /\/api\/cal-events\//);
});

test('Cal events API routes enforce guides.read / guides.write', () => {
  const listRoute = source('app/api/cal-events/route.ts');
  const deleteRoute = source('app/api/cal-events/[id]/route.ts');
  assert.match(listRoute, /requiredPermission: 'guides\.read'/);
  assert.match(listRoute, /requiredPermission: 'guides\.write'/);
  assert.match(deleteRoute, /requiredPermission: 'guides\.write'/);
  assert.match(source('lib/cal-events/cal-events-repository.ts'), /import 'server-only'/);
  assert.match(source('lib/cal-events/cal-events-repository.ts'), /assertGuideExists/);
});

test('cal-events-bff tables are BFF-managed', () => {
  assert.equal(BFF_MANAGED_TABLES.has('cal_events'), true);
});


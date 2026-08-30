import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import { nextFeedbackId } from '@/lib/feedback/feedback-ids';
import {
  feedbackCreateRequestSchema,
  feedbackSchema,
} from '@/lib/feedback/feedback-input';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';
import { ROUTE_CACHE_DENYLIST } from '@/lib/db/route-cache';
import { PAGE_BOOT_TABLES, SHELL_HYDRATE_TABLES } from '@/lib/db/sync-config';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Post-tour page uses CRM BFF instead of Zustand auto-sync writes', () => {
  const page = source('components/post-tour/PostTourPage.tsx');
  const listHook = source('hooks/useFeedbackPage.ts');
  const createHook = source('hooks/useCreateFeedback.ts');

  assert.match(page, /useFeedbackPage/);
  assert.match(page, /useCreateFeedback/);
  assert.match(page, /useEnsureBookingsCatalogLoaded/);
  assert.doesNotMatch(page, /\baddFeedback\s*=\s*useStore/);
  assert.doesNotMatch(page, /lib\/supabase\/client/);

  assert.match(listHook, /getBffArray/);
  assert.match(listHook, /\/api\/feedback/);
  assert.match(listHook, /withoutAutoSyncAsync/);
  assert.match(createHook, /fetch\('\/api\/feedback'/);
  assert.match(createHook, /withoutAutoSyncAsync/);
});

test('Feedback BFF contracts validate create payloads', () => {
  const badClient = feedbackCreateRequestSchema.safeParse({
    feedback: { type: 'client', bkid: 'BK-2026-001' },
  });
  assert.equal(badClient.success, false);

  const okClient = feedbackCreateRequestSchema.safeParse({
    feedback: {
      type: 'client',
      bkid: 'BK-2026-001',
      client: 'Sarah Mitchell',
      nps: 10,
      overall: '5',
    },
  });
  assert.equal(okClient.success, true);

  const badAgent = feedbackSchema.safeParse({ type: 'agent', bkid: 'BK-2026-001' });
  assert.equal(badAgent.success, true);
  const badAgentReq = feedbackCreateRequestSchema.safeParse({
    feedback: { type: 'agent' },
  });
  assert.equal(badAgentReq.success, false);

  assert.equal(nextFeedbackId([{ id: 'FB-001' }, { id: 'FB-005' }]), 'FB-006');
});

test('Feedback API routes enforce posttour.read / posttour.write', () => {
  const listRoute = source('app/api/feedback/route.ts');
  const idRoute = source('app/api/feedback/[id]/route.ts');
  assert.match(listRoute, /requiredPermission: 'posttour\.read'/);
  assert.match(listRoute, /requiredPermission: 'posttour\.write'/);
  assert.match(idRoute, /requiredPermission: 'posttour\.read'/);
  assert.match(listRoute, /createFeedbackServer/);
  assert.match(source('lib/feedback/feedback-repository.ts'), /import 'server-only'/);
  assert.match(source('lib/feedback/feedback-repository.ts'), /invalidateDashboardCache/);
});

test('Feedback hydrate cutover: empty boot, denylist, no shell hydrate', () => {
  assert.equal((PAGE_BOOT_TABLES.posttour ?? []).length, 0);
  assert.equal(BFF_MANAGED_TABLES.has('feedback'), true);
  assert.equal((SHELL_HYDRATE_TABLES as readonly string[]).includes('feedback'), false);
  assert.equal((ROUTE_CACHE_DENYLIST as readonly string[]).includes('feedback'), true);
});

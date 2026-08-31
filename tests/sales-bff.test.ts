import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  LEAD_PAGE_SIZES,
  leadListQuerySchema,
  leadPatchBodySchema,
} from '@/lib/sales/lead-list-input';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('lead list query accepts filters and scope', () => {
  const parsed = leadListQuerySchema.safeParse({
    page: '2',
    pageSize: '24',
    q: 'smith',
    scope: 'pipeline',
    timeMode: 'followUpToday',
    sortField: 'weighted',
    sortDirection: 'desc',
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.page, 2);
  assert.equal(parsed.data.pageSize, 24);
  assert.equal(parsed.data.q, 'smith');
  assert.equal(parsed.data.scope, 'pipeline');
  assert.ok((LEAD_PAGE_SIZES as readonly number[]).includes(parsed.data.pageSize));
});

test('lead patch body requires at least one field', () => {
  const empty = leadPatchBodySchema.safeParse({});
  assert.equal(empty.success, false);

  const ok = leadPatchBodySchema.safeParse({
    stage: 'Negotiation',
    probability: 50,
    followUpDate: '2026-08-24',
  });
  assert.equal(ok.success, true);

  const lost = leadPatchBodySchema.safeParse({
    stage: 'Lost',
    probability: 0,
    lostReason: 'Price too high',
    lostNote: 'Budget cut',
  });
  assert.equal(lost.success, true);
});

test('Sales BFF cutover: API hooks and denylist', () => {
  const bffManaged = source('lib/db/bff-managed-tables.ts');
  const salesPage = source('components/sales/SalesPage.tsx');
  const listHook = source('hooks/useSalesPage.ts');
  const patchHook = source('hooks/useUpdateLead.ts');
  const confirmHook = source('hooks/useConfirmLead.ts');
  const approveHook = source('hooks/useApproveLeadOutline.ts');
  const api = source('app/api/leads/route.ts');
  const apiId = source('app/api/leads/[id]/route.ts');
  const apiConfirm = source('app/api/leads/[id]/confirm/route.ts');
  const apiApprove = source('app/api/leads/[id]/approve-outline/route.ts');

  assert.match(bffManaged, /'leads'/);
  assert.match(bffManaged, /'comms'/);
  assert.match(bffManaged, /'bookings'/);
  assert.match(listHook, /\/api\/leads/);
  assert.match(listHook, /fetchLeadJsonOnce/);
  assert.match(patchHook, /\/api\/leads/);
  assert.match(patchHook, /withoutAutoSyncAsync/);
  assert.match(confirmHook, /\/confirm/);
  assert.match(confirmHook, /withoutAutoSyncAsync/);
  assert.match(approveHook, /approve-outline/);
  assert.match(approveHook, /withoutAutoSyncAsync/);
  assert.match(salesPage, /useSalesPage/);
  assert.match(salesPage, /useUpdateLead/);
  assert.match(salesPage, /useConfirmLead/);
  assert.match(salesPage, /useApproveLeadOutline/);
  assert.doesNotMatch(salesPage, /\bupdateLead\s*=\s*useStore/);
  assert.doesNotMatch(salesPage, /\baddBooking\s*=\s*useStore/);
  assert.match(api, /sales\.read/);
  assert.match(apiId, /sales\.write/);
  assert.match(apiConfirm, /sales\.write/);
  assert.match(apiApprove, /sales\.write/);
});

test('Sales page uses CRM BFF without browser hydrate', () => {
  const page = source('components/sales/SalesPage.tsx');
  assert.match(page, /useSalesPage/);
  assert.doesNotMatch(page, /lib\/db\/hydrate/);
});

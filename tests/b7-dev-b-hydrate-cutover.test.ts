import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  customerCommCreateBodySchema,
  customerInquiryBodySchema,
} from '@/lib/customers/customer-list-input';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';
import {
  PAGE_BOOT_TABLES,
  PROFILE_LAZY_TABLES,
  SHELL_HYDRATE_TABLES,
} from '@/lib/db/sync-config';
import { ROUTE_CACHE_DENYLIST } from '@/lib/db/route-cache';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('PAGE_BOOT_TABLES empty for migrated Dev B routes', () => {
  for (const slug of [
    'customers',
    'agents',
    'sales',
    'gallery',
    'weather',
    'dashboard',
  ] as const) {
    const boot = PAGE_BOOT_TABLES[slug] ?? [];
    assert.equal(boot.length, 0, `${slug} boot must be empty`);
  }
  // Non-migrated domains still boot (B7 does not empty these).
  assert.ok((PAGE_BOOT_TABLES.bookings ?? []).includes('bookings'));
  assert.ok((PAGE_BOOT_TABLES.bookings ?? []).includes('customers'));
  assert.ok((PAGE_BOOT_TABLES.contracts ?? []).includes('bookings'));
});

test('BFF_MANAGED_TABLES denylist covers Dev B CRM tables', () => {
  for (const table of [
    'customers',
    'agents',
    'leads',
    'comms',
    'bookings',
    'photos',
    'photo_folders',
  ] as const) {
    assert.equal(BFF_MANAGED_TABLES.has(table), true, `denylist must include ${table}`);
  }
});

test('SHELL_HYDRATE_TABLES excludes Dev B CRM tables', () => {
  const shell = SHELL_HYDRATE_TABLES as readonly string[];
  for (const table of ['customers', 'leads', 'agents']) {
    assert.equal(shell.includes(table), false, `shell must not include ${table}`);
  }
  for (const table of ['bookings', 'feedback', 'tasks', 'tour_drafts']) {
    assert.equal(shell.includes(table), true, `shell must keep ${table}`);
  }
});

test('ROUTE_CACHE_DENYLIST includes Dev B CRM tables', () => {
  const deny = ROUTE_CACHE_DENYLIST as readonly string[];
  for (const table of [
    'photos',
    'photo_folders',
    'customers',
    'agents',
    'leads',
    'comms',
    'bookings',
  ]) {
    assert.equal(deny.includes(table), true, `denylist must include ${table}`);
  }
});

test('PROFILE_LAZY_TABLES is empty (profile uses BFF)', () => {
  assert.equal(PROFILE_LAZY_TABLES.length, 0);
});

test('CustomerProfileModal writes go through profile mutation BFF hooks', () => {
  const modal = source('components/customers/CustomerProfileModal.tsx');
  const mutations = source('hooks/useCustomerProfileMutations.ts');

  assert.match(modal, /useCustomerProfileMutations/);
  assert.match(modal, /createInquiry/);
  assert.match(modal, /logCommRemote|logComm/);
  assert.doesNotMatch(modal, /createInquiryLeadForCustomer/);
  assert.doesNotMatch(modal, /addLead\s*=\s*useStore/);
  assert.doesNotMatch(modal, /addComm\s*=\s*useStore/);

  assert.match(mutations, /\/api\/customers\/.*\/inquiry/);
  assert.match(mutations, /\/api\/customers\/.*\/comms/);
  assert.match(mutations, /withoutAutoSyncAsync/);
});

test('Tour Design ack remains on CRM acknowledgements BFF', () => {
  const page = source('components/tour-design/TourDesignPage.tsx');
  const ackStart = page.indexOf('const persistTourDesignAck = useCallback');
  const ackEnd = page.indexOf('const openLeadSession = useCallback', ackStart);
  assert.ok(ackStart >= 0 && ackEnd > ackStart);
  const ack = page.slice(ackStart, ackEnd);
  assert.match(ack, /\/api\/tour-design\/acknowledgements/);
  assert.doesNotMatch(ack, /persistCustomerRowsNow|scheduleAutoSync/);
});

test('customer inquiry / comms Zod contracts', () => {
  const inquiry = customerInquiryBodySchema.safeParse({});
  assert.equal(inquiry.success, true);
  if (inquiry.success) {
    assert.equal(inquiry.data.flagTourDesign, true);
  }

  const badComm = customerCommCreateBodySchema.safeParse({
    type: 'Email',
    dir: 'outbound',
    date: '2026-08-25',
    subj: '',
  });
  assert.equal(badComm.success, false);

  const okComm = customerCommCreateBodySchema.safeParse({
    type: 'Email',
    dir: 'outbound',
    date: '2026-08-25',
    subj: 'Hello',
    body: 'Body',
  });
  assert.equal(okComm.success, true);
});

test('profile inquiry/comms API routes enforce customers.write', () => {
  const inquiry = source('app/api/customers/[id]/inquiry/route.ts');
  const comms = source('app/api/customers/[id]/comms/route.ts');
  assert.match(inquiry, /customers\.write/);
  assert.match(inquiry, /createCustomerInquiry/);
  assert.match(comms, /customers\.write/);
  assert.match(comms, /createCustomerComm/);
});

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import {
  customerCommCreateBodySchema,
  customerInquiryBodySchema,
} from '@/lib/customers/customer-list-input';
import { BFF_MANAGED_TABLES } from '@/lib/db/bff-managed-tables';

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('BFF_MANAGED_TABLES denylist covers Dev B CRM tables', () => {
  for (const table of [
    'customers',
    'agents',
    'leads',
    'comms',
    'bookings',
    'contracts',
    'photos',
    'photo_folders',
  ] as const) {
    assert.equal(BFF_MANAGED_TABLES.has(table), true, `denylist must include ${table}`);
  }
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
  assert.doesNotMatch(ack, /lib\/db\/hydrate|lib\/db\/auto-sync/);
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

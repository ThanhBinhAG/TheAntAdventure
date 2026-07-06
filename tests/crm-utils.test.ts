import test from 'node:test';
import assert from 'node:assert/strict';
import { customerMatchesSearch, getClientLeads, getClientPipeline } from '../lib/crm-utils';
import type { Customer, Lead } from '../lib/types';

const leads: Lead[] = [
  { id: 'LD-1', custId: 'CUS-1', tour: 'A', pax: 2, value: 1000, month: 'Jun 2026', stage: 'Inquiry', owner: 'Tai' },
  { id: 'LD-2', custId: 'CUS-1', tour: 'B', pax: 2, value: 2000, month: 'Jul 2026', stage: 'On Tour', owner: 'Tai' },
];

test('getClientPipeline prefers On Tour over Inquiry', () => {
  const p = getClientPipeline('CUS-1', leads);
  assert.equal(p.stage, 'On Tour');
  assert.equal(p.count, 2);
});

test('getClientPipeline recognizes Pending stage', () => {
  const pendingLeads: Lead[] = [
    { id: 'LD-3', custId: 'CUS-2', tour: 'C', pax: 1, value: 500, month: 'Aug 2026', stage: 'Pending', owner: 'Tai' },
  ];
  const p = getClientPipeline('CUS-2', pendingLeads);
  assert.equal(p.stage, 'Pending');
});

test('getClientLeads sorts by stage order then id', () => {
  const sorted = getClientLeads('CUS-1', leads);
  assert.deepEqual(
    sorted.map((l) => l.id),
    ['LD-2', 'LD-1']
  );
});

test('getClientLeads excludes Lost by default', () => {
  const withLost: Lead[] = [
    ...leads,
    { id: 'LD-9', custId: 'CUS-1', tour: 'Lost', pax: 1, value: 0, month: 'Jan 2026', stage: 'Lost', owner: 'Tai' },
  ];
  assert.equal(getClientLeads('CUS-1', withLost).length, 2);
  assert.equal(getClientLeads('CUS-1', withLost, { includeLost: true }).length, 3);
});

const sampleCustomer: Customer = {
  id: 'CUS-26-001',
  name: 'James Miller',
  email: 'j.miller@gmail.com',
  phone: '+1 415 555 0100',
  country: 'USA',
  nat: 'American',
  source: 'Referral',
  style: 'Luxury',
  lang: 'English',
  notes: '',
  bookings: [],
  agentName: 'Virtuoso',
  whatsapp: '+1 415 555 0199',
};

test('customerMatchesSearch matches name email phone id and agent', () => {
  assert.equal(customerMatchesSearch(sampleCustomer, 'james'), true);
  assert.equal(customerMatchesSearch(sampleCustomer, '415 555 0100'), true);
  assert.equal(customerMatchesSearch(sampleCustomer, 'CUS-26-001'), true);
  assert.equal(customerMatchesSearch(sampleCustomer, 'virtuoso'), true);
  assert.equal(customerMatchesSearch(sampleCustomer, '555 0199'), true);
  assert.equal(customerMatchesSearch(sampleCustomer, 'nomatch'), false);
});

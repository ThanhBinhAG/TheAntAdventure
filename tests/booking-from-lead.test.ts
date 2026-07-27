import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBookingFromLead,
  ensureBookingForConfirmedLead,
  findBookingForLead,
  nextBookingId,
} from '../lib/booking-from-lead';
import type { Booking, Lead } from '../lib/types';

const lead: Lead = {
  id: 'LD-100',
  custId: 'CUS-26-001',
  tour: 'North Heritage 7D',
  pax: 2,
  value: 4000,
  month: 'Oct 2026',
  stage: 'Confirmed',
  owner: 'Tai',
  probability: 90,
};

test('nextBookingId increments for year prefix', () => {
  const existing: Booking[] = [
    {
      id: 'BK-2026-001',
      custId: 'CUS-1',
      tour: 'A',
      pax: 1,
      start: '',
      end: '',
      total: 0,
      deposit: 0,
      status: 'Confirmed',
      guide: '',
      hotel: '',
      changes: [],
      guideAlertPending: false,
    },
  ];
  assert.equal(nextBookingId(existing, 2026), 'BK-2026-002');
  assert.equal(nextBookingId([], 2026), 'BK-2026-001');
});

test('buildBookingFromLead maps lead fields and 30% deposit', () => {
  const booking = buildBookingFromLead(lead, []);
  assert.equal(booking.leadId, 'LD-100');
  assert.equal(booking.custId, 'CUS-26-001');
  assert.equal(booking.tour, 'North Heritage 7D');
  assert.equal(booking.pax, 2);
  assert.equal(booking.total, 4000);
  assert.equal(booking.deposit, 1200);
  assert.equal(booking.status, 'Confirmed');
  assert.equal(booking.start, 'Oct 2026');
  assert.match(booking.id, /^BK-20\d{2}-\d{3}$/);
});

test('ensureBookingForConfirmedLead is idempotent by leadId', () => {
  const first = ensureBookingForConfirmedLead(lead, []);
  assert.ok(first);
  assert.equal(findBookingForLead([first!], lead.id)?.id, first!.id);
  const second = ensureBookingForConfirmedLead(lead, [first!]);
  assert.equal(second, null);
});

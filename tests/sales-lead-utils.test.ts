import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterLeadsByTime,
  formatLeadTravelMonth,
  getUniqueTravelMonths,
  groupLeadsByTravelMonth,
  isFollowUpOverdue,
  leadMatchesSearch,
  normalizeLeadMonth,
  parseLeadTravelMonth,
  sortLeads,
} from '../lib/sales/sales-lead-utils';
import type { Customer, Lead } from '../lib/types';

const customers: Customer[] = [
  {
    id: 'CUS-1',
    name: 'Alice Nguyen',
    email: 'alice@example.com',
    phone: '',
    country: 'AU',
    nat: 'AU',
    source: 'Website',
    style: 'Adventure',
    lang: 'EN',
    notes: '',
    bookings: [],
  },
];

const sampleLeads: Lead[] = [
  { id: 'LD-1', custId: 'CUS-1', tour: 'Ha Giang 4D', pax: 2, value: 4800, month: 'Sep 2026', stage: 'Inquiry', owner: 'Tai', followUpDate: '2026-05-14' },
  { id: 'LD-2', custId: 'CUS-1', tour: 'Delta Tour', pax: 4, value: 2200, month: 'Jun 2026', stage: 'Quoted', owner: 'Tai', followUpDate: '2026-05-08' },
  { id: 'LD-3', custId: 'CUS-1', tour: 'Classic Tour', pax: 2, value: 680, month: 'Mar 2026', stage: 'Completed', owner: 'Tai' },
];

test('parseLeadTravelMonth parses Mon YYYY', () => {
  const mar = parseLeadTravelMonth('Mar 2026');
  const oct = parseLeadTravelMonth('Oct 2026');
  assert.ok(mar !== null && oct !== null);
  assert.ok(mar! < oct!);
  assert.equal(parseLeadTravelMonth('TBD'), null);
  assert.equal(parseLeadTravelMonth('invalid'), null);
});

test('leadMatchesSearch matches customer name and tour', () => {
  assert.equal(leadMatchesSearch(sampleLeads[0], 'alice', customers), true);
  assert.equal(leadMatchesSearch(sampleLeads[0], 'ha giang', customers), true);
  assert.equal(leadMatchesSearch(sampleLeads[0], 'LD-1', customers), true);
  assert.equal(leadMatchesSearch(sampleLeads[0], 'nomatch', customers), false);
});

test('filterLeadsByTime follow-up today', () => {
  const result = filterLeadsByTime(sampleLeads, { mode: 'followUpToday' }, '2026-05-14');
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, 'LD-1');
});

test('filterLeadsByTime overdue excludes completed', () => {
  const result = filterLeadsByTime(sampleLeads, { mode: 'overdue' }, '2026-05-15');
  assert.equal(result.length, 2);
  assert.ok(result.every((l) => l.id !== 'LD-3'));
});

test('filterLeadsByTime travel month', () => {
  const result = filterLeadsByTime(sampleLeads, { mode: 'travelMonth', travelMonth: 'Jun 2026' }, '2026-05-15');
  assert.equal(result.length, 1);
  assert.equal(result[0]?.id, 'LD-2');
});

test('filterLeadsByTime travel month requires selection', () => {
  const result = filterLeadsByTime(sampleLeads, { mode: 'travelMonth' }, '2026-05-15');
  assert.equal(result.length, 0);
});

test('formatLeadTravelMonth normalizes inputs', () => {
  assert.equal(formatLeadTravelMonth('Sep', undefined, 2026), 'Sep 2026');
  assert.equal(formatLeadTravelMonth('', '2026-07-15', 2026), 'Jul 2026');
  assert.equal(formatLeadTravelMonth('', '', 2026), 'TBD');
});

test('normalizeLeadMonth upgrades short month', () => {
  assert.equal(normalizeLeadMonth('Mar', 2026), 'Mar 2026');
  assert.equal(normalizeLeadMonth('2026-10', 2026), 'Oct 2026');
});

test('parseLeadTravelMonth accepts short month via normalize', () => {
  const ts = parseLeadTravelMonth('Sep');
  assert.ok(ts !== null);
});

test('getUniqueTravelMonths returns chronological order', () => {
  const months = getUniqueTravelMonths(sampleLeads);
  assert.deepEqual(months, ['Mar 2026', 'Jun 2026', 'Sep 2026']);
});

test('sortLeads by follow-up ascending', () => {
  const sorted = sortLeads(sampleLeads, { field: 'followUp', direction: 'asc' }, customers);
  assert.equal(sorted[0]?.id, 'LD-2');
  assert.equal(sorted[1]?.id, 'LD-1');
});

test('isFollowUpOverdue', () => {
  assert.equal(isFollowUpOverdue(sampleLeads[1], '2026-05-15'), true);
  assert.equal(isFollowUpOverdue(sampleLeads[2], '2026-05-15'), false);
});

test('groupLeadsByTravelMonth', () => {
  const groups = groupLeadsByTravelMonth(sampleLeads);
  assert.equal(groups.length, 3);
  assert.equal(groups[0]?.label, 'Mar 2026');
  assert.equal(groups[2]?.label, 'Sep 2026');
});

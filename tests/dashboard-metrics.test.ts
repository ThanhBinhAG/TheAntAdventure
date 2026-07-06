import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildConversionFunnel,
  computeDashboardMetrics,
  filterDashboardLeads,
  leadMatchesCalendarMonth,
  leadMatchesTravelMonth,
  toursByMonth,
} from '../lib/dashboard-metrics';
import type { Customer, Lead } from '../lib/types';

const customers: Customer[] = [
  {
    id: 'CUS-US',
    name: 'US Client',
    email: 'us@example.com',
    phone: '',
    country: 'USA',
    nat: 'US',
    source: 'Website',
    style: 'Luxury',
    lang: 'EN',
    notes: '',
    bookings: [],
  },
  {
    id: 'CUS-AU',
    name: 'AU Client',
    email: 'au@example.com',
    phone: '',
    country: 'Australia',
    nat: 'AU',
    source: 'Referral',
    style: 'Adventure',
    lang: 'EN',
    notes: '',
    bookings: [],
  },
];

const sampleLeads: Lead[] = [
  {
    id: 'LD-1',
    custId: 'CUS-US',
    tour: 'Ha Giang 4D',
    pax: 2,
    value: 4800,
    month: 'Sep 2026',
    stage: 'Inquiry',
    owner: 'Tai',
  },
  {
    id: 'LD-2',
    custId: 'CUS-AU',
    tour: 'Delta Tour',
    pax: 4,
    value: 2200,
    month: 'Jun 2026',
    stage: 'Quoted',
    owner: 'Tai',
    agentId: 'AGT-002',
    clientType: 'b2b',
  },
  {
    id: 'LD-3',
    custId: 'CUS-US',
    tour: 'Classic Tour',
    pax: 2,
    value: 680,
    month: 'Mar 2026',
    stage: 'Completed',
    owner: 'Tai',
  },
  {
    id: 'LD-4',
    custId: 'CUS-US',
    tour: 'Classic Tour B',
    pax: 2,
    value: 500,
    month: 'Mar 2026',
    stage: 'Completed',
    owner: 'Tai',
  },
  {
    id: 'LD-5',
    custId: 'CUS-AU',
    tour: 'Hue Tour',
    pax: 2,
    value: 900,
    month: 'Jun 2026',
    stage: 'Confirmed',
    owner: 'Tai',
    agentId: 'AGT-002',
  },
  {
    id: 'LD-6',
    custId: 'CUS-US',
    tour: 'Design Tour',
    pax: 2,
    value: 1000,
    month: 'Apr 2026',
    stage: 'Designing',
    owner: 'Tai',
  },
];

test('leadMatchesTravelMonth matches Mon YYYY exactly', () => {
  assert.equal(leadMatchesTravelMonth(sampleLeads[2], 'Mar', 2026), true);
  assert.equal(leadMatchesTravelMonth(sampleLeads[2], 'Apr', 2026), false);
  assert.equal(leadMatchesTravelMonth({ ...sampleLeads[2], month: 'TBD' }, 'Mar', 2026), false);
});

test('filterDashboardLeads B2B only keeps agent leads', () => {
  const b2b = filterDashboardLeads(sampleLeads, customers, { clientType: 'b2b', market: '' });
  assert.equal(b2b.length, 2);
  assert.ok(b2b.every((l) => l.agentId || l.clientType === 'b2b'));
});

test('filterDashboardLeads market USA', () => {
  const usa = filterDashboardLeads(sampleLeads, customers, { clientType: '', market: 'USA' });
  assert.ok(usa.every((l) => l.custId === 'CUS-US'));
  assert.equal(usa.length, 4);
});

test('leadMatchesCalendarMonth matches month across all years', () => {
  assert.equal(leadMatchesCalendarMonth(sampleLeads[2], 'Mar'), true);
  assert.equal(leadMatchesCalendarMonth({ ...sampleLeads[2], month: 'Mar 2024' }, 'Mar'), true);
  assert.equal(leadMatchesCalendarMonth(sampleLeads[2], 'Apr'), false);
});

test('toursByMonth counts Confirmed and Completed by calendar month (all years)', () => {
  const counts = toursByMonth(sampleLeads);
  assert.equal(counts[2], 2); // Mar — two Completed
  assert.equal(counts[5], 1); // Jun — one Confirmed
  assert.equal(counts[0], 0); // Jan

  const withLegacy = [
    ...sampleLeads,
    {
      id: 'LD-old',
      custId: 'CUS-US',
      tour: 'Legacy Tour',
      pax: 2,
      value: 400,
      month: 'Mar 2024',
      stage: 'Completed',
      owner: 'Tai',
    },
  ];
  const allYears = toursByMonth(withLegacy);
  assert.equal(allYears[2], 3); // Mar 2026 ×2 + Mar 2024 ×1
});

test('buildConversionFunnel computes conversion percentages', () => {
  const leads: Lead[] = [
    { id: 'a', custId: 'CUS-US', tour: 'A', pax: 1, value: 100, month: 'Jan 2026', stage: 'Inquiry', owner: 'Tai' },
    { id: 'b', custId: 'CUS-US', tour: 'B', pax: 1, value: 100, month: 'Jan 2026', stage: 'Inquiry', owner: 'Tai' },
    { id: 'c', custId: 'CUS-US', tour: 'C', pax: 1, value: 100, month: 'Jan 2026', stage: 'Designing', owner: 'Tai' },
  ];
  const funnel = buildConversionFunnel(leads);
  assert.equal(funnel.stageCounts[0], 2);
  assert.equal(funnel.stageCounts[1], 1);
  assert.equal(funnel.conversionPct[0], null);
  assert.equal(funnel.conversionPct[1], 50);
});

test('computeDashboardMetrics respects B2B filter across tours and funnel', () => {
  const all = computeDashboardMetrics(sampleLeads, [], customers, [], {
    clientType: '',
    market: '',
  });
  const b2bOnly = computeDashboardMetrics(sampleLeads, [], customers, [], {
    clientType: 'b2b',
    market: '',
  });

  assert.ok(all.toursByMonth.reduce((s, n) => s + n, 0) > b2bOnly.toursByMonth.reduce((s, n) => s + n, 0));
  assert.ok(all.stageCounts.reduce((s, n) => s + n, 0) > b2bOnly.stageCounts.reduce((s, n) => s + n, 0));
  assert.equal(b2bOnly.drafted, 0);
  assert.equal(all.drafted, 1);
});

test('computeDashboardMetrics uses normalized month for revenue by month', () => {
  const metrics = computeDashboardMetrics(sampleLeads, [], customers, [], {
    clientType: '',
    market: '',
  });
  assert.equal(metrics.realizedByMonth[2], 1180); // Mar: 680 + 500
});

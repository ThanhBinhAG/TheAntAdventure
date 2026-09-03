import {
  ANNUAL_REVENUE_TARGET_USD,
  DASHBOARD_MONTH_ABBR,
  STAGE_PROB_V22,
} from '../constants';
import { normalizeLeadMonth } from '../sales/sales-lead-utils';
import type { Booking, Customer, Lead } from '../types';

export const DASHBOARD_FUNNEL_STAGES = [
  'Inquiry',
  'Designing',
  'Quoted',
  'Negotiation',
  'Confirmed',
  'Completed',
] as const;

export const TOUR_COUNT_STAGES = ['Confirmed', 'On Tour', 'Completed'] as const;

const FORECAST_STAGES = ['Confirmed', 'Quoted', 'Negotiation', 'Designing', 'Pending'] as const;

export interface DashboardFilters {
  clientType: '' | 'b2b' | 'b2c';
  market: string;
}

export interface ConversionFunnel {
  stageNames: string[];
  stageCounts: number[];
  conversionPct: (number | null)[];
}

export interface DashboardMetrics {
  filteredLeads: Lead[];
  drafted: number;
  sent: number;
  pending: number;
  confirmed: Lead[];
  totalPax: number;
  totalVal: number;
  realized: number;
  completedLeads: Lead[];
  weightedForecast: number;
  filtered: Record<string, number>;
  hasMarketData: boolean;
  MONTHS: readonly string[];
  realizedByMonth: number[];
  forecastByMonth: number[];
  toursByMonth: number[];
  stageNames: string[];
  stageCounts: number[];
  conversionPct: (number | null)[];
  topTours: [string, number][];
  b2b: number;
  b2c: number;
  agentMap: Record<string, number>;
  avgNps: number | null;
  npsScores: number[];
  YTD_TARGET: number;
  ytdPct: number;
}

export interface DashboardFeedbackItem {
  nps?: number;
  custId?: string;
}

function leadMatchesClientType(lead: Lead, clientType: DashboardFilters['clientType']): boolean {
  if (!clientType) return true;
  if (clientType === 'b2b') {
    return lead.clientType === 'b2b' || (!lead.clientType && !!lead.agentId);
  }
  return lead.clientType === 'b2c' || (!lead.clientType && !lead.agentId);
}

export function filterDashboardLeads(
  leads: Lead[],
  customers: Customer[],
  filters: DashboardFilters
): Lead[] {
  let list = leads.filter((l) => leadMatchesClientType(l, filters.clientType));

  if (filters.market) {
    list = list.filter((l) => {
      const cust = customers.find((c) => c.id === l.custId);
      return cust?.country === filters.market;
    });
  }

  return list;
}

/** Customers matching dashboard clientType / market filters (for form-entered revenue). */
export function filterDashboardCustomers(
  customers: Customer[],
  filters: DashboardFilters,
): Customer[] {
  let list = customers;
  if (filters.clientType) {
    list = list.filter((c) => (c.clientType || 'b2c') === filters.clientType);
  }
  if (filters.market) {
    list = list.filter((c) => c.country === filters.market);
  }
  return list;
}

export function sumCustomerRevenue(customers: Customer[]): number {
  return customers.reduce((sum, c) => sum + (c.revenue && c.revenue > 0 ? c.revenue : 0), 0);
}

export function leadMatchesTravelMonth(lead: Lead, monthAbbr: string, year: number): boolean {
  const normalized = normalizeLeadMonth(lead.month || '');
  return normalized === `${monthAbbr} ${year}`;
}

/** Calendar month abbr (Jan–Dec) from lead travel month, any year. */
export function leadCalendarMonthAbbr(lead: Lead): string | null {
  const normalized = normalizeLeadMonth(lead.month || '');
  if (!normalized || normalized === 'TBD') return null;
  const match = normalized.match(/^([A-Za-z]{3})\s+\d{4}$/);
  return match ? match[1] : null;
}

/** Match calendar month across all years (e.g. Mar 2024 + Mar 2026 → Mar). */
export function leadMatchesCalendarMonth(lead: Lead, monthAbbr: string): boolean {
  return leadCalendarMonthAbbr(lead) === monthAbbr;
}

/** Tour count per calendar month — all years combined. */
export function toursByMonth(leads: Lead[]): number[] {
  return DASHBOARD_MONTH_ABBR.map((abbr) =>
    leads.filter(
      (l) =>
        (TOUR_COUNT_STAGES as readonly string[]).includes(l.stage) &&
        leadMatchesCalendarMonth(l, abbr)
    ).length
  );
}

export function buildConversionFunnel(leads: Lead[]): ConversionFunnel {
  const stageNames = [...DASHBOARD_FUNNEL_STAGES];
  const stageCounts = stageNames.map((s) => leads.filter((l) => l.stage === s).length);
  const conversionPct = stageCounts.map((c, i) =>
    i === 0 || stageCounts[i - 1] === 0 ? null : Math.round((c / stageCounts[i - 1]) * 100)
  );
  return { stageNames, stageCounts, conversionPct };
}

/** Revenue per calendar month — all years combined. */
function revenueByMonth(leads: Lead[], stages: readonly string[]): number[] {
  return DASHBOARD_MONTH_ABBR.map((abbr) =>
    leads
      .filter((l) => stages.includes(l.stage) && leadMatchesCalendarMonth(l, abbr))
      .reduce((s, l) => s + (l.value || 0), 0)
  );
}

export function computeDashboardMetrics(
  leads: Lead[],
  bookings: Booking[],
  customers: Customer[],
  feedback: DashboardFeedbackItem[],
  filters: DashboardFilters
): DashboardMetrics {
  const filteredLeads = filterDashboardLeads(leads, customers, filters);

  const drafted = filteredLeads.filter((l) => l.stage === 'Designing').length;
  const sent = filteredLeads.filter((l) => l.stage === 'Quoted').length;
  const pending = filteredLeads.filter((l) => l.stage === 'Negotiation').length;
  const confirmed = filteredLeads.filter(
    (l) => l.stage === 'Confirmed' || l.stage === 'On Tour'
  );
  const totalPax = confirmed.reduce((s, l) => s + (parseInt(String(l.pax), 10) || 0), 0);
  const totalVal = confirmed.reduce((s, l) => s + (l.value || 0), 0);

  const completedLeads = filteredLeads.filter((l) => l.stage === 'Completed');
  const completedLeadsBkIds = completedLeads.map((l) => l.id);
  const realizedFromLeads = completedLeads.reduce((s, l) => s + (l.value || 0), 0);
  const realizedFromBk = bookings
    .filter(
      (b) =>
        (b.status === 'Fully Paid' || b.status === 'Completed') &&
        !completedLeadsBkIds.some((lid) => b.id.includes(lid.replace('LD-', '')))
    )
    .reduce((s, b) => s + (b.total || 0), 0);
  const realizedFromCustomers = sumCustomerRevenue(
    filterDashboardCustomers(customers, filters),
  );
  const realized = realizedFromLeads + realizedFromBk + realizedFromCustomers;

  const weightedForecast = filteredLeads
    .filter((l) => l.stage !== 'Lost' && l.stage !== 'Completed')
    .reduce(
      (s, l) =>
        s + ((l.value || 0) * ((l.probability ?? STAGE_PROB_V22[l.stage] ?? 10) / 100)),
      0
    );

  const mktMap: Record<string, number> = {};
  filteredLeads.forEach((l) => {
    if (!l.value || l.value <= 0) return;
    const cust = customers.find((c) => c.id === l.custId);
    const country = cust?.country || 'Other';
    mktMap[country] = (mktMap[country] || 0) + (l.value || 0);
  });
  const hasMarketData = Object.keys(mktMap).length >= 2;
  const filtered = filters.market
    ? Object.fromEntries(Object.entries(mktMap).filter(([m]) => m === filters.market))
    : mktMap;

  const realizedByMonth = revenueByMonth(filteredLeads, ['Completed']);
  const forecastByMonth = revenueByMonth(filteredLeads, FORECAST_STAGES);
  const toursByMonthData = toursByMonth(filteredLeads);

  const { stageNames, stageCounts, conversionPct } = buildConversionFunnel(filteredLeads);

  const tourMap: Record<string, number> = {};
  filteredLeads
    .filter((l) => l.stage === 'Completed' || l.stage === 'Confirmed')
    .forEach((l) => {
      tourMap[l.tour] = (tourMap[l.tour] || 0) + (l.value || 0);
    });
  const topTours = Object.entries(tourMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) as [string, number][];

  const b2b = filteredLeads.filter((l) => l.clientType === 'b2b' || !!l.agentId).length;
  const b2c = filteredLeads.length - b2b;

  const agentMap: Record<string, number> = {};
  filteredLeads
    .filter((l) => l.stage === 'Confirmed' || l.stage === 'Completed')
    .forEach((l) => {
      const cust = customers.find((c) => c.id === l.custId);
      if (cust?.source === 'Agent') {
        const key = cust.agentName || 'Agent';
        agentMap[key] = (agentMap[key] || 0) + (l.value || 0);
      }
    });

  const npsScores = feedback.filter((f) => f.nps).map((f) => f.nps as number);
  const avgNps = npsScores.length
    ? Math.round((npsScores.reduce((a, b) => a + b, 0) / npsScores.length) * 10) / 10
    : null;

  const YTD_TARGET = ANNUAL_REVENUE_TARGET_USD;
  const ytdPct = Math.min(100, Math.round((realized / YTD_TARGET) * 100));

  return {
    filteredLeads,
    drafted,
    sent,
    pending,
    confirmed,
    totalPax,
    totalVal,
    realized,
    completedLeads,
    weightedForecast,
    filtered,
    hasMarketData,
    MONTHS: DASHBOARD_MONTH_ABBR,
    realizedByMonth,
    forecastByMonth,
    toursByMonth: toursByMonthData,
    stageNames,
    stageCounts,
    conversionPct,
    topTours,
    b2b,
    b2c,
    agentMap,
    avgNps,
    npsScores,
    YTD_TARGET,
    ytdPct,
  };
}

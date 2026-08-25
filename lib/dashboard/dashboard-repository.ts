import 'server-only';

import { STAGE_PROB_V22 } from '@/lib/constants';
import { getCustomerName } from '@/lib/core/crm-utils';
import {
  computeDashboardMetrics,
  type DashboardFilters,
} from '@/lib/dashboard/dashboard-metrics';
import type {
  DashboardAgentPipelineRow,
  DashboardForecastDeal,
  DashboardMetricsPayload,
  DashboardPageResponse,
} from '@/lib/dashboard/dashboard-types';
import { rowToAgent, rowToCustomer, rowToLead, assembleBookings } from '@/lib/db/mappers/crm';
import { rowToFeedback } from '@/lib/db/mappers/ops-content';
import type { Row } from '@/lib/db/mappers/shared';
import {
  cacheGet,
  cacheInvalidatePattern,
  cacheSet,
} from '@/lib/redis/cache-helper';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import type { Agent, Booking, Customer, Lead } from '@/lib/types';

const DASHBOARD_CACHE_TTL_SECONDS = 45;
const DASHBOARD_CACHE_PREFIX = 'cache:dashboard:v1:';

export class DashboardRepositoryError extends Error {
  constructor(
    message: string,
    readonly code: 'config' | 'query' = 'query',
  ) {
    super(message);
    this.name = 'DashboardRepositoryError';
  }
}

function cacheKey(filters: DashboardFilters): string {
  const clientType = filters.clientType || 'all';
  const market = filters.market.trim() || 'all';
  return `${DASHBOARD_CACHE_PREFIX}${clientType}:${encodeURIComponent(market)}`;
}

export async function invalidateDashboardCache(): Promise<void> {
  try {
    await cacheInvalidatePattern(`${DASHBOARD_CACHE_PREFIX}*`);
  } catch (error) {
    // Cache is optional: a completed mutation must still succeed.
    console.warn('[Redis Cache Error] Dashboard cache invalidation failed:', error);
  }
}

async function createDashboardClient() {
  try {
    return await getServerSupabaseClient();
  } catch (error) {
    throw new DashboardRepositoryError(
      error instanceof Error
        ? error.message
        : 'CRM session không hợp lệ hoặc Supabase chưa được cấu hình.',
      'config',
    );
  }
}

function mapBookingsSlim(rows: Row[]): Booking[] {
  return assembleBookings(rows, [], []);
}

function buildForecast(
  filteredLeads: Lead[],
  customers: Customer[],
): {
  deals: DashboardForecastDeal[];
  allActiveValue: number;
  allActiveWeighted: number;
} {
  const active = filteredLeads
    .filter((l) => l.stage !== 'Lost' && l.stage !== 'Completed' && (l.value || 0) > 0)
    .map((l) => {
      const probability = l.probability ?? STAGE_PROB_V22[l.stage] ?? 10;
      const tourValue = l.value || 0;
      return {
        id: l.id,
        custId: l.custId,
        customerName: getCustomerName(customers, l.custId),
        tour: l.tour,
        tourValue,
        probability,
        weightedValue: (tourValue * probability) / 100,
        stage: l.stage,
        month: l.month || '',
      } satisfies DashboardForecastDeal;
    });

  const deals = [...active].sort((a, b) => b.weightedValue - a.weightedValue).slice(0, 12);
  return {
    deals,
    allActiveValue: active.reduce((s, d) => s + d.tourValue, 0),
    allActiveWeighted: active.reduce((s, d) => s + d.weightedValue, 0),
  };
}

function buildAgentPipeline(
  filteredLeads: Lead[],
  agents: Agent[],
): { rows: DashboardAgentPipelineRow[]; totalEstCommission: number } {
  const rows = agents
    .filter((a) => a.id !== 'AGT-001')
    .map((a) => {
      const agLeads = filteredLeads.filter(
        (l) => l.agentId === a.id && l.stage !== 'Lost',
      );
      const pipeline = agLeads.reduce((s, l) => s + (l.value || 0), 0);
      const commission = Math.round(pipeline * (a.commissionPct / 100));
      return {
        id: a.id,
        name: a.name,
        tier: a.tier,
        commissionPct: a.commissionPct,
        pipeline,
        commission,
        leadCount: agLeads.length,
      } satisfies DashboardAgentPipelineRow;
    })
    .filter((r) => r.pipeline > 0)
    .sort((x, y) => y.pipeline - x.pipeline);

  return {
    rows,
    totalEstCommission: rows.reduce((s, r) => s + r.commission, 0),
  };
}

function toMetricsPayload(
  metrics: ReturnType<typeof computeDashboardMetrics>,
  fullyPaidBookingCount: number,
): DashboardMetricsPayload {
  return {
    drafted: metrics.drafted,
    sent: metrics.sent,
    pending: metrics.pending,
    confirmedCount: metrics.confirmed.length,
    completedCount: metrics.completedLeads.length,
    fullyPaidBookingCount,
    totalPax: metrics.totalPax,
    totalVal: metrics.totalVal,
    realized: metrics.realized,
    weightedForecast: metrics.weightedForecast,
    filtered: metrics.filtered,
    hasMarketData: metrics.hasMarketData,
    MONTHS: metrics.MONTHS,
    realizedByMonth: metrics.realizedByMonth,
    forecastByMonth: metrics.forecastByMonth,
    toursByMonth: metrics.toursByMonth,
    stageNames: metrics.stageNames,
    stageCounts: metrics.stageCounts,
    conversionPct: metrics.conversionPct,
    topTours: metrics.topTours,
    b2b: metrics.b2b,
    b2c: metrics.b2c,
    agentMap: metrics.agentMap,
    avgNps: metrics.avgNps,
    npsScores: metrics.npsScores,
    YTD_TARGET: metrics.YTD_TARGET,
    ytdPct: metrics.ytdPct,
  };
}

async function loadDashboardTables(): Promise<{
  leads: Lead[];
  bookings: Booking[];
  customers: Customer[];
  agents: Agent[];
  feedback: { nps?: number }[];
}> {
  const supabase = await createDashboardClient();

  const [leadsRes, bookingsRes, customersRes, agentsRes, feedbackRes] =
    await Promise.all([
      supabase.from('leads').select('*'),
      supabase
        .from('bookings')
        .select(
          'id, cust_id, lead_id, tour, pax, start_date, end_date, total, deposit, status, guide_name, hotel, guide_alert_pending',
        ),
      supabase.from('customers').select('*'),
      supabase.from('agents').select('*'),
      supabase.from('feedback').select('nps, booking_id'),
    ]);

  if (leadsRes.error) {
    throw new DashboardRepositoryError(leadsRes.error.message);
  }
  if (bookingsRes.error) {
    throw new DashboardRepositoryError(bookingsRes.error.message);
  }
  if (customersRes.error) {
    throw new DashboardRepositoryError(customersRes.error.message);
  }
  if (agentsRes.error) {
    throw new DashboardRepositoryError(agentsRes.error.message);
  }
  if (feedbackRes.error) {
    throw new DashboardRepositoryError(feedbackRes.error.message);
  }

  return {
    leads: ((leadsRes.data ?? []) as Row[]).map(rowToLead),
    bookings: mapBookingsSlim((bookingsRes.data ?? []) as Row[]),
    customers: ((customersRes.data ?? []) as Row[]).map(rowToCustomer),
    agents: ((agentsRes.data ?? []) as Row[]).map(rowToAgent),
    feedback: ((feedbackRes.data ?? []) as Row[]).map((r) => {
      const mapped = rowToFeedback(r);
      return { nps: mapped.nps != null ? Number(mapped.nps) : undefined };
    }),
  };
}

async function computeDashboardPage(
  filters: DashboardFilters,
): Promise<DashboardPageResponse> {
  const { leads, bookings, customers, agents, feedback } =
    await loadDashboardTables();

  const metrics = computeDashboardMetrics(
    leads,
    bookings,
    customers,
    feedback,
    filters,
  );

  const forecast = buildForecast(metrics.filteredLeads, customers);
  const agentPipeline = buildAgentPipeline(metrics.filteredLeads, agents);
  const fullyPaidBookingCount = bookings.filter(
    (b) => b.status === 'Fully Paid',
  ).length;

  return {
    filters,
    metrics: toMetricsPayload(metrics, fullyPaidBookingCount),
    forecastDeals: forecast.deals,
    forecastAllActiveValue: forecast.allActiveValue,
    forecastAllActiveWeighted: forecast.allActiveWeighted,
    agentPipeline: agentPipeline.rows,
    totalEstCommission: agentPipeline.totalEstCommission,
  };
}

export async function getDashboardPage(
  filters: DashboardFilters,
): Promise<DashboardPageResponse> {
  const key = cacheKey(filters);
  const cached = await cacheGet<DashboardPageResponse>(key);
  if (cached) return cached;

  const payload = await computeDashboardPage(filters);
  await cacheSet(key, payload, DASHBOARD_CACHE_TTL_SECONDS);
  return payload;
}

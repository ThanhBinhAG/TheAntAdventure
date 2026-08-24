import type { DashboardFilters } from '@/lib/dashboard/dashboard-metrics';

/** Aggregated dashboard payload — no raw CRM table dumps. */
export type DashboardForecastDeal = {
  id: string;
  custId: string;
  customerName: string;
  tour: string;
  tourValue: number;
  probability: number;
  weightedValue: number;
  stage: string;
  month: string;
};

export type DashboardAgentPipelineRow = {
  id: string;
  name: string;
  tier: string;
  commissionPct: number;
  pipeline: number;
  commission: number;
  leadCount: number;
};

export type DashboardMetricsPayload = {
  drafted: number;
  sent: number;
  pending: number;
  confirmedCount: number;
  completedCount: number;
  fullyPaidBookingCount: number;
  totalPax: number;
  totalVal: number;
  realized: number;
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
};

export type DashboardPageResponse = {
  filters: DashboardFilters;
  metrics: DashboardMetricsPayload;
  forecastDeals: DashboardForecastDeal[];
  forecastAllActiveValue: number;
  forecastAllActiveWeighted: number;
  agentPipeline: DashboardAgentPipelineRow[];
  totalEstCommission: number;
};

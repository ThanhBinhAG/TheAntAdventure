'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useState } from 'react';
import Link from 'next/link';
import { FX, FX_SYM, fmt } from '@/lib/constants';
import { TIER_BG, TIER_COLORS } from '@/lib/core/page-helpers';
import EmptyState from '@/components/EmptyState';
import { ForecastBreakdown } from '@/components/dashboard/DashboardForecast';
import { useDashboardPage } from '@/hooks/useDashboardPage';
import { useLanguage } from '@/hooks/useLanguage';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function DashboardPage() {
  const { tp, tpl } = useLanguage();
  const [typeF, setTypeF] = useState<'' | 'b2b' | 'b2c'>('');
  const [marketF, setMarketF] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'VND'>('USD');

  const { data, loading, error, reload } = useDashboardPage({
    clientType: typeF,
    market: marketF,
  });

  const sym = FX_SYM[currency];
  const rate = FX[currency];
  const metrics = data?.metrics;

  const filterLabel = [
    typeF && (typeF === 'b2b' ? tp('dashboard', 'filterB2bLabel') : tp('dashboard', 'filterB2cLabel')),
    marketF,
  ]
    .filter(Boolean)
    .join(' · ');

  const mktLabels = metrics ? Object.keys(metrics.filtered) : [];
  const mktVals = metrics
    ? mktLabels.map((m) => Math.round(metrics.filtered[m] * rate))
    : [];

  const totalToursAllTime = metrics
    ? metrics.toursByMonth.reduce((s, n) => s + n, 0)
    : 0;

  return (
    <div>
      <div className="dash-filter-bar">
        <select value={typeF} onChange={(e) => setTypeF(e.target.value as '' | 'b2b' | 'b2c')}>
          <option value="">{tp('dashboard', 'filterAllClients')}</option>
          <option value="b2b">{tp('dashboard', 'filterB2bAgents')}</option>
          <option value="b2c">{tp('dashboard', 'filterB2cDirect')}</option>
        </select>
        <select value={marketF} onChange={(e) => setMarketF(e.target.value)}>
          <option value="">{tp('dashboard', 'filterAllMarkets')}</option>
          <option>USA</option>
          <option>Australia</option>
          <option>France</option>
          <option>UK</option>
          <option>Germany</option>
        </select>
        <select value={currency} onChange={(e) => setCurrency(e.target.value as 'USD' | 'EUR' | 'VND')}>
          <option value="USD">USD $</option>
          <option value="EUR">EUR €</option>
          <option value="VND">VND ₫</option>
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: 'var(--m)' }}>
          {filterLabel ? tpl('dashboard', 'filtering', { label: filterLabel }) : tp('dashboard', 'showingAllData')}
        </span>
      </div>

      {error ? (
        <div className="card" style={{ marginBottom: 14, padding: 18 }}>
          <p style={{ color: 'var(--m)', margin: 0 }}>{error}</p>
          <button type="button" className="btn btn-s btn-sm" style={{ marginTop: 10 }} onClick={() => void reload()}>
            {tp('dashboard', 'tryAgain')}
          </button>
        </div>
      ) : null}

      {loading && !metrics ? (
        <div className="card" style={{ marginBottom: 14, padding: 24, textAlign: 'center', color: 'var(--m)' }}>
          {tp('dashboard', 'loadingDashboard')}
        </div>
      ) : null}

      {metrics ? (
        <>
      <div className="dash-kpi-grid">
        <div className="dash-kpi-card">
          <div className="dash-kpi-hd" style={{ background: 'var(--blue-l)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--blue)' }}>
              {tp('dashboard', 'activeQuotes')}
            </span>
          </div>
          <div className="dash-kpi-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="dash-kpi-val" style={{ fontSize: 22, color: 'var(--blue)' }}>
                  {metrics.drafted}
                </div>
                <div style={{ fontSize: 10, color: 'var(--m)', marginTop: 2 }}>{tp('dashboard', 'drafted')}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="dash-kpi-val" style={{ fontSize: 22, color: 'var(--amb)' }}>
                  {metrics.sent}
                </div>
                <div style={{ fontSize: 10, color: 'var(--m)', marginTop: 2 }}>{tp('dashboard', 'sent')}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="dash-kpi-val" style={{ fontSize: 22, color: 'var(--pur)' }}>
                  {metrics.pending}
                </div>
                <div style={{ fontSize: 10, color: 'var(--m)', marginTop: 2 }}>{tp('dashboard', 'negotiation')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-hd" style={{ background: 'var(--gl)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--gd)' }}>
              {tp('dashboard', 'confirmedBookings')}
            </span>
          </div>
          <div className="dash-kpi-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="dash-kpi-val" style={{ fontSize: 36, color: 'var(--g)' }}>
              {metrics.confirmedCount}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, color: 'var(--m)' }}>{tpl('dashboard', 'paxSecured', { count: metrics.totalPax })}</div>
              <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 3 }}>
                {sym}
                {fmt(Math.round(metrics.totalVal * rate))} {tp('dashboard', 'confirmedValue')}
              </div>
            </div>
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-hd" style={{ background: 'var(--gold-l)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#92711d' }}>
              {tp('dashboard', 'realizedRevenue')}
            </span>
          </div>
          <div className="dash-kpi-body">
            <div className="dash-kpi-val" style={{ fontSize: 28, color: '#92711d' }}>
              {sym}
              {fmt(Math.round(metrics.realized * rate))}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--m)', marginTop: 3 }}>
              {tpl('dashboard', 'completedToursLine', { count: metrics.completedCount, paid: metrics.fullyPaidBookingCount })}
            </div>
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-hd" style={{ background: '#F3E8FF' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--pur)' }}>
              {tp('dashboard', 'weightedForecast')}
            </span>
          </div>
          <div className="dash-kpi-body">
            <div className="dash-kpi-val" style={{ fontSize: 26, color: 'var(--pur)' }}>
              {sym}
              {fmt(Math.round(metrics.weightedForecast * rate))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 3 }}>{tp('dashboard', 'probabilityWeighted')}</div>
          </div>
        </div>
      </div>

      <ForecastBreakdown
        deals={data?.forecastDeals ?? []}
        allActiveValue={data?.forecastAllActiveValue ?? 0}
        allActiveWeighted={data?.forecastAllActiveWeighted ?? 0}
      />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-body" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t)' }}>{tp('dashboard', 'ytdRevenueTarget')}</span>
            <span style={{ fontSize: 11, color: 'var(--m)' }}>
              {sym}
              {fmt(Math.round(metrics.YTD_TARGET * rate))} {tp('dashboard', 'target')}
            </span>
          </div>
          <div style={{ background: 'var(--bg)', borderRadius: 6, height: 22, overflow: 'hidden', marginBottom: 7, border: '1px solid var(--b)' }}>
            <div
              style={{
                width: `${metrics.ytdPct}%`,
                height: '100%',
                background: metrics.ytdPct >= 80 ? 'var(--g)' : metrics.ytdPct >= 40 ? 'var(--amb)' : 'var(--blue)',
                borderRadius: 6,
                transition: 'width .4s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingRight: 8,
              }}
            >
              {metrics.ytdPct > 8 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{metrics.ytdPct}%</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span>
              <b style={{ color: 'var(--g)' }}>
                {sym}
                {fmt(Math.round(metrics.realized * rate))}
              </b>{' '}
              {tp('dashboard', 'realized')}
            </span>
            <span style={{ color: 'var(--m)' }}>
              <b>
                {sym}
                {fmt(Math.round(Math.max(0, metrics.YTD_TARGET - metrics.realized) * rate))}
              </b>{' '}
              {tp('dashboard', 'remaining')}
            </span>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-grid-left">
          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('dashboard', 'revenueByMarket')}</span>
            </div>
            <div className="card-body">
              {metrics.hasMarketData ? (
              <div className="chart-wrap">
                <Bar
                data={{
                  labels: mktLabels,
                  datasets: [
                    {
                      label: tpl('dashboard', 'chartRevenue', { sym }),
                      data: mktVals,
                      backgroundColor: ['#2E7D52', '#5AA87A', '#C9A84C', '#1565C0', '#6B21A8', '#C0392B'],
                      borderRadius: 5,
                      borderSkipped: false,
                    },
                  ],
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => ` ${sym}${fmt(ctx.parsed.x ?? 0)}` } },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { callback: (v) => `${sym}${fmt(Number(v ?? 0))}`, font: { size: 11 } },
                    },
                    y: { grid: { display: false }, ticks: { font: { size: 12 } } },
                  },
                }}
              />
              </div>
              ) : (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--m)', fontSize: 13 }}>
                  {tp('dashboard', 'notEnoughMarketData')}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('dashboard', 'monthlyRevenueTrend')}</span>
              <span className="bdg bdg-g" style={{ fontSize: 10 }}>
                {tp('dashboard', 'allTimeRealizedVsForecast')}
              </span>
            </div>
            <div className="card-body">
              <div className="chart-wrap">
                <Bar
                data={{
                  labels: [...metrics.MONTHS],
                  datasets: [
                    {
                      label: tp('dashboard', 'chartRealizedRevenue'),
                      data: metrics.realizedByMonth.map((v) => Math.round(v * rate)),
                      backgroundColor: '#2E7D52',
                      borderRadius: 4,
                    },
                    {
                      label: tp('dashboard', 'chartPipelineForecast'),
                      data: metrics.forecastByMonth.map((v) => Math.round(v * rate)),
                      backgroundColor: '#FDE68A',
                      borderColor: '#D97706',
                      borderWidth: 1,
                      borderRadius: 4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: true, position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
                  },
                  scales: {
                    x: { grid: { display: false } },
                    y: {
                      grid: { color: '#f0f0f0' },
                      ticks: { callback: (v) => `${sym}${fmt(Number(v ?? 0))}`, font: { size: 11 } },
                    },
                  },
                }}
              />
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('dashboard', 'toursPerMonth')}</span>
              <span className="bdg bdg-b" style={{ fontSize: 10 }}>
                {tp('dashboard', 'allTimeToursBadge')}
              </span>
            </div>
            <div className="card-body">
              {totalToursAllTime > 0 ? (
                <div className="chart-wrap">
                  <Bar
                    data={{
                      labels: [...metrics.MONTHS],
                      datasets: [
                        {
                          label: tp('dashboard', 'chartTours'),
                          data: metrics.toursByMonth,
                          backgroundColor: '#1565C0',
                          borderRadius: 4,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => {
                              const count = ctx.parsed.y ?? 0;
                              return ` ${tpl('dashboard', count !== 1 ? 'tourCountPlural' : 'tourCount', { count })}`;
                            },
                          },
                        },
                      },
                      scales: {
                        x: { grid: { display: false } },
                        y: {
                          grid: { color: '#f0f0f0' },
                          ticks: { stepSize: 1, font: { size: 11 } },
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <EmptyState
                  className="crm-empty-state--flush"
                  size="compact"
                  variant="leads"
                  title={tp('dashboard', 'noScheduledTours')}
                  description={tp('dashboard', 'noScheduledToursDesc')}
                />
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('dashboard', 'pipelineConversionFunnel')}</span>
            </div>
            <div className="card-body">
              <div className="chart-wrap">
                <Bar
                data={{
                  labels: metrics.stageNames,
                  datasets: [
                    {
                      label: tp('dashboard', 'chartLeads'),
                      data: metrics.stageCounts,
                      backgroundColor: '#2E7D52',
                      borderRadius: 6,
                    },
                  ],
                }}
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => {
                          const count = ctx.parsed.x ?? 0;
                          const idx = ctx.dataIndex;
                          const pct = metrics.conversionPct[idx];
                          const base = tpl('dashboard', count !== 1 ? 'leadCountPlural' : 'leadCount', { count });
                          if (pct === null) return ` ${base}`;
                          return ` ${tpl('dashboard', 'fromPreviousStage', { base, pct })}`;
                        },
                      },
                    },
                  },
                  scales: { x: { grid: { display: false } }, y: { grid: { display: false } } },
                }}
              />
              </div>
              <p style={{ fontSize: 11, color: 'var(--m)', marginTop: 10, marginBottom: 0 }}>
                {tp('dashboard', 'conversionNote')}
              </p>
            </div>
          </div>
        </div>

        <div className="dash-grid-right">
          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('dashboard', 'pipelineByStage')}</span>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              {metrics.stageNames.map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 12 }}>
                  <span style={{ width: 90, color: 'var(--m)' }}>{s}</span>
                  <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 4, height: 18, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(8, (metrics.stageCounts[i] / Math.max(...metrics.stageCounts, 1)) * 100)}%`,
                        height: '100%',
                        background: 'var(--g)',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <span style={{ fontWeight: 600, width: 24, textAlign: 'right' }}>{metrics.stageCounts[i]}</span>
                  {metrics.conversionPct[i] !== null && (
                    <span style={{ fontSize: 10, color: 'var(--m)', width: 32, textAlign: 'right' }}>
                      {metrics.conversionPct[i]}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('dashboard', 'topToursYtd')}</span>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--m)', marginBottom: 8 }}>{tp('dashboard', 'byRevenue')}</div>
              {metrics.topTours.length === 0 ? (
                <div style={{ color: 'var(--m)', fontSize: 12 }}>{tp('dashboard', 'noTourData')}</div>
              ) : (
                metrics.topTours.map(([tour, val]) => (
                  <div key={tour} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                    <span>{tour}</span>
                    <span style={{ fontWeight: 600, color: 'var(--g)' }}>
                      {sym}
                      {fmt(Math.round(val * rate))}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('dashboard', 'b2bVsB2cSplit')}</span>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                <div style={{ flex: 1, textAlign: 'center', padding: 12, background: 'var(--pur-l)', borderRadius: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--pur)' }}>{metrics.b2b}</div>
                  <div style={{ color: 'var(--m)' }}>{tp('dashboard', 'b2bLeads')}</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: 12, background: 'var(--blue-l)', borderRadius: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)' }}>{metrics.b2c}</div>
                  <div style={{ color: 'var(--m)' }}>{tp('dashboard', 'b2cLeads')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('dashboard', 'b2bAgentPipeline')}</span>
              <Link href="/agents" style={{ fontSize: 11, color: 'var(--g)', textDecoration: 'none' }}>
                {tp('dashboard', 'viewAll')}
              </Link>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              {!(data?.agentPipeline.length) ? (
                <div style={{ color: 'var(--m)', fontSize: 13 }}>{tp('dashboard', 'noAgentPipeline')}</div>
              ) : (
                <>
                  {data.agentPipeline.map((r) => {
                    const tc = TIER_COLORS[r.tier] || '#6B7F74';
                    const tb = TIER_BG[r.tier] || '#f9f9f9';
                    return (
                      <div key={r.id} className="dash-agent-row">
                        <span className="dash-agent-tier" style={{ background: tb, color: tc, borderColor: tc }}>
                          {r.tier}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--m)' }}>
                            {tpl('dashboard', r.leadCount !== 1 ? 'agentLeadsCommPlural' : 'agentLeadsComm', { count: r.leadCount, pct: r.commissionPct })}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>${fmt(r.pipeline)}</div>
                          <div style={{ fontSize: 11, color: 'var(--gold)' }}>–${fmt(r.commission)}</div>
                        </div>
                      </div>
                    );
                  })}
                  {(data.totalEstCommission ?? 0) > 0 && (
                    <div className="dash-agent-total">
                      <span style={{ color: 'var(--m)' }}>{tp('dashboard', 'totalEstCommission')}</span>
                      <span style={{ fontWeight: 700, color: 'var(--gold)' }}>
                        ${fmt(data.totalEstCommission)}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('dashboard', 'npsSatisfaction')}</span>
              <Link href="/posttour" style={{ fontSize: 11, color: 'var(--g)', textDecoration: 'none' }}>
                {tp('dashboard', 'viewAllFeedback')}
              </Link>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              {metrics.avgNps !== null ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'DM Serif Display',Georgia,serif", color: 'var(--g)' }}>
                    {metrics.avgNps}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--m)' }}>{tpl('dashboard', 'surveys', { count: metrics.npsScores.length })}</div>
                </div>
              ) : (
                <div style={{ color: 'var(--m)', fontSize: 12 }}>{tp('dashboard', 'noFeedbackSurveys')}</div>
              )}
            </div>
          </div>
        </div>
      </div>
        </>
      ) : null}
    </div>
  );
}

'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { FX, FX_SYM, STAGE_PROB_V22, STAGE_COLORS, fmt } from '@/lib/constants';
import { TIER_BG, TIER_COLORS } from '@/lib/page-helpers';
import { useStore } from '@/hooks/useStore';
import { getCustomerName } from '@/lib/crm-utils';
import type { Customer, Lead } from '@/lib/types';

function ForecastBreakdown({ leads, customers }: { leads: Lead[]; customers: Customer[] }) {
  const deals = useMemo(() => {
    return leads
      .filter((l) => l.stage !== 'Lost' && l.stage !== 'Completed' && (l.value || 0) > 0)
      .map((l) => {
        const prob = l.probability ?? STAGE_PROB_V22[l.stage] ?? 10;
        return {
          ...l,
          tourValue: l.value || 0,
          probability: prob,
          weightedValue: ((l.value || 0) * prob) / 100,
        };
      })
      .sort((a, b) => b.weightedValue - a.weightedValue)
      .slice(0, 12);
  }, [leads]);

  if (deals.length < 2) {
    return (
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-hd">
          <span className="card-title">💼 Pipeline Forecast Breakdown</span>
        </div>
        <div className="card-body" style={{ padding: 18, textAlign: 'center', color: 'var(--m)', fontSize: 13 }}>
          Add pipeline deals in the Sales section to see the forecast breakdown.
          <br />
          <Link href="/sales" className="btn btn-s btn-sm" style={{ marginTop: 10, display: 'inline-block' }}>
            → Go to Pipeline
          </Link>
        </div>
      </div>
    );
  }

  const totalValue = deals.reduce((s, d) => s + d.tourValue, 0);
  const totalWeighted = deals.reduce((s, d) => s + d.weightedValue, 0);

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="card-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span className="card-title">💼 Pipeline Forecast Breakdown</span>
          <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 2 }}>Top active deals · Sorted by probability-weighted value</div>
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="forecast-tbl">
            <thead>
              <tr>
                <th>Client</th>
                <th>Tour</th>
                <th style={{ textAlign: 'right' }}>Tour Value</th>
                <th>Probability</th>
                <th style={{ textAlign: 'right' }}>Weighted Value</th>
                <th>Stage</th>
                <th>Travel Month</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{getCustomerName(customers, d.custId)}</td>
                  <td>{d.tour}</td>
                  <td style={{ textAlign: 'right' }}>${fmt(Math.round(d.tourValue))}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="prob-bar">
                        <div className="prob-bar-fill" style={{ width: `${d.probability}%` }} />
                      </div>
                      <span style={{ fontSize: 11.5 }}>{d.probability}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: '#2E7D52' }}>
                    ${fmt(Math.round(d.weightedValue))}
                  </td>
                  <td>
                    <span className={`bdg ${STAGE_COLORS[d.stage] || 'bdg-w'}`} style={{ fontSize: 10.5 }}>
                      {d.stage}
                    </span>
                  </td>
                  <td style={{ color: 'var(--m)', fontSize: 11.5 }}>{d.month || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ fontWeight: 700 }}>
                  TOTAL
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>${fmt(Math.round(totalValue))}</td>
                <td>—</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#2E7D52' }}>
                  ${fmt(Math.round(totalWeighted))}
                </td>
                <td colSpan={2}>—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

export default function Dashboard() {
  const leads = useStore((s) => s.leads);
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const agents = useStore((s) => s.agents);
  const feedback = useStore((s) => s.feedback) as { nps?: number; custId?: string }[];

  const [typeF, setTypeF] = useState('');
  const [marketF, setMarketF] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'VND'>('USD');

  const sym = FX_SYM[currency];
  const rate = FX[currency];

  const metrics = useMemo(() => {
    const allLeads = leads.filter(
      (l) =>
        !typeF ||
        l.clientType === typeF ||
        (typeF === 'b2b' && !l.clientType && l.id.includes('ILV'))
    );

    const drafted = allLeads.filter((l) => l.stage === 'Designing').length;
    const sent = allLeads.filter((l) => l.stage === 'Quoted').length;
    const pending = allLeads.filter((l) => l.stage === 'Negotiation').length;
    const confirmed = allLeads.filter((l) => l.stage === 'Confirmed' || l.stage === 'On Tour');
    const totalPax = confirmed.reduce((s, l) => s + (parseInt(String(l.pax)) || 0), 0);
    const totalVal = confirmed.reduce((s, l) => s + (l.value || 0), 0);

    const completedLeads = allLeads.filter((l) => l.stage === 'Completed');
    const completedLeadsBkIds = completedLeads.map((l) => l.id);
    const realizedFromLeads = completedLeads.reduce((s, l) => s + (l.value || 0), 0);
    const realizedFromBk = bookings
      .filter(
        (b) =>
          (b.status === 'Fully Paid' || b.status === 'Completed') &&
          !completedLeadsBkIds.some((lid) => b.id.includes(lid.replace('LD-', '')))
      )
      .reduce((s, b) => s + (b.total || 0), 0);
    const realized = realizedFromLeads + realizedFromBk;

    const weightedForecast = allLeads
      .filter((l) => l.stage !== 'Lost' && l.stage !== 'Completed')
      .reduce(
        (s, l) =>
          s + ((l.value || 0) * ((l.probability ?? STAGE_PROB_V22[l.stage] ?? 10) / 100)),
        0
      );

    const mktMap: Record<string, number> = {};
    allLeads.forEach((l) => {
      if (!l.value || l.value <= 0) return;
      const cust = customers.find((c) => c.id === l.custId);
      const country = cust?.country || 'Other';
      mktMap[country] = (mktMap[country] || 0) + (l.value || 0);
    });
    const DEMO_MKT = { USA: 94000, Australia: 74000, France: 55000, UK: 41000, Germany: 20000 };
    const mktData = Object.keys(mktMap).length >= 2 ? mktMap : DEMO_MKT;
    const filtered = marketF
      ? Object.fromEntries(Object.entries(mktData).filter(([m]) => m === marketF))
      : mktData;

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const realizedByMonth = MONTHS.map((m) =>
      leads
        .filter((l) => l.stage === 'Completed' && (l.month || '').startsWith(m))
        .reduce((s, l) => s + (l.value || 0), 0)
    );
    const forecastByMonth = MONTHS.map((m) =>
      leads
        .filter((l) => (l.stage === 'Confirmed' || l.stage === 'Quoted') && (l.month || '').startsWith(m))
        .reduce((s, l) => s + (l.value || 0), 0)
    );

    const stageNames = ['Inquiry', 'Designing', 'Quoted', 'Negotiation', 'Confirmed', 'Completed'];
    const stageCounts = stageNames.map((s) => leads.filter((l) => l.stage === s).length);

    const tourMap: Record<string, number> = {};
    leads
      .filter((l) => l.stage === 'Completed' || l.stage === 'Confirmed')
      .forEach((l) => {
        tourMap[l.tour] = (tourMap[l.tour] || 0) + (l.value || 0);
      });
    const topTours = Object.entries(tourMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const b2b = leads.filter((l) => l.clientType === 'b2b' || l.id.includes('ILV')).length;
    const b2c = leads.length - b2b;

    const agentMap: Record<string, number> = {};
    leads
      .filter((l) => l.stage === 'Confirmed' || l.stage === 'Completed')
      .forEach((l) => {
        const cust = customers.find((c) => c.id === l.custId);
        if (cust?.source === 'Agent') {
          agentMap[cust.agentName || 'Agent'] = (agentMap[cust.agentName || 'Agent'] || 0) + (l.value || 0);
        }
      });

    const npsScores = feedback.filter((f) => f.nps).map((f) => f.nps as number);
    const avgNps = npsScores.length
      ? Math.round((npsScores.reduce((a, b) => a + b, 0) / npsScores.length) * 10) / 10
      : null;

    const YTD_TARGET = 250000;
    const ytdPct = Math.min(100, Math.round((realized / YTD_TARGET) * 100));

    return {
      allLeads,
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
      MONTHS,
      realizedByMonth,
      forecastByMonth,
      stageNames,
      stageCounts,
      topTours,
      b2b,
      b2c,
      agentMap,
      avgNps,
      npsScores,
      YTD_TARGET,
      ytdPct,
    };
  }, [leads, bookings, customers, feedback, typeF, marketF]);

  const filterLabel = [typeF && (typeF === 'b2b' ? 'B2B Agents' : 'B2C Direct'), marketF]
    .filter(Boolean)
    .join(' · ');

  const mktLabels = Object.keys(metrics.filtered);
  const filteredMkt = metrics.filtered as Record<string, number>;
  const mktVals = mktLabels.map((m) => Math.round(filteredMkt[m] * rate));

  return (
    <div>
      <div className="dash-filter-bar">
        <select value={typeF} onChange={(e) => setTypeF(e.target.value)}>
          <option value="">All Clients (B2B + B2C)</option>
          <option value="b2b">B2B — Agents Only</option>
          <option value="b2c">B2C — Direct Only</option>
        </select>
        <select value={marketF} onChange={(e) => setMarketF(e.target.value)}>
          <option value="">All Markets</option>
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
          {filterLabel ? `Filtering: ${filterLabel}` : 'Showing all data'}
        </span>
      </div>

      <div className="dash-kpi-grid">
        <div className="dash-kpi-card">
          <div className="dash-kpi-hd" style={{ background: 'var(--blue-l)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--blue)' }}>
              Active Quotes
            </span>
          </div>
          <div className="dash-kpi-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="dash-kpi-val" style={{ fontSize: 22, color: 'var(--blue)' }}>
                  {metrics.drafted}
                </div>
                <div style={{ fontSize: 10, color: 'var(--m)', marginTop: 2 }}>Drafted</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="dash-kpi-val" style={{ fontSize: 22, color: 'var(--amb)' }}>
                  {metrics.sent}
                </div>
                <div style={{ fontSize: 10, color: 'var(--m)', marginTop: 2 }}>Sent</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="dash-kpi-val" style={{ fontSize: 22, color: 'var(--pur)' }}>
                  {metrics.pending}
                </div>
                <div style={{ fontSize: 10, color: 'var(--m)', marginTop: 2 }}>Pending</div>
              </div>
            </div>
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-hd" style={{ background: 'var(--gl)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--gd)' }}>
              Confirmed Bookings
            </span>
          </div>
          <div className="dash-kpi-body" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="dash-kpi-val" style={{ fontSize: 36, color: 'var(--g)' }}>
              {metrics.confirmed.length}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, color: 'var(--m)' }}>{metrics.totalPax} pax secured</div>
              <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 3 }}>
                {sym}
                {fmt(Math.round(metrics.totalVal * rate))} confirmed value
              </div>
            </div>
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-hd" style={{ background: 'var(--gold-l)' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#92711d' }}>
              Realized Revenue
            </span>
          </div>
          <div className="dash-kpi-body">
            <div className="dash-kpi-val" style={{ fontSize: 28, color: '#92711d' }}>
              {sym}
              {fmt(Math.round(metrics.realized * rate))}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--m)', marginTop: 3 }}>
              {metrics.completedLeads.length} completed tours ·{' '}
              {bookings.filter((b) => b.status === 'Fully Paid').length} fully paid
            </div>
          </div>
        </div>

        <div className="dash-kpi-card">
          <div className="dash-kpi-hd" style={{ background: '#F3E8FF' }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--pur)' }}>
              Weighted Forecast
            </span>
          </div>
          <div className="dash-kpi-body">
            <div className="dash-kpi-val" style={{ fontSize: 26, color: 'var(--pur)' }}>
              {sym}
              {fmt(Math.round(metrics.weightedForecast * rate))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 3 }}>Probability-weighted pipeline</div>
          </div>
        </div>
      </div>

      <ForecastBreakdown leads={metrics.allLeads} customers={customers} />

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-body" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t)' }}>YTD Revenue vs. Annual Target</span>
            <span style={{ fontSize: 11, color: 'var(--m)' }}>
              {sym}
              {fmt(Math.round(metrics.YTD_TARGET * rate))} target
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
              realized
            </span>
            <span style={{ color: 'var(--m)' }}>
              <b>
                {sym}
                {fmt(Math.round(Math.max(0, metrics.YTD_TARGET - metrics.realized) * rate))}
              </b>{' '}
              remaining
            </span>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-grid-left">
          <div className="card">
            <div className="card-hd">
              <span className="card-title">Revenue by Market</span>
            </div>
            <div className="card-body">
              <div className="chart-wrap">
                <Bar
                data={{
                  labels: mktLabels,
                  datasets: [
                    {
                      label: `Revenue ${sym}`,
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
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">Monthly Revenue Trend 2026</span>
              <span className="bdg bdg-g" style={{ fontSize: 10 }}>
                Realized vs Forecast
              </span>
            </div>
            <div className="card-body">
              <div className="chart-wrap">
                <Bar
                data={{
                  labels: metrics.MONTHS,
                  datasets: [
                    {
                      label: 'Realized Revenue',
                      data: metrics.realizedByMonth.map((v) => Math.round(v * rate)),
                      backgroundColor: '#2E7D52',
                      borderRadius: 4,
                    },
                    {
                      label: 'Forecast (Confirmed + Quoted)',
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
              <span className="card-title">Conversion Funnel</span>
            </div>
            <div className="card-body">
              <div className="chart-wrap">
                <Bar
                data={{
                  labels: metrics.stageNames,
                  datasets: [
                    {
                      label: 'Leads',
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
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { display: false } }, y: { grid: { display: false } } },
                }}
              />
              </div>
            </div>
          </div>
        </div>

        <div className="dash-grid-right">
          <div className="card">
            <div className="card-hd">
              <span className="card-title">Pipeline by Stage</span>
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
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">Top Tours YTD</span>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              {metrics.topTours.length === 0 ? (
                <div style={{ color: 'var(--m)', fontSize: 12 }}>No tour data yet</div>
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
              <span className="card-title">B2B vs B2C Split</span>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
                <div style={{ flex: 1, textAlign: 'center', padding: 12, background: 'var(--pur-l)', borderRadius: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--pur)' }}>{metrics.b2b}</div>
                  <div style={{ color: 'var(--m)' }}>B2B leads</div>
                </div>
                <div style={{ flex: 1, textAlign: 'center', padding: 12, background: 'var(--blue-l)', borderRadius: 8 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--blue)' }}>{metrics.b2c}</div>
                  <div style={{ color: 'var(--m)' }}>B2C leads</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">🤝 B2B Agent Pipeline</span>
              <Link href="/agents" style={{ fontSize: 11, color: 'var(--g)', textDecoration: 'none' }}>
                View all →
              </Link>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              {(() => {
                const rows = agents
                  .filter((a) => a.id !== 'AGT-001')
                  .map((a) => {
                    const agLeads = leads.filter((l) => l.agentId === a.id && l.stage !== 'Lost');
                    const pipeline = agLeads.reduce((s, l) => s + (l.value || 0), 0);
                    const comm = Math.round(pipeline * (a.commissionPct / 100));
                    const tc = TIER_COLORS[a.tier] || '#6B7F74';
                    const tb = TIER_BG[a.tier] || '#f9f9f9';
                    return { a, pipeline, comm, tc, tb, count: agLeads.length };
                  })
                  .filter((r) => r.pipeline > 0)
                  .sort((x, y) => y.pipeline - x.pipeline);
                const totalComm = rows.reduce((s, r) => s + r.comm, 0);
                if (!rows.length) {
                  return <div style={{ color: 'var(--m)', fontSize: 13 }}>No agent pipeline data.</div>;
                }
                return (
                  <>
                    {rows.map((r) => (
                      <div key={r.a.id} className="dash-agent-row">
                        <span className="dash-agent-tier" style={{ background: r.tb, color: r.tc, borderColor: r.tc }}>
                          {r.a.tier}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.a.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--m)' }}>
                            {r.count} lead{r.count !== 1 ? 's' : ''} · {r.a.commissionPct}% comm
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>${fmt(r.pipeline)}</div>
                          <div style={{ fontSize: 11, color: 'var(--gold)' }}>–${fmt(r.comm)}</div>
                        </div>
                      </div>
                    ))}
                    {totalComm > 0 && (
                      <div className="dash-agent-total">
                        <span style={{ color: 'var(--m)' }}>Total Est. Commission</span>
                        <span style={{ fontWeight: 700, color: 'var(--gold)' }}>${fmt(totalComm)}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">⭐ NPS & Satisfaction</span>
              <Link href="/posttour" style={{ fontSize: 11, color: 'var(--g)', textDecoration: 'none' }}>
                View all feedback →
              </Link>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              {metrics.avgNps !== null ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 700, fontFamily: "'DM Serif Display',Georgia,serif", color: 'var(--g)' }}>
                    {metrics.avgNps}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--m)' }}>{metrics.npsScores.length} surveys</div>
                </div>
              ) : (
                <div style={{ color: 'var(--m)', fontSize: 12 }}>No feedback surveys yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

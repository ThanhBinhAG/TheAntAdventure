'use client';

import Link from 'next/link';
import { STAGE_COLORS, fmt } from '@/lib/constants';
import type { DashboardForecastDeal } from '@/lib/dashboard/dashboard-types';
import { useLanguage } from '@/hooks/useLanguage';

type Props = {
  deals: DashboardForecastDeal[];
  allActiveValue: number;
  allActiveWeighted: number;
};

export function ForecastBreakdown({
  deals,
  allActiveValue,
  allActiveWeighted,
}: Props) {
  const { tp } = useLanguage();

  if (deals.length < 2) {
    return (
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-hd">
          <span className="card-title">{tp('dashboard', 'forecastTitle')}</span>
        </div>
        <div className="card-body" style={{ padding: 18, textAlign: 'center', color: 'var(--m)', fontSize: 13 }}>
          {tp('dashboard', 'forecastEmpty')}
          <br />
          <Link href="/sales" className="btn btn-s btn-sm" style={{ marginTop: 10, display: 'inline-block' }}>
            {tp('dashboard', 'goToPipeline')}
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
          <span className="card-title">{tp('dashboard', 'forecastTitle')}</span>
          <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 2 }}>{tp('dashboard', 'forecastSubtitle')}</div>
        </div>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="forecast-tbl">
            <thead>
              <tr>
                <th>{tp('dashboard', 'colClient')}</th>
                <th>{tp('dashboard', 'colTour')}</th>
                <th style={{ textAlign: 'right' }}>{tp('dashboard', 'colTourValue')}</th>
                <th>{tp('dashboard', 'colProbability')}</th>
                <th style={{ textAlign: 'right' }}>{tp('dashboard', 'colWeightedValue')}</th>
                <th>{tp('dashboard', 'colStage')}</th>
                <th>{tp('dashboard', 'colTravelMonth')}</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id}>
                  <td style={{ fontWeight: 600 }}>{d.customerName}</td>
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
                  {tp('dashboard', 'top12Subtotal')}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>${fmt(Math.round(totalValue))}</td>
                <td>—</td>
                <td style={{ textAlign: 'right', fontWeight: 700, color: '#2E7D52' }}>
                  ${fmt(Math.round(totalWeighted))}
                </td>
                <td colSpan={2}>—</td>
              </tr>
              <tr>
                <td colSpan={2} style={{ fontWeight: 600, color: 'var(--m)', fontSize: 12 }}>
                  {tp('dashboard', 'allActivePipeline')}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--m)', fontSize: 12 }}>
                  ${fmt(Math.round(allActiveValue))}
                </td>
                <td>—</td>
                <td style={{ textAlign: 'right', fontWeight: 600, color: '#2E7D52', fontSize: 12 }}>
                  ${fmt(Math.round(allActiveWeighted))}
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

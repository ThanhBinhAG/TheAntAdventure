'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { STAGE_PROB_V22, STAGE_COLORS, fmt } from '@/lib/constants';
import { getCustomerName } from '@/lib/core/crm-utils';
import type { Customer, Lead } from '@/lib/types';

export function ForecastBreakdown({ leads, customers }: { leads: Lead[]; customers: Customer[] }) {
  const { deals, allActive } = useMemo(() => {
    const active = leads
      .filter((l) => l.stage !== 'Lost' && l.stage !== 'Completed' && (l.value || 0) > 0)
      .map((l) => {
        const prob = l.probability ?? STAGE_PROB_V22[l.stage] ?? 10;
        return {
          ...l,
          tourValue: l.value || 0,
          probability: prob,
          weightedValue: ((l.value || 0) * prob) / 100,
        };
      });
    return {
      allActive: active,
      deals: [...active].sort((a, b) => b.weightedValue - a.weightedValue).slice(0, 12),
    };
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
  const allActiveValue = allActive.reduce((s, d) => s + d.tourValue, 0);
  const allActiveWeighted = allActive.reduce((s, d) => s + d.weightedValue, 0);

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
                  Top 12 subtotal
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
                  All active pipeline
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

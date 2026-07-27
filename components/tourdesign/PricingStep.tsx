'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import {
  PRICING_TIERS,
  getAdjustedSell,
  getCostPrice,
  paxToExactN,
  paxToTierN,
} from '@/lib/tour-pricing';
import { totalDurationDays } from '@/lib/tour-itinerary';
import type { Product } from '@/lib/types';

interface Props {
  briefPax: number;
  selectedProducts: Product[];
  markupPct: number;
  onMarkupChange: (v: number) => void;
  onBack: () => void;
  onNext: () => void;
}

export default function PricingStep({ briefPax, selectedProducts, markupPct: markup, onMarkupChange, onBack, onNext }: Props) {
  const [aiOpen, setAiOpen] = useState(false);

  const activeTierN = paxToTierN(briefPax);
  const curN = paxToExactN(briefPax);
  const usesOpenRate = briefPax > 10;
  const codes = selectedProducts.map((p) => p.code);
  const totalD = totalDurationDays(selectedProducts);

  const { rows, grandTotals, notFound } = useMemo(() => {
    let nf = 0;
    const grand = PRICING_TIERS.map(() => 0);
    const productRows = selectedProducts.map((sp, idx) => {
      const tierPrices = PRICING_TIERS.map(({ n }, i) => {
        const price = getAdjustedSell(sp.code, n, markup);
        if (!price && !getCostPrice(sp.code, n)) nf++;
        grand[i] += price;
        return price;
      });
      const truncName = sp.name.length > 48 ? sp.name.substring(0, 46) + '…' : sp.name;
      return { idx, truncName, tierPrices };
    });
    return { rows: productRows, grandTotals: grand, notFound: nf };
  }, [selectedProducts, markup]);

  const activeIdx = PRICING_TIERS.findIndex(({ n }) => n === activeTierN);
  const grandSell = grandTotals[activeIdx] || 0;
  const grandCost = codes.reduce((s, c) => s + getCostPrice(c, curN), 0);
  const grandMargin = grandSell - grandCost;
  const marginPctVal = grandSell > 0 ? Math.round((grandMargin / grandSell) * 100) : 0;
  const afterComm = Math.round(grandSell * 0.85);
  const groupTotal = grandSell * briefPax;
  const afterCommGrp = Math.round(afterComm * briefPax);

  function aiReview() {
    setAiOpen(true);
  }

  return (
    <div className="card">
      <div className="card-hd">
        <span className="card-title">Step 3 — Pricing Confirmation</span>
        <button className="btn btn-pu btn-sm" type="button" onClick={aiReview}>
          ✦ AI Pricing Review
        </button>
      </div>
      <div className="card-body">
        <div className="td-markup-row">
          <div style={{ flex: 1, minWidth: 220 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.7, color: 'var(--gd)' }}>✓ Auto-populated from Step 2</span>
            <span style={{ fontSize: 11, color: 'var(--m)', marginLeft: 6 }}>· Review and adjust below</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--gd)' }}>Markup %</label>
            <input
              type="range"
              min={10}
              max={60}
              step={1}
              value={markup}
              onChange={(e) => onMarkupChange(+e.target.value)}
              style={{ width: 110, accentColor: 'var(--g)' }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--g)', minWidth: 36 }}>{markup}%</span>
            <button type="button" className="btn btn-s btn-sm" onClick={() => onMarkupChange(30)}>
              Reset 30%
            </button>
          </div>
        </div>

        {!selectedProducts.length ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--m)', fontSize: 13 }}>
            ℹ️ No products selected. Go back to Step 2 and add experiences to your itinerary.
          </div>
        ) : (
          <>
            {notFound > 0 && (
              <div style={{ color: 'var(--amb)', fontSize: 11, marginBottom: 6 }}>⚠️ Some products not found in pricing library.</div>
            )}
            <div className="td-pricing-note">
              <b>Live pricing from Pricing Library</b> · Sell prices include {markup}% markup
              {usesOpenRate && (
                <>
                  {' '}
                  · Using <b>10+ rate</b> × {briefPax} guests
                </>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Experience</th>
                    {PRICING_TIERS.map(({ n, label }) => (
                      <th
                        key={n}
                        style={{
                          textAlign: 'right',
                          ...(n === activeTierN
                            ? { background: 'var(--gl)', color: 'var(--g)' }
                            : {}),
                        }}
                      >
                        {label}
                        {n === activeTierN ? (usesOpenRate ? ' ★ (applied)' : ' ★') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.idx}>
                      <td style={{ fontSize: 11.5, color: 'var(--t2)' }}>
                        {r.idx + 1}. {r.truncName}
                      </td>
                      {r.tierPrices.map((price, i) => {
                        const n = PRICING_TIERS[i].n;
                        const hl = n === activeTierN;
                        return (
                          <td key={n} style={{ textAlign: 'right', ...(hl ? { color: 'var(--g)', fontWeight: 700, background: 'var(--gl)' } : {}) }}>
                            ${price}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid var(--g)', background: '#e8f5ee44' }}>
                    <td style={{ fontWeight: 700, color: 'var(--gd)' }}>Total (per pax)</td>
                    {grandTotals.map((t, i) => {
                      const n = PRICING_TIERS[i].n;
                      const hl = n === activeTierN;
                      return (
                        <td key={n} style={{ textAlign: 'right', fontWeight: 700, ...(hl ? { color: 'var(--g)', background: 'var(--gl)' } : { color: 'var(--gd)' }) }}>
                          ${fmt(t)}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="td-pricing-kpi-grid">
              <div className="td-pricing-kpi">
                <div className="td-kpi-lbl">Cost/pax ({briefPax} pax)</div>
                <div className="td-kpi-val" style={{ fontSize: 14 }}>
                  ${fmt(grandCost)}
                </div>
              </div>
              <div className="td-pricing-kpi">
                <div className="td-kpi-lbl">Sell/pax ({briefPax} pax)</div>
                <div className="td-kpi-val" style={{ fontSize: 14, color: 'var(--g)' }}>
                  ${fmt(grandSell)}
                </div>
              </div>
              <div className="td-pricing-kpi">
                <div className="td-kpi-lbl">Margin</div>
                <div className="td-kpi-val" style={{ fontSize: 14, color: 'var(--blue)' }}>
                  ${fmt(grandMargin)} <span style={{ fontSize: 11 }}>({marginPctVal}%)</span>
                </div>
              </div>
              <div className="td-pricing-kpi">
                <div className="td-kpi-lbl">After 15% Comm</div>
                <div className="td-kpi-val" style={{ fontSize: 14, color: 'var(--amb)' }}>
                  ${fmt(afterComm)}/pax
                </div>
              </div>
            </div>

            <div className="td-pkg-summary">
              <div className="td-section-lbl" style={{ marginBottom: 9 }}>
                Package Summary — {briefPax} Pax
              </div>
              <div className="td-pkg-summary-grid">
                {[
                  ['Experiences', String(selectedProducts.length)],
                  ['Duration', `${totalD}D`],
                  ['Sell/pax', `$${fmt(grandSell)}`],
                  ['Group Total', `$${fmt(groupTotal)}`],
                  ['After Comm', `$${fmt(afterCommGrp)}`],
                ].map(([l, v]) => (
                  <div key={l}>
                    <div className="td-kpi-lbl">{l}</div>
                    <div className="td-kpi-val">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {aiOpen && (
          <div className="td-ai-panel" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pur)' }}>✦ AI Pricing Review</span>
              <button type="button" onClick={() => setAiOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m)' }}>
                ✕
              </button>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7 }}>
              At {markup}% markup, sell price is ${fmt(grandSell)}/pax for {briefPax} pax (group total ${fmt(groupTotal)}). Margin {marginPctVal}% is{' '}
              {marginPctVal >= 25 ? 'healthy for luxury Vietnam tours' : 'below the 25% floor — consider adjusting experiences or markup'}.
            </div>
          </div>
        )}

        <div className="td-nav" style={{ marginTop: 14 }}>
          <button className="btn btn-s" type="button" onClick={onBack}>
            ← Back
          </button>
          <button className="btn btn-p" type="button" onClick={onNext} disabled={!selectedProducts.length}>
            Next: AI Export →
          </button>
        </div>
      </div>
    </div>
  );
}

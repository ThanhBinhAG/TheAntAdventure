'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { REG_COLORS_HEX, REG_LABELS } from '@/lib/page-helpers';
import {
  buildDayGroups,
  formatDayDateLabel,
  formatTravelStartTitle,
  stripMarkdown,
  totalDurationDays,
} from '@/lib/tour-itinerary';
import { resolveProductPhotos } from '@/lib/tour-photos';
import {
  getCostPrice,
  getSellPrice,
  markupPct,
  paxToExactN,
  sumSellForProducts,
} from '@/lib/tour-pricing';
import type { TourBrief, GalleryPhoto } from '@/lib/tour-design-types';
import type { Product } from '@/lib/types';
import PhotoStack from '@/components/tourdesign/PhotoStack';

interface Props {
  brief: TourBrief;
  selectedProducts: Product[];
  photos: GalleryPhoto[];
  onToggleProduct: (code: string) => void;
}

const QP_PAX = [1, 2, 3, 4, 5, 6, 8, 10];

function markupColor(sell: number, cost: number): string {
  const mk = sell > 0 && cost > 0 ? Math.round(((sell - cost) / sell) * 100) : 0;
  if (mk >= 30) return '#2E7D52';
  if (mk >= 20) return '#D97706';
  return '#C0392B';
}

export default function SelectedExperiencesPanel({ brief, selectedProducts, photos, onToggleProduct }: Props) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const codes = selectedProducts.map((p) => p.code);
  const totalD = totalDurationDays(selectedProducts);
  const pn = paxToExactN(brief.pax);
  const totalSell = sumSellForProducts(codes, pn);
  const totalCost = codes.reduce((s, c) => s + getCostPrice(c, pn), 0);

  const days = useMemo(() => buildDayGroups(selectedProducts), [selectedProducts]);

  function aiRecommend() {
    const recs = selectedProducts.length
      ? `Based on ${brief.style} style and ${brief.pax} pax:\n\n• Consider pairing half-day experiences on the same day\n• Add a culinary experience every 2–3 days\n• ${brief.region === 'north' ? 'Include Halong Bay for signature scenery' : brief.region === 'central' ? 'Hue citadel + Hoi An evenings work well' : 'Mekong Delta pairs with HCMC city highlights'}`
      : `For a ${brief.style} ${brief.duration} tour (${brief.pax} pax):\n\n• Start with arrival transfer + orientation walk\n• Add 1 signature experience per region\n• Balance active days with relaxed hotel afternoons`;
    setAiResult(recs);
    setAiOpen(true);
  }

  if (!selectedProducts.length) {
    return (
      <div className="card">
        <div className="card-hd">
          <span className="card-title">
            ✓ Tour Selected (0) — 0D
          </span>
          <button className="btn btn-pu btn-sm" type="button" onClick={aiRecommend}>
            ✦ AI Recommend
          </button>
        </div>
        <div className="td-sel-empty">
          <div style={{ fontSize: 22, marginBottom: 8 }}>🗺</div>
          Click experiences on the left to build your tailor-made tour.
          <br />
          <span style={{ fontSize: 11 }}>A day-by-day draft itinerary will appear here automatically.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-hd">
        <span className="card-title">
          ✓ Tour Selected ({selectedProducts.length}) — {totalD}D
        </span>
        <button className="btn btn-pu btn-sm" type="button" onClick={aiRecommend}>
          ✦ AI Recommend
        </button>
      </div>

      {aiOpen && (
        <div className="td-ai-panel" style={{ borderRadius: 0, borderTop: '1.5px solid #d8b4fe', margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pur)' }}>✦ AI Experience Recommendations</span>
            <button type="button" onClick={() => setAiOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--m)' }}>
              ✕
            </button>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{aiResult}</div>
        </div>
      )}

      <div className="td-sel-body">
        <div className="td-kpi-row">
          <div>
            <div className="td-kpi-lbl">Experiences</div>
            <div className="td-kpi-val">{selectedProducts.length}</div>
          </div>
          <div>
            <div className="td-kpi-lbl">Total Days</div>
            <div className="td-kpi-val">{totalD}D</div>
          </div>
          <div>
            <div className="td-kpi-lbl">Sell ({brief.pax} pax)</div>
            <div className="td-kpi-val">
              ${fmt(totalSell)}
              <span style={{ fontSize: 10, fontWeight: 500 }}>/pax</span>
            </div>
          </div>
        </div>

        <div className="td-section-lbl">Selected Experiences</div>
        {selectedProducts.map((p, i) => {
          const meta = [p.dur, p.dest].filter(Boolean).join(' · ');
          return (
            <div key={p.code} className="td-sel-chip">
              <div className="td-sel-chip-num">{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--m)' }}>{meta}</div>
              </div>
              <button type="button" className="td-sel-remove" onClick={() => onToggleProduct(p.code)}>
                ×
              </button>
            </div>
          );
        })}

        <div className="td-section-lbl td-section-divider">
          {formatTravelStartTitle(brief.startDate, brief.travelMonth)}
          <span style={{ fontSize: 9.5, fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4, color: 'var(--m)' }}>
            (edit in Step 4 AI Export)
          </span>
        </div>

        {days.map((day) => {
          const dayLabel = formatDayDateLabel(
            brief.startDate,
            brief.travelMonth,
            day.n,
            day.multiDay ? { dayOf: day.dayOf!, totalDays: day.totalDays! } : undefined
          );
          const primary = day.items[0];
          const dayPhotos = resolveProductPhotos(primary, photos, 2, day.n);

          return (
            <div key={day.n} className="td-draft-day">
              <div className="td-day-badge">{dayLabel}</div>
              <div className="td-draft-day-grid td-draft-day-grid-exp">
                <div>
                  {day.items.map((item, ii) => {
                    const desc = stripMarkdown(item.desc);
                    const shortDesc = desc.substring(0, 130) + (desc.length > 130 ? '…' : '');
                    const [rbg, rfg] = REG_COLORS_HEX[item.region as keyof typeof REG_COLORS_HEX] || ['#f0f0ee', '#666'];
                    const itemSell = getSellPrice(item.code, pn);
                    const itemCost = getCostPrice(item.code, pn);
                    const itemMk = markupPct(itemSell, itemCost);
                    const regLabel = REG_LABELS[item.region as keyof typeof REG_LABELS] || 'Experience';

                    return (
                      <div key={item.code} style={{ marginBottom: ii < day.items.length - 1 ? 6 : 0 }}>
                        {ii > 0 && <div className="td-item-divider" />}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              background: rbg,
                              color: rfg,
                              fontSize: 9.5,
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: 3,
                            }}
                          >
                            {regLabel}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t)' }}>{item.name}</span>
                        </div>
                        {item.dest && (
                          <div style={{ fontSize: 10.5, color: 'var(--g)', fontWeight: 500, marginBottom: 3 }}>📍 {item.dest}</div>
                        )}
                        <div style={{ fontSize: 11, color: 'var(--m)', lineHeight: 1.5 }}>{shortDesc}</div>
                        {itemSell > 0 && (
                          <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ color: 'var(--g)' }}>${fmt(itemSell)}/pax</span>
                            <span style={{ color: '#9CA3AF' }}>Cost: ${fmt(itemCost)}/pax</span>
                            <span style={{ color: markupColor(itemSell, itemCost) }}>Markup: {itemMk}%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <PhotoStack photos={dayPhotos} productCode={primary.code} height={day.items.length > 1 ? 95 : 125} />
              </div>
            </div>
          );
        })}

        <div className="td-section-lbl td-section-divider">💵 Quick Pricing (by pax count)</div>
        {QP_PAX.map((np) => {
          const npn = Math.min(np, 10);
          const sell = sumSellForProducts(codes, npn);
          const isCur = np === brief.pax;
          return (
            <div key={np} className={`td-qp-row${isCur ? ' on' : ''}`}>
              <span>
                {np} pax{isCur ? ' ★' : ''}
              </span>
              <span>${fmt(sell)}/pax</span>
              <span style={{ fontWeight: 600 }}>${fmt(sell * np)}</span>
            </div>
          );
        })}
        <div style={{ fontSize: 10.5, color: 'var(--m)', marginTop: 6 }}>
          Net: ${fmt(totalCost)}/pax · Sell: ${fmt(totalSell)}/pax · Margin: {markupPct(totalSell, totalCost)}% · {brief.pax} pax tour total: $
          {fmt(totalSell * brief.pax)}
        </div>
      </div>
    </div>
  );
}

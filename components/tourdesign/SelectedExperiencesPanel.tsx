'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import {
  buildItinerary,
  formatDayDateLabel,
  formatTravelStartTitle,
  stripMarkdown,
  totalDurationDays,
} from '@/lib/tour-itinerary';
import { resolveProductPhotos } from '@/lib/tour-photos';
import { paxToExactN, sumSellForProducts } from '@/lib/tour-pricing';
import type { TourBrief, GalleryPhoto } from '@/lib/tour-design-types';
import type { Product } from '@/lib/types';
import PhotoStack from '@/components/tourdesign/PhotoStack';

interface Props {
  brief: TourBrief;
  selectedProducts: Product[];
  photos: GalleryPhoto[];
  onToggleProduct: (code: string) => void;
}

export default function SelectedExperiencesPanel({ brief, selectedProducts, photos, onToggleProduct }: Props) {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiResult, setAiResult] = useState('');

  const codes = selectedProducts.map((p) => p.code);
  const totalD = totalDurationDays(selectedProducts);
  const pn = paxToExactN(brief.pax);
  const totalSell = sumSellForProducts(codes, pn);

  const { addons, days } = useMemo(() => buildItinerary(selectedProducts), [selectedProducts]);

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
        {selectedProducts.map((p, i) => (
          <div key={p.code} className="td-sel-chip">
            <div className="td-sel-chip-num">{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
            </div>
            <button type="button" className="td-sel-remove" onClick={() => onToggleProduct(p.code)}>
              ×
            </button>
          </div>
        ))}

        {addons.length > 0 && (
          <>
            <div className="td-section-lbl td-section-divider">Tour Services / Add-ons</div>
            {addons.map((item) => {
              const desc = stripMarkdown(item.desc);
              const shortDesc = desc.substring(0, 130) + (desc.length > 130 ? '…' : '');
              return (
                <div key={item.code} className="td-draft-day" style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t)', marginBottom: 3 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--m)', lineHeight: 1.5 }}>{shortDesc}</div>
                </div>
              );
            })}
          </>
        )}

        {(days.length > 0 || addons.length === 0) && (
          <div className="td-section-lbl td-section-divider">
            {formatTravelStartTitle(brief.startDate, brief.travelMonth)}
            <span style={{ fontSize: 9.5, fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4, color: 'var(--m)' }}>
              (edit in Step 4 AI Export)
            </span>
          </div>
        )}

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

                    return (
                      <div key={item.code} style={{ marginBottom: ii < day.items.length - 1 ? 6 : 0 }}>
                        {ii > 0 && <div className="td-item-divider" />}
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t)', marginBottom: 3 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--m)', lineHeight: 1.5 }}>{shortDesc}</div>
                      </div>
                    );
                  })}
                </div>
                <PhotoStack photos={dayPhotos} productCode={primary.code} height={day.items.length > 1 ? 95 : 125} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

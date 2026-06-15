'use client';

import { Fragment, useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { TAA_TOURS } from '@/lib/seeds/taa-tours';
import {
  ICO_EMOJIS,
  ICO_KEYS,
  ICO_LABELS,
  INCL_NO,
  INCL_YES,
  MULTI_DURATIONS,
  PL_FX_BASE,
  type PlCurrency,
  fmtPx,
  getCostUSD,
  getSpUSD,
  mkPct,
} from '@/lib/pricing-utils';

type PricingTab = 'pricelist' | 'costbuilder' | 'markup';

export default function Pricing() {
  const [tab, setTab] = useState<PricingTab>('pricelist');
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('');
  const [currency, setCurrency] = useState<PlCurrency>('USD');
  const [showCost, setShowCost] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const [cbDur, setCbDur] = useState(12);
  const [cbPax, setCbPax] = useState(4);
  const [cbHotel, setCbHotel] = useState(85);
  const [cbGuide, setCbGuide] = useState(90);
  const [cbCar, setCbCar] = useState(75);
  const [cbMeals, setCbMeals] = useState(35);
  const [cbMarkup, setCbMarkup] = useState(25);

  const [mkCost, setMkCost] = useState(500);
  const [mkPctVal, setMkPctVal] = useState(25);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return TAA_TOURS.filter((t) => {
      if (q && !t.id.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q)) return false;
      if (region && t.region !== region) return false;
      if (category && t.category !== category) return false;
      if (duration === 'multi') {
        if (!MULTI_DURATIONS.includes(t.duration)) return false;
      } else if (duration && t.duration !== duration) return false;
      return true;
    });
  }, [search, region, category, duration]);

  const cbTotal = cbHotel * cbDur + cbGuide * cbDur + cbCar * cbDur + cbMeals * cbDur * cbPax;
  const cbPerPax = cbPax > 0 ? cbTotal / cbPax : 0;
  const cbSell = cbPerPax * (1 + cbMarkup / 100);

  const mkSell = mkCost * (1 + mkPctVal / 100);
  const mkProfit = mkSell - mkCost;

  return (
    <div>
      <div className="tabs">
        {(
          [
            ['pricelist', 'Price List 2026'],
            ['costbuilder', 'Cost Builder'],
            ['markup', 'Markup Calculator'],
          ] as const
        ).map(([id, label]) => (
          <div key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)} role="button" tabIndex={0}>
            {label}
          </div>
        ))}
      </div>

      {tab === 'pricelist' && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-body" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, alignItems: 'end', marginBottom: 10 }}>
                <div className="fg">
                  <label className="lbl">🔍 Search Tour ID or Name</label>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. Halong, AA-NV-HAN..." />
                </div>
                <div className="fg">
                  <label className="lbl">Region</label>
                  <select value={region} onChange={(e) => setRegion(e.target.value)}>
                    <option value="">All Regions</option>
                    <option>North</option>
                    <option>Central</option>
                    <option>South</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">All Categories</option>
                    <option>Cultural</option>
                    <option>Culinary</option>
                    <option>Transfer</option>
                    <option>Adventure</option>
                    <option>Luxury River Cruise</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Duration</label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                    <option value="">All Durations</option>
                    <option>Half Day</option>
                    <option>Full Day</option>
                    <option value="multi">Multi-Day</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--m)', fontWeight: 600 }}>Currency:</span>
                {(['USD', 'VND', 'AUD', 'EUR'] as PlCurrency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    style={{
                      padding: '4px 11px',
                      border: `1.5px solid ${currency === c ? 'var(--g)' : 'var(--b)'}`,
                      borderRadius: 6,
                      background: currency === c ? 'var(--g)' : 'none',
                      color: currency === c ? '#fff' : 'var(--m)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {c}
                  </button>
                ))}
                <div style={{ width: 1, height: 18, background: 'var(--b)', margin: '0 2px' }} />
                <button type="button" className="btn btn-s btn-sm" onClick={() => setShowCost(!showCost)}>
                  👁 {showCost ? 'Hide' : 'Show'} Cost
                </button>
                <div style={{ flex: 1 }} />
                <div className="fx-rate-pill">
                  <span>💱</span>
                  <span>
                    USD/VND {fmt(PL_FX_BASE.VND)} · USD/AUD {PL_FX_BASE.AUD} · USD/EUR {PL_FX_BASE.EUR}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--m)', fontWeight: 500 }}>
                  Showing {filtered.length} of {TAA_TOURS.length} tours
                </span>
                <button className="btn btn-s btn-sm" type="button" onClick={() => { setSearch(''); setRegion(''); setCategory(''); setDuration(''); }}>
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">Price List by Pax / Bảng giá theo số khách 2026</span>
              <span className="bdg bdg-g">
                {filtered.length} Products · {currency}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl pricing-tbl">
                <thead>
                  <tr>
                    <th className="pl-sticky">TOUR ID</th>
                    <th>TOUR NAME</th>
                    <th>DURATION</th>
                    <th style={{ textAlign: 'center' }}>INCLUDED</th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <th key={n} style={{ textAlign: 'right', ...(n === 1 ? { background: '#FFF8EC', color: '#D97706' } : n === 10 ? { background: '#EBF7F1', color: '#1a5c38' } : {}) }}>
                        {n} PAX
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 80).map((t, i) => {
                    const durBdg = MULTI_DURATIONS.includes(t.duration) ? 'bdg-g' : 'bdg-w';
                    const inclIcons = ICO_KEYS.map((k, j) => (
                      <span key={k} style={{ fontSize: 13, opacity: t.incl[k] ? 1 : 0.2 }} title={ICO_LABELS[j]}>
                        {ICO_EMOJIS[j]}
                      </span>
                    ));
                    return (
                      <Fragment key={t.id}>
                        <tr style={{ background: i % 2 === 0 ? '#fff' : '#FAFBF9' }}>
                          <td className="pl-sticky">
                            <code className="pl-code">{t.id}</code>
                          </td>
                          <td style={{ fontWeight: 500, fontSize: 12.5, maxWidth: 220 }}>{t.name}</td>
                          <td>
                            <span className={`bdg ${durBdg}`} style={{ fontSize: 10 }}>
                              {t.duration}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 3, justifyContent: 'center', cursor: 'pointer' }} onClick={() => setExpanded(expanded === t.num ? null : t.num)}>
                              {inclIcons}
                              <span style={{ fontSize: 9, color: '#6B7F74', alignSelf: 'center' }}>▾</span>
                            </div>
                          </td>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
                            const sp = getSpUSD(t, n);
                            const co = getCostUSD(t, n);
                            const mk = mkPct(sp, co);
                            const mkC = mk >= 30 ? '#2E7D52' : mk >= 20 ? '#D97706' : '#C0392B';
                            return (
                              <td key={n} style={{ textAlign: 'right', padding: '7px 8px', ...(n === 1 ? { background: '#FFFBF2' } : n === 10 ? { background: '#F3FAF6' } : {}) }}>
                                <span style={{ fontWeight: 700, fontSize: 12, color: n === 1 ? '#D97706' : '#2E7D52' }}>{fmtPx(sp, currency)}</span>
                                {showCost && (
                                  <div style={{ marginTop: 2 }}>
                                    <span style={{ fontSize: 9.5, color: '#9CA3AF' }}>Cost: {fmtPx(co, currency)}</span>
                                    <span style={{ fontSize: 9, marginLeft: 3, color: mkC }}>{mk}%</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                        {expanded === t.num && (
                          <tr style={{ background: '#F8FCF9' }}>
                            <td colSpan={14} style={{ padding: '12px 18px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {ICO_KEYS.map((k, j) => {
                                  const yes = t.incl[k];
                                  return (
                                    <span key={k} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, background: yes ? '#E8F5EE' : '#F5F5F5', color: yes ? '#1a5c38' : '#9CA3AF' }}>
                                      {ICO_EMOJIS[j]} {yes ? INCL_YES[j] : INCL_NO[j]}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'costbuilder' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">Tour Cost Builder</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, maxWidth: 720 }}>
              <div className="fg">
                <label className="lbl">Duration (days)</label>
                <input type="number" value={cbDur} onChange={(e) => setCbDur(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">Pax</label>
                <input type="number" value={cbPax} onChange={(e) => setCbPax(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">Markup %</label>
                <input type="number" value={cbMarkup} onChange={(e) => setCbMarkup(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">Hotel $/night</label>
                <input type="number" value={cbHotel} onChange={(e) => setCbHotel(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">Guide $/day</label>
                <input type="number" value={cbGuide} onChange={(e) => setCbGuide(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">Transport $/day</label>
                <input type="number" value={cbCar} onChange={(e) => setCbCar(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">Meals $/pax/day</label>
                <input type="number" value={cbMeals} onChange={(e) => setCbMeals(Number(e.target.value))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}>
              <div className="kpi">
                <div className="kpi-v">${fmt(Math.round(cbTotal))}</div>
                <div className="kpi-l">Total Cost</div>
              </div>
              <div className="kpi">
                <div className="kpi-v">${fmt(Math.round(cbPerPax))}</div>
                <div className="kpi-l">Cost / Pax</div>
              </div>
              <div className="kpi">
                <div className="kpi-v" style={{ color: 'var(--g)' }}>
                  ${fmt(Math.round(cbSell))}
                </div>
                <div className="kpi-l">Sell Price / Pax ({cbMarkup}% markup)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'markup' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">Markup Calculator</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 480 }}>
              <div className="fg">
                <label className="lbl">Supplier Cost (USD)</label>
                <input type="number" value={mkCost} onChange={(e) => setMkCost(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">Markup %</label>
                <input type="number" value={mkPctVal} onChange={(e) => setMkPctVal(Number(e.target.value))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}>
              <div className="kpi">
                <div className="kpi-v">${fmt(mkCost)}</div>
                <div className="kpi-l">Cost</div>
              </div>
              <div className="kpi">
                <div className="kpi-v" style={{ color: 'var(--g)' }}>
                  ${fmt(Math.round(mkSell))}
                </div>
                <div className="kpi-l">Sell Price</div>
              </div>
              <div className="kpi">
                <div className="kpi-v" style={{ color: 'var(--gold)' }}>
                  ${fmt(Math.round(mkProfit))}
                </div>
                <div className="kpi-l">Profit / Pax</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

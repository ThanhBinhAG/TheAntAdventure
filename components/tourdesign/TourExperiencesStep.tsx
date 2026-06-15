'use client';

import { useMemo, useState } from 'react';
import { REG_COLORS_HEX, REG_LABELS } from '@/lib/page-helpers';
import { TOUR_PACKAGES, type TourPackage } from '@/lib/seeds/tourPackages';
import type { Product } from '@/lib/types';

const PKG_TAG_COLORS: Record<string, [string, string]> = {
  north: ['#E8F5EE', '#1a5c38'],
  central: ['#FFF3CD', '#856404'],
  south: ['#E1F0FF', '#0c5464'],
  full: ['#F3E5F5', '#4a1460'],
};

interface Props {
  products: Product[];
  selectedCodes: string[];
  onToggleProduct: (code: string) => void;
  onSelectPackage: (pkg: TourPackage) => void;
  selectedPackageId: string | null;
}

export default function TourExperiencesStep({
  products,
  selectedCodes,
  onToggleProduct,
  onSelectPackage,
  selectedPackageId,
}: Props) {
  const [libTab, setLibTab] = useState<'pkg' | 'exp'>('pkg');
  const [previewPkg, setPreviewPkg] = useState<TourPackage | null>(null);
  const [libSearch, setLibSearch] = useState('');
  const [libRegion, setLibRegion] = useState('');
  const [libDur, setLibDur] = useState('');
  const [libCat, setLibCat] = useState('');

  const libFiltered = useMemo(() => {
    return products.filter((p) => {
      if (libRegion && p.region !== libRegion) return false;
      if (libDur) {
        const d = p.dur || '';
        if (libDur === '0.5' && !d.toLowerCase().includes('half')) return false;
        if (libDur === '1' && !d.toLowerCase().includes('full day') && d !== 'Full Day') return false;
        if (libDur === '2' && !d.includes('2D')) return false;
        if (libDur === '3' && !d.includes('3D')) return false;
        if (libDur === '4' && !d.includes('4D')) return false;
      }
      if (libCat && !(p.cat || '').toLowerCase().includes(libCat)) return false;
      const q = libSearch.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, libSearch, libRegion, libDur, libCat]);

  const activePreview = previewPkg || (selectedPackageId ? TOUR_PACKAGES.find((p) => p.id === selectedPackageId) : null);

  function openPackage(pkg: TourPackage) {
    setPreviewPkg(pkg);
    onSelectPackage(pkg);
  }

  return (
    <div className="td-exp-layout">
      <div className="card td-exp-left">
        <div className="td-lib-tabs">
          <button type="button" className={libTab === 'pkg' ? 'on' : ''} onClick={() => setLibTab('pkg')}>
            📦 Tour Packages
          </button>
          <button type="button" className={libTab === 'exp' ? 'on' : ''} onClick={() => setLibTab('exp')}>
            🗺 Individual Experiences
          </button>
        </div>

        {libTab === 'pkg' ? (
          <div style={{ padding: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--m)', marginBottom: 10 }}>Click a package to preview the full itinerary →</div>
            {TOUR_PACKAGES.map((p) => {
              const [bg, fg] = PKG_TAG_COLORS[p.tag] || ['#f0f0ee', '#555'];
              const active = selectedPackageId === p.id;
              return (
                <div
                  key={p.id}
                  className={`td-pkg-row${active ? ' active' : ''}`}
                  onClick={() => openPackage(p)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="td-pkg-badge" style={{ background: bg, color: fg }}>
                    {p.badge}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--m)', marginBottom: 3 }}>{p.subtitle}</div>
                    <div style={{ fontSize: 11, color: 'var(--g)', fontWeight: 600 }}>📍 {p.route}</div>
                    {p.flights.length > 0 && <div style={{ fontSize: 10.5, color: 'var(--pur)', marginTop: 3 }}>✈ Domestic flights included</div>}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--g)', whiteSpace: 'nowrap' }}>{p.price4pax}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="td-lib-filters">
              <input placeholder="Search experiences..." value={libSearch} onChange={(e) => setLibSearch(e.target.value)} />
              <select value={libRegion} onChange={(e) => setLibRegion(e.target.value)}>
                <option value="">All Regions</option>
                <option value="north">North Vietnam</option>
                <option value="central">Central Vietnam</option>
                <option value="south">South Vietnam</option>
              </select>
              <select value={libDur} onChange={(e) => setLibDur(e.target.value)}>
                <option value="">All Durations</option>
                <option value="0.5">Half Day</option>
                <option value="1">Full Day</option>
                <option value="2">2D1N</option>
                <option value="3">3D2N</option>
              </select>
              <select value={libCat} onChange={(e) => setLibCat(e.target.value)}>
                <option value="">All Categories</option>
                <option value="cultural">Cultural</option>
                <option value="culinary">Culinary</option>
                <option value="cycling">Cycling</option>
                <option value="transfer">Transfer</option>
              </select>
              <div style={{ fontSize: 11, color: 'var(--m)', width: '100%' }}>{libFiltered.length} experiences</div>
            </div>
            <div className="td-lib-list">
              {libFiltered.slice(0, 80).map((p) => (
                <LibRow key={p.code} product={p} selected={selectedCodes.includes(p.code)} onToggle={() => onToggleProduct(p.code)} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="card td-exp-right">
        {libTab === 'pkg' && activePreview ? (
          <>
            <div className="card-hd">
              <span className="card-title">{activePreview.name}</span>
              <span className="bdg bdg-g">{activePreview.badge}</span>
            </div>
            <div className="card-body" style={{ maxHeight: 520, overflowY: 'auto' }}>
              <div style={{ fontSize: 12, color: 'var(--m)', marginBottom: 8 }}>{activePreview.subtitle}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--g)', marginBottom: 12 }}>📍 {activePreview.route}</div>
              <div style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--td)', marginBottom: 14, lineHeight: 1.6 }}>{activePreview.tagline}</div>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--m)', marginBottom: 8 }}>
                Day-by-Day Itinerary
              </div>
              {activePreview.days.map((d) => (
                <div key={d.n} className="td-pkg-day">
                  <div className="td-pkg-day-hd">
                    Day {d.n} — {d.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--m)', marginBottom: 4 }}>{d.sub}</div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.65 }}>{d.body.slice(0, 280)}{d.body.length > 280 ? '…' : ''}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--g)', marginTop: 6 }}>
                    🏨 {d.hotel} · Meals: {d.meals}
                  </div>
                </div>
              ))}
              <button className="btn btn-p btn-sm" type="button" style={{ marginTop: 12 }} onClick={() => onSelectPackage(activePreview)}>
                ✓ Use This Package
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="card-hd">
              <span className="card-title">Selected Experiences</span>
              <span className="bdg bdg-g">{selectedCodes.length}</span>
            </div>
            <div className="card-body" style={{ maxHeight: 520, overflowY: 'auto' }}>
              {selectedCodes.length === 0 ? (
                <div className="empty-state">Select experiences from the library or choose a tour package.</div>
              ) : (
                selectedCodes.map((code, i) => {
                  const p = products.find((x) => x.code === code);
                  if (!p) return null;
                  return (
                    <div key={code} className="td-sel-row">
                      <span style={{ fontSize: 11, color: 'var(--m)' }}>Day {i + 1}</span>
                      <div style={{ flex: 1 }}>
                        <code className="pl-code">{code}</code>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{p.name}</div>
                      </div>
                      <button className="btn btn-s btn-sm" type="button" onClick={() => onToggleProduct(code)}>
                        ✕
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LibRow({ product: p, selected, onToggle }: { product: Product; selected: boolean; onToggle: () => void }) {
  const [rbg, rfg] = REG_COLORS_HEX[p.region as keyof typeof REG_COLORS_HEX] || ['#f5f5f5', '#333'];
  return (
    <div className={`td-lib-row${selected ? ' selected' : ''}`} onClick={onToggle} role="button" tabIndex={0}>
      <code className="pl-code">{p.code}</code>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
        <span className="prod-region-badge" style={{ background: rbg, color: rfg, fontSize: 9 }}>
          {REG_LABELS[p.region as keyof typeof REG_LABELS] || p.region}
        </span>
        {p.dur && <span className="dur-pill">{p.dur}</span>}
      </div>
      <span className={`bdg ${selected ? 'bdg-g' : 'bdg-w'}`}>{selected ? '✓' : '+'}</span>
    </div>
  );
}

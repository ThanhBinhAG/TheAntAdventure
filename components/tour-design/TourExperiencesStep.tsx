'use client';

import { useMemo, useState } from 'react';
import { REG_COLORS_HEX, REG_LABELS } from '@/lib/core/page-helpers';
import { assembleProposalDoc } from '@/lib/proposals/proposal-assembler';
import { buildProposalHTML } from '@/lib/proposals/proposal-html';
import { getLibPriceLabel } from '@/lib/tour-design/tour-pricing';
import { getDurationPillLabel, getDurationPillVariant, isSelectableProduct } from '@/lib/products/product-display';
import { TOUR_PACKAGES, type TourPackage } from '@/lib/seeds/tourPackages';
import type { TourBrief, GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { ExperienceOverride, Product, TourOutlineDay } from '@/lib/types';
import GuestProfileCard from '@/components/tour-design/GuestProfileCard';
import PackagePreviewPanel from '@/components/tour-design/PackagePreviewPanel';
import SelectedExperiencesPanel, {
  type OverridePatch,
} from '@/components/tour-design/SelectedExperiencesPanel';

const PKG_TAG_COLORS: Record<string, [string, string]> = {
  north: ['#E8F5EE', '#1a5c38'],
  central: ['#FFF3CD', '#856404'],
  south: ['#E1F0FF', '#0c5464'],
  full: ['#F3E5F5', '#4a1460'],
};

const DUR_FILTERS = [
  { value: '', label: 'All Durations' },
  { value: '0.5', label: 'Half Day' },
  { value: '1', label: 'Full Day' },
  { value: 'service', label: 'Service' },
  { value: '2', label: '2D1N' },
  { value: '3', label: '3D2N' },
  { value: '4', label: '4D3N' },
];

const CAT_FILTERS = [
  '',
  'cultural',
  'culinary',
  'adventure',
  'cycling',
  'nature',
  'photography',
  'wellness',
  'history',
  'transfer',
  'service',
];

interface Props {
  products: Product[];
  photos: GalleryPhoto[];
  brief: TourBrief;
  clientType: 'b2c' | 'b2b';
  custName?: string;
  selectedCodes: string[];
  onToggleProduct: (code: string) => void;
  onReorderCodes: (codes: string[]) => void;
  experienceOverrides: Record<string, ExperienceOverride>;
  onPatchOverride: (code: string, patch: OverridePatch) => void;
  onSelectPackage: (pkg: TourPackage) => void;
  selectedPackageId: string | null;
  outlineRows: TourOutlineDay[];
  markupPct: number;
  leadId?: string;
  onEditBrief?: () => void;
}

export default function TourExperiencesStep({
  products,
  photos,
  brief,
  clientType,
  custName,
  selectedCodes,
  onToggleProduct,
  onReorderCodes,
  experienceOverrides,
  onPatchOverride,
  onSelectPackage,
  selectedPackageId,
  outlineRows,
  markupPct,
  leadId,
  onEditBrief,
}: Props) {
  const [libTab, setLibTab] = useState<'pkg' | 'exp'>('pkg');
  const [previewPkgId, setPreviewPkgId] = useState<string | null>(null);
  const [libSearch, setLibSearch] = useState('');
  const [libRegion, setLibRegion] = useState('');
  const [libDur, setLibDur] = useState('');
  const [libCat, setLibCat] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedProducts = useMemo(
    () => selectedCodes.map((c) => products.find((p) => p.code === c)).filter(Boolean) as Product[],
    [products, selectedCodes]
  );

  const libFiltered = useMemo(() => {
    return products.filter((p) => {
      if (!isSelectableProduct(p)) return false;
      if (libRegion && p.region !== libRegion) return false;
      if (libDur) {
        const d = p.dur || '';
        if (libDur === 'service' && !d.toLowerCase().includes('service')) return false;
        if (libDur === '0.5' && !d.toLowerCase().includes('half') && !d.toLowerCase().includes('evening')) return false;
        if (libDur === '1' && !d.toLowerCase().includes('full day') && d !== 'Full Day') return false;
        if (libDur === '2' && !d.includes('2D') && !d.includes('2 Days')) return false;
        if (libDur === '3' && !d.includes('3D') && !d.includes('3 Days')) return false;
        if (libDur === '4' && !d.includes('4D') && !d.includes('4 Days')) return false;
      }
      if (libCat && !(p.cat || '').toLowerCase().includes(libCat)) return false;
      const q = libSearch.toLowerCase();
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q) && !p.desc.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, libSearch, libRegion, libDur, libCat]);

  const activePreview = TOUR_PACKAGES.find((p) => p.id === (previewPkgId || selectedPackageId)) || null;
  const proposalPreviewDoc = useMemo(
    () =>
      assembleProposalDoc({
        brief,
        clientType,
        customerName: custName || brief.clientName || 'To be confirmed',
        outlineRows,
        products: selectedProducts,
        selectedCodes,
        selectedPackageId,
        markupPct,
        leadId,
        logoUrl: '/Logo-3.svg',
        galleryPhotos: photos,
        experienceOverrides,
      }),
    [
      brief,
      clientType,
      custName,
      outlineRows,
      selectedProducts,
      selectedCodes,
      selectedPackageId,
      markupPct,
      leadId,
      photos,
      experienceOverrides,
    ]
  );
  const proposalPreviewHtml = useMemo(() => buildProposalHTML(proposalPreviewDoc, ''), [proposalPreviewDoc]);

  function switchTab(tab: 'pkg' | 'exp') {
    setLibTab(tab);
  }

  function openPackage(pkg: TourPackage) {
    setPreviewPkgId(pkg.id);
    onSelectPackage(pkg);
  }

  return (
    <div className="td-exp-step">
      <GuestProfileCard brief={brief} clientType={clientType} custName={custName} onEditBrief={onEditBrief} />

      <div className="td-exp-layout">
        <div className="card td-exp-left">
          <div className="td-lib-tabs">
            <button type="button" className={libTab === 'pkg' ? 'on' : ''} onClick={() => switchTab('pkg')}>
              📦 Tour Packages
            </button>
            <button type="button" className={libTab === 'exp' ? 'on' : ''} onClick={() => switchTab('exp')}>
              🗺 Individual Experiences
            </button>
          </div>

          {libTab === 'pkg' ? (
            <div className="td-lib-list" style={{ paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: 'var(--m)', marginBottom: 10 }}>Click a package to preview the full itinerary →</div>
              {TOUR_PACKAGES.map((p) => {
                const [bg, fg] = PKG_TAG_COLORS[p.tag] || ['#f0f0ee', '#555'];
                const active = (previewPkgId || selectedPackageId) === p.id;
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
                  <option value="north">🌿 North Vietnam</option>
                  <option value="central">🏛 Central Vietnam</option>
                  <option value="south">🛶 South Vietnam</option>
                  <option value="services">🛂 Services & Visa</option>
                </select>
                <select value={libDur} onChange={(e) => setLibDur(e.target.value)}>
                  {DUR_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <select value={libCat} onChange={(e) => setLibCat(e.target.value)}>
                  <option value="">All Categories</option>
                  {CAT_FILTERS.filter(Boolean).map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: 'var(--m)', width: '100%' }}>
                  {libFiltered.length} experience{libFiltered.length !== 1 ? 's' : ''} found
                </div>
              </div>
              <div className="td-lib-list">
                {libFiltered.length === 0 ? (
                  <div style={{ color: 'var(--m)', textAlign: 'center', padding: 24, fontSize: 12.5 }}>No experiences found. Try adjusting the filters.</div>
                ) : (
                  libFiltered.slice(0, 80).map((p) => (
                    <ExpRow key={p.code} product={p} selected={selectedCodes.includes(p.code)} pax={brief.pax} onToggle={() => onToggleProduct(p.code)} />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="td-exp-right-wrap">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button className="btn btn-s btn-sm" type="button" onClick={() => setPreviewOpen((v) => !v)}>
              {previewOpen ? 'Hide Preview' : '👁 Preview Proposal'}
            </button>
          </div>
          {previewOpen && (
            <div style={{ marginBottom: 12, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
              <iframe
                title="Tour Experiences proposal preview"
                srcDoc={proposalPreviewHtml}
                style={{ width: '100%', height: 520, border: 'none', background: '#fff' }}
              />
            </div>
          )}
          {libTab === 'pkg' ? (
            <PackagePreviewPanel pkg={activePreview} brief={brief} photos={photos} onUsePackage={openPackage} />
          ) : (
            <SelectedExperiencesPanel
              brief={brief}
              selectedProducts={selectedProducts}
              photos={photos}
              onToggleProduct={onToggleProduct}
              onReorderCodes={onReorderCodes}
              experienceOverrides={experienceOverrides}
              onPatchOverride={onPatchOverride}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ExpRow({ product: p, selected, pax, onToggle }: { product: Product; selected: boolean; pax: number; onToggle: () => void }) {
  const [rbg, rfg] = REG_COLORS_HEX[p.region as keyof typeof REG_COLORS_HEX] || ['#f0f0ee', '#666'];
  const durVariant = getDurationPillVariant(p.dur);
  const catLabel = p.cat ? p.cat.charAt(0).toUpperCase() + p.cat.slice(1) : '';
  const shortDesc = (p.desc || '').replace(/\*\*/g, '').substring(0, 110) + ((p.desc || '').length > 110 ? '…' : '');
  const price = getLibPriceLabel(p.code, pax);

  return (
    <div className={`prd-pick${selected ? ' sel' : ''}`} onClick={onToggle} role="button" tabIndex={0}>
      <div className="prd-icon">{selected ? '✓' : '+'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
          <span className="prod-region-badge" style={{ background: rbg, color: rfg, fontSize: 10 }}>
            {REG_LABELS[p.region as keyof typeof REG_LABELS] || p.region}
          </span>
          <span className={`td-dur-pill td-dur-${durVariant}`}>{getDurationPillLabel(p.dur)}</span>
          {catLabel && <span className="td-cat-pill">{catLabel}</span>}
          <span style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 240 }} title={p.name}>
            {p.name}
          </span>
        </div>
        {p.dest && <div style={{ fontSize: 10.5, color: 'var(--g)', fontWeight: 500, marginBottom: 2 }}>📍 {p.dest}</div>}
        <div style={{ fontSize: 11.5, color: 'var(--m)', lineHeight: 1.45, marginBottom: 3 }}>{shortDesc}</div>
        <div style={{ fontSize: 11.5, color: 'var(--g)', fontWeight: 600 }}>{price}</div>
      </div>
    </div>
  );
}

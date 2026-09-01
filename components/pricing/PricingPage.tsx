'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PricingEditModal from '@/components/pricing/PricingEditModal';
import { fmt } from '@/lib/constants';
import { useStore } from '@/hooks/useStore';
import {
  buildPricingTableRows,
  countOrphanPricing,
  emptyProductPricing,
  type PricingTableRow,
} from '@/lib/products/product-pricing-helpers';
import { isSelectableProduct } from '@/lib/products/product-display';
import {
  buildPricingFilterSummary,
  downloadPricingXlsx,
  paxColumnLabel,
  pricingExportFilename,
} from '@/lib/pricing/pricing-export';
import { printPricing } from '@/lib/pricing/pricing-html';
import {
  ICO_EMOJIS,
  ICO_KEYS,
  MULTI_DURATIONS,
  PL_FX_BASE,
  type PlCurrency,
  fmtPx,
  getCostUSD,
  getSpUSD,
  mkPct,
} from '@/lib/pricing/pricing-utils';
import { toast } from '@/lib/toast';
import { usePagePermission } from '@/hooks/usePagePermission';
import { getBffData } from '@/lib/bff/client';
import type { ProductPricing } from '@/lib/types';
import PaginationBar from '@/components/PaginationBar';
import { usePageSize } from '@/hooks/usePageSize';
import { useProductPage } from '@/hooks/useProductPage';
import { useLanguage } from '@/hooks/useLanguage';
import type { ProductPageSize } from '@/lib/products/product-list-input';

type PricingTab = 'pricelist' | 'costbuilder' | 'markup';

const TAB_KEYS = [
  ['pricelist', 'tabPriceList'],
  ['costbuilder', 'tabCostBuilder'],
  ['markup', 'tabMarkupCalculator'],
] as const;

const REGION_OPTIONS = [
  { value: '', labelKey: 'regionAll' },
  { value: 'North', labelKey: 'regionNorth' },
  { value: 'Central', labelKey: 'regionCentral' },
  { value: 'South', labelKey: 'regionSouth' },
  { value: 'Services', labelKey: 'regionServices' },
] as const;

const CATEGORY_OPTIONS = [
  { value: '', labelKey: 'categoryAll' },
  { value: 'Cultural', labelKey: 'categoryCultural' },
  { value: 'Culinary', labelKey: 'categoryCulinary' },
  { value: 'Transfer', labelKey: 'categoryTransfer' },
  { value: 'Adventure', labelKey: 'categoryAdventure' },
  { value: 'Luxury River Cruise', labelKey: 'categoryLuxuryRiverCruise' },
] as const;

const DURATION_OPTIONS = [
  { value: '', labelKey: 'durationAll' },
  { value: 'Half Day', labelKey: 'durationHalfDay' },
  { value: 'Full Day', labelKey: 'durationFullDay' },
  { value: 'multi', labelKey: 'durationMultiDay' },
] as const;

const INCL_LABEL_KEYS = ['inclGuide', 'inclTransport', 'inclTickets', 'inclWater', 'inclMeals'] as const;
const INCL_YES_KEYS = ['inclGuideYes', 'inclTransportYes', 'inclTicketsYes', 'inclWaterYes', 'inclMealsYes'] as const;
const INCL_NO_KEYS = ['inclGuideNo', 'inclTransportNo', 'inclTicketsNo', 'inclWaterNo', 'inclMealsNo'] as const;

function formatPdfDownloadError(message: string, tp: (page: 'pricing', key: string) => string): string {
  if (/libnspr4|libnss3|browser process|Code:\s*127|shared libraries|could not start Chromium/i.test(message)) {
    return `${message}\n\n${tp('pricing', 'pdfDepsHint')}`;
  }
  return message;
}

export default function Pricing() {
  const { tp, tpl } = useLanguage();
  const { canWrite } = usePagePermission('pricing');
  const searchParams = useSearchParams();
  const highlightCode = searchParams.get('product') ?? '';

  const upsertProductPricing = useStore((s) => s.upsertProductPricing);

  const [tab, setTab] = useState<PricingTab>('pricelist');
  const [search, setSearch] = useState(() => highlightCode);
  const [previousHighlightCode, setPreviousHighlightCode] = useState(highlightCode);
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState('');
  const [duration, setDuration] = useState('');
  const [currency, setCurrency] = useState<PlCurrency>('USD');
  const [showCost, setShowCost] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<PricingTableRow | null>(null);
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  const [cbDur, setCbDur] = useState(12);
  const [cbPax, setCbPax] = useState(4);
  const [cbHotel, setCbHotel] = useState(85);
  const [cbGuide, setCbGuide] = useState(90);
  const [cbCar, setCbCar] = useState(75);
  const [cbMeals, setCbMeals] = useState(35);
  const [cbMarkup, setCbMarkup] = useState(25);

  const [mkCost, setMkCost] = useState(500);
  const [mkPctVal, setMkPctVal] = useState(25);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [exportError, setExportError] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagePricing, setPagePricing] = useState<ProductPricing[]>([]);
  const { pageSize, setPageSize } = usePageSize();
  const { data: productPage } = useProductPage({
    page,
    pageSize: pageSize as ProductPageSize,
    view: 'catalog',
    q: search || undefined,
    region: region || undefined,
    duration: duration && duration !== 'multi' ? duration : undefined,
    category: category || undefined,
  });

  if (highlightCode !== previousHighlightCode) {
    setPreviousHighlightCode(highlightCode);
    setSearch(highlightCode);
  }

  useEffect(() => {
    if (highlightCode && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightCode, pagePricing.length, search]);

  useEffect(() => {
    let active = true;
    const products = productPage?.items ?? [];
    void Promise.all(
      products.map((product) =>
        getBffData<ProductPricing>(
          `/api/products/pricing?productCode=${encodeURIComponent(product.code)}`,
          tpl('pricing', 'loadProductPricingFailed', { code: product.code })
        ).catch(() => null)
      )
    )
      .then((pricing) => {
        if (!active) return;
        setPagePricing(pricing.filter((row): row is ProductPricing => row !== null));
        setLoadError(null);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : tp('pricing', 'loadPricingFailed'));
      });
    return () => {
      active = false;
    };
  }, [productPage?.items, tp, tpl]);

  const selectableProducts = useMemo(
    () => (productPage?.items ?? []).filter(isSelectableProduct),
    [productPage?.items]
  );

  const allRows = useMemo(
    () => buildPricingTableRows(selectableProducts, pagePricing),
    [selectableProducts, pagePricing]
  );

  const orphanCount = useMemo(
    () => countOrphanPricing(selectableProducts, pagePricing),
    [selectableProducts, pagePricing]
  );
  const missingCount = allRows.filter((r) => r.missingProduct).length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allRows.filter((t) => {
      if (q && !t.productCode.toLowerCase().includes(q) && !t.name.toLowerCase().includes(q)) return false;
      if (region && t.region !== region) return false;
      if (category && t.category !== category) return false;
      if (duration === 'multi') {
        if (!MULTI_DURATIONS.includes(t.duration)) return false;
      } else if (duration && t.duration !== duration) return false;
      return true;
    });
  }, [allRows, search, region, category, duration]);

  const cbTotal = cbHotel * cbDur + cbGuide * cbDur + cbCar * cbDur + cbMeals * cbDur * cbPax;
  const cbPerPax = cbPax > 0 ? cbTotal / cbPax : 0;
  const cbSell = cbPerPax * (1 + cbMarkup / 100);

  const mkSell = mkCost * (1 + mkPctVal / 100);
  const mkProfit = mkSell - mkCost;

  const handleSavePricing = async (row: ReturnType<typeof emptyProductPricing>) => {
    try {
      const res = await fetch('/api/products/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pricing: row }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? tp('pricing', 'savePricingFailed'));
      }
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error ?? tp('pricing', 'savePricingFailed'));
      }

      setPagePricing((current) => {
        const exists = current.some((pricing) => pricing.productCode === row.productCode);
        return exists
          ? current.map((pricing) => pricing.productCode === row.productCode ? row : pricing)
          : [...current, row];
      });
      upsertProductPricing(row);
      setEditRow(null);
      toast.success(tp('pricing', 'savePricingSuccess'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tp('pricing', 'savePricingError'));
    }
  };

  const exportOptions = useMemo(
    () => ({
      currency,
      showCost,
      filterSummary: buildPricingFilterSummary({ search, region, category, duration }),
    }),
    [currency, showCost, search, region, category, duration]
  );

  const handleDownloadExcel = useCallback(() => {
    if (filtered.length === 0) {
      toast.warning(tp('pricing', 'exportNoProducts'));
      return;
    }
    setExportError('');
    downloadPricingXlsx(filtered, exportOptions);
  }, [filtered, exportOptions, tp]);

  const handlePrintPdf = useCallback(() => {
    if (filtered.length === 0) {
      toast.warning(tp('pricing', 'exportNoProducts'));
      return;
    }
    setExportError('');
    printPricing(filtered, { ...exportOptions, logoUrl: '/Logo-3.svg' }, window.location.origin);
  }, [filtered, exportOptions, tp]);

  const handleDownloadPdf = useCallback(async () => {
    if (filtered.length === 0) {
      toast.warning(tp('pricing', 'exportNoProducts'));
      return;
    }
    setPdfLoading(true);
    setExportError('');
    try {
      const res = await fetch('/api/pricing/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: filtered,
          currency: exportOptions.currency,
          showCost: exportOptions.showCost,
          filterSummary: exportOptions.filterSummary,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || tpl('pricing', 'exportFailed', { status: res.status }));
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = pricingExportFilename(exportOptions.currency).replace('.xlsx', '.pdf');
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(formatPdfDownloadError(e instanceof Error ? e.message : tp('pricing', 'pdfExportFailed'), tp));
    } finally {
      setPdfLoading(false);
    }
  }, [filtered, exportOptions, tp, tpl]);

  return (
    <div>
      {loadError && (
        <div role="alert" style={{ marginBottom: 12, padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, fontSize: 12, color: '#991B1B' }}>
          {loadError}
        </div>
      )}
      <div className="tabs">
        {TAB_KEYS.map(([id, labelKey]) => (
          <div key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)} role="button" tabIndex={0}>
            {tp('pricing', labelKey)}
          </div>
        ))}
      </div>

      {tab === 'pricelist' && (
        <>
          {(orphanCount > 0 || missingCount > 0) && (
            <div className="card" style={{ marginBottom: 12, borderColor: '#F5D0A0' }}>
              <div className="card-body" style={{ padding: '10px 16px', fontSize: 12 }}>
                {missingCount > 0 && (
                  <span style={{ marginRight: 16 }}>
                    ⚠ {tpl('pricing', 'warnMissingPricing', { count: missingCount })}
                  </span>
                )}
                {orphanCount > 0 && (
                  <span>
                    ⚠ {tpl('pricing', 'warnOrphanPricing', { count: orphanCount })}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 12 }}>
            <div className="card-body" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 10, alignItems: 'end', marginBottom: 10 }}>
                <div className="fg">
                  <label className="lbl">🔍 {tp('pricing', 'searchLabel')}</label>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tp('pricing', 'searchPlaceholder')} />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('pricing', 'regionLabel')}</label>
                  <select value={region} onChange={(e) => setRegion(e.target.value)}>
                    {REGION_OPTIONS.map(({ value, labelKey }) => (
                      <option key={value || 'all'} value={value}>{tp('pricing', labelKey)}</option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">{tp('pricing', 'categoryLabel')}</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CATEGORY_OPTIONS.map(({ value, labelKey }) => (
                      <option key={value || 'all'} value={value}>{tp('pricing', labelKey)}</option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">{tp('pricing', 'durationLabel')}</label>
                  <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                    {DURATION_OPTIONS.map(({ value, labelKey }) => (
                      <option key={value || 'all'} value={value}>{tp('pricing', labelKey)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--m)', fontWeight: 600 }}>{tp('pricing', 'currencyLabel')}</span>
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
                  👁 {showCost ? tp('pricing', 'hideCost') : tp('pricing', 'showCost')}
                </button>
                <div style={{ flex: 1 }} />
                <div className="fx-rate-pill">
                  <span>💱</span>
                  <span>
                    USD/VND {fmt(PL_FX_BASE.VND)} · USD/AUD {PL_FX_BASE.AUD} · USD/EUR {PL_FX_BASE.EUR}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--m)', fontWeight: 500 }}>
                  {tpl('pricing', 'showingTours', { shown: filtered.length, total: productPage?.totalCount ?? 0 })}
                </span>
                <button className="btn btn-s btn-sm" type="button" onClick={() => { setSearch(''); setRegion(''); setCategory(''); setDuration(''); }}>
                  {tp('pricing', 'clearFilters')}
                </button>
                <div style={{ width: 1, height: 18, background: 'var(--b)', margin: '0 2px' }} />
                <button
                  className="btn btn-p btn-sm"
                  type="button"
                  onClick={handleDownloadExcel}
                  disabled={filtered.length === 0 || !canWrite}
                  title={!canWrite ? tp('pricing', 'permExportExcel') : undefined}
                >
                  {tp('pricing', 'downloadExcel')}
                </button>
                <button
                  className="btn btn-s btn-sm"
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={pdfLoading || filtered.length === 0 || !canWrite}
                  title={!canWrite ? tp('pricing', 'permExportPdf') : undefined}
                >
                  {pdfLoading ? tp('pricing', 'generatingPdf') : tp('pricing', 'downloadPdf')}
                </button>
                <button
                  className="btn btn-s btn-sm"
                  type="button"
                  onClick={handlePrintPdf}
                  disabled={filtered.length === 0 || !canWrite}
                  title={!canWrite ? tp('pricing', 'permExportPrint') : undefined}
                >
                  {tp('pricing', 'printSavePdf')}
                </button>
              </div>
              {exportError && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, fontSize: 12, color: '#991B1B', whiteSpace: 'pre-wrap' }}>
                  {exportError}
                </div>
              )}
            </div>
            <PaginationBar
              page={productPage?.page ?? page}
              setPage={setPage}
              totalPages={productPage?.totalPages ?? 1}
              total={productPage?.totalCount ?? 0}
              pageSize={pageSize}
              rangeStart={productPage?.totalCount ? ((productPage.page - 1) * pageSize) + 1 : 0}
              rangeEnd={productPage ? Math.min(productPage.page * pageSize, productPage.totalCount) : 0}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>

          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('pricing', 'cardTitlePriceList')}</span>
              <span className="bdg bdg-g">
                {tpl('pricing', 'productsCount', { count: filtered.length, currency })}
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="tbl pricing-tbl">
                <thead>
                  <tr>
                    <th className="pl-sticky">{tp('pricing', 'colTourId')}</th>
                    <th>{tp('pricing', 'colTourName')}</th>
                    <th>{tp('pricing', 'colDuration')}</th>
                    <th style={{ textAlign: 'center' }}>{tp('pricing', 'colIncluded')}</th>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <th key={n} style={{ textAlign: 'right', ...(n === 1 ? { background: '#FFF8EC', color: '#D97706' } : n === 10 ? { background: '#EBF7F1', color: '#1a5c38' } : {}) }}>
                        {paxColumnLabel(n)}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const durBdg = MULTI_DURATIONS.includes(t.duration) ? 'bdg-g' : 'bdg-w';
                    const inclIcons = ICO_KEYS.map((k, j) => (
                      <span key={k} style={{ fontSize: 13, opacity: t.pricing.incl[k] ? 1 : 0.2 }} title={tp('pricing', INCL_LABEL_KEYS[j])}>
                        {ICO_EMOJIS[j]}
                      </span>
                    ));
                    const isHighlight = highlightCode && t.productCode === highlightCode;
                    return (
                      <Fragment key={t.productCode}>
                        <tr
                          ref={isHighlight ? highlightRef : undefined}
                          style={{
                            background: isHighlight ? '#FFF8E8' : i % 2 === 0 ? '#fff' : '#FAFBF9',
                            outline: isHighlight ? '2px solid var(--gold)' : undefined,
                          }}
                        >
                          <td className="pl-sticky">
                            <code className="pl-code">{t.productCode}</code>
                            {t.missingProduct && <div className="bdg bdg-a" style={{ fontSize: 9, marginTop: 4 }}>{tp('pricing', 'badgeNoTiers')}</div>}
                            {t.orphanPricing && <div className="bdg bdg-r" style={{ fontSize: 9, marginTop: 4 }}>{tp('pricing', 'badgeOrphan')}</div>}
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
                            const sp = getSpUSD(t.pricing, n);
                            const co = getCostUSD(t.pricing, n);
                            const mk = mkPct(sp, co);
                            const mkC = mk >= 30 ? '#2E7D52' : mk >= 20 ? '#D97706' : '#C0392B';
                            return (
                              <td key={n} style={{ textAlign: 'right', padding: '7px 8px', ...(n === 1 ? { background: '#FFFBF2' } : n === 10 ? { background: '#F3FAF6' } : {}) }}>
                                <span style={{ fontWeight: 700, fontSize: 12, color: n === 1 ? '#D97706' : '#2E7D52' }}>{fmtPx(sp, currency)}</span>
                                {showCost && (
                                  <div style={{ marginTop: 2 }}>
                                    <span style={{ fontSize: 9.5, color: '#9CA3AF' }}>{tp('pricing', 'costLabel')} {fmtPx(co, currency)}</span>
                                    <span style={{ fontSize: 9, marginLeft: 3, color: mkC }}>{mk}%</span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ whiteSpace: 'nowrap' }}>
                            <button
                              type="button"
                              className="btn btn-s btn-sm"
                              onClick={() => setEditRow(t)}
                              disabled={!canWrite}
                              title={!canWrite ? tp('pricing', 'permEditPrice') : undefined}
                            >
                              {tp('pricing', 'edit')}
                            </button>
                          </td>
                        </tr>
                        {expanded === t.num && (
                          <tr style={{ background: '#F8FCF9' }}>
                            <td colSpan={15} style={{ padding: '12px 18px' }}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                                {ICO_KEYS.map((k, j) => {
                                  const yes = t.pricing.incl[k];
                                  return (
                                    <span key={k} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 10, background: yes ? '#E8F5EE' : '#F5F5F5', color: yes ? '#1a5c38' : '#9CA3AF' }}>
                                      {ICO_EMOJIS[j]} {yes ? tp('pricing', INCL_YES_KEYS[j]) : tp('pricing', INCL_NO_KEYS[j])}
                                    </span>
                                  );
                                })}
                              </div>
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {!t.orphanPricing && (
                                  <Link href={`/products`} className="btn btn-s btn-sm">
                                    {tp('pricing', 'viewInTourProducts')}
                                  </Link>
                                )}
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
            <span className="card-title">{tp('pricing', 'costBuilderTitle')}</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, maxWidth: 720 }}>
              <div className="fg">
                <label className="lbl">{tp('pricing', 'cbDurationDays')}</label>
                <input type="number" value={cbDur} onChange={(e) => setCbDur(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">{tp('pricing', 'cbPax')}</label>
                <input type="number" value={cbPax} onChange={(e) => setCbPax(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">{tp('pricing', 'cbMarkupPct')}</label>
                <input type="number" value={cbMarkup} onChange={(e) => setCbMarkup(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">{tp('pricing', 'cbHotelPerNight')}</label>
                <input type="number" value={cbHotel} onChange={(e) => setCbHotel(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">{tp('pricing', 'cbGuidePerDay')}</label>
                <input type="number" value={cbGuide} onChange={(e) => setCbGuide(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">{tp('pricing', 'cbTransportPerDay')}</label>
                <input type="number" value={cbCar} onChange={(e) => setCbCar(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">{tp('pricing', 'cbMealsPerPaxDay')}</label>
                <input type="number" value={cbMeals} onChange={(e) => setCbMeals(Number(e.target.value))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}>
              <div className="kpi">
                <div className="kpi-v">${fmt(Math.round(cbTotal))}</div>
                <div className="kpi-l">{tp('pricing', 'cbTotalCost')}</div>
              </div>
              <div className="kpi">
                <div className="kpi-v">${fmt(Math.round(cbPerPax))}</div>
                <div className="kpi-l">{tp('pricing', 'cbCostPerPax')}</div>
              </div>
              <div className="kpi">
                <div className="kpi-v" style={{ color: 'var(--g)' }}>
                  ${fmt(Math.round(cbSell))}
                </div>
                <div className="kpi-l">{tpl('pricing', 'cbSellPricePerPax', { markup: cbMarkup })}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'markup' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tp('pricing', 'markupCalcTitle')}</span>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, maxWidth: 480 }}>
              <div className="fg">
                <label className="lbl">{tp('pricing', 'mkSupplierCost')}</label>
                <input type="number" value={mkCost} onChange={(e) => setMkCost(Number(e.target.value))} />
              </div>
              <div className="fg">
                <label className="lbl">{tp('pricing', 'cbMarkupPct')}</label>
                <input type="number" value={mkPctVal} onChange={(e) => setMkPctVal(Number(e.target.value))} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20 }}>
              <div className="kpi">
                <div className="kpi-v">${fmt(mkCost)}</div>
                <div className="kpi-l">{tp('pricing', 'mkCost')}</div>
              </div>
              <div className="kpi">
                <div className="kpi-v" style={{ color: 'var(--g)' }}>
                  ${fmt(Math.round(mkSell))}
                </div>
                <div className="kpi-l">{tp('pricing', 'mkSellPrice')}</div>
              </div>
              <div className="kpi">
                <div className="kpi-v" style={{ color: 'var(--gold)' }}>
                  ${fmt(Math.round(mkProfit))}
                </div>
                <div className="kpi-l">{tp('pricing', 'mkProfitPerPax')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <PricingEditModal
        open={!!editRow}
        productCode={editRow?.productCode ?? ''}
        productName={editRow?.name ?? ''}
        pricing={editRow?.pricing ?? null}
        onClose={() => setEditRow(null)}
        onSave={handleSavePricing}
      />
    </div>
  );
}

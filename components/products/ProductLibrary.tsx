'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import PaginationBar from '@/components/PaginationBar';
import ProductCard from '@/components/products/ProductCard';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { deriveCategoriesFromProducts } from '@/lib/products/product-form';
import {
  matchesPricingStatusFilter,
  pricingStatus as getPricingStatus,
  type PricingStatus,
  type PricingStatusFilter,
} from '@/lib/products/product-pricing-helpers';
import type { Product, ProductPricing } from '@/lib/types';

const DURATION_OPTIONS = [
  'Half Day',
  'Full Day',
  'Evening (2–3 hours)',
  'Evening (3–4 hours)',
  '2 Days 1 Night',
  '3 Days 2 Nights',
  '4 Days 3 Nights',
  'Service',
];

const REGIONS = [
  { value: 'north', label: 'Northern' },
  { value: 'central', label: 'Central' },
  { value: 'south', label: 'Southern' },
  { value: 'services', label: 'Services' },
] as const;

const PRICING_OPTIONS: { value: PricingStatusFilter; label: string }[] = [
  { value: '', label: 'All pricing' },
  { value: 'complete', label: 'Full pricing' },
  { value: 'incomplete', label: 'Partial' },
  { value: 'missing', label: 'No pricing' },
];

interface ProductLibraryProps {
  products: Product[];
  productPricing: ProductPricing[];
  search: string;
  onSearchChange: (q: string) => void;
  region: string;
  onRegionChange: (v: string) => void;
  duration: string;
  onDurationChange: (v: string) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  destFilter: string;
  onDestFilterChange: (v: string) => void;
  pricingStatus: PricingStatusFilter;
  onPricingStatusChange: (v: PricingStatusFilter) => void;
  pickMode?: boolean;
  onOpenDetail: (code: string) => void;
  onPickProduct?: (p: Product) => void;
  onShownCountChange?: (n: number) => void;
}

export default function ProductLibrary({
  products,
  productPricing,
  search,
  onSearchChange,
  region,
  onRegionChange,
  duration,
  onDurationChange,
  category,
  onCategoryChange,
  destFilter,
  onDestFilterChange,
  pricingStatus,
  onPricingStatusChange,
  pickMode = false,
  onOpenDetail,
  onPickProduct,
  onShownCountChange,
}: ProductLibraryProps) {
  const [facetOpen, setFacetOpen] = useState(false);
  const categories = useMemo(() => deriveCategoriesFromProducts(products), [products]);
  const { pageSize, setPageSize } = usePageSize();

  const pricingByCode = useMemo(
    () => new Map(productPricing.map((row) => [row.productCode, row])),
    [productPricing]
  );

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase();
      if (region && p.region !== region) return false;
      if (duration && p.dur !== duration) return false;
      if (category && !p.cat.toLowerCase().includes(category.toLowerCase())) return false;
      if (destFilter && p.dest !== destFilter) return false;
      if (!matchesPricingStatusFilter(p.code, pricingByCode, pricingStatus)) return false;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.desc.toLowerCase().includes(q) &&
        !p.code.toLowerCase().includes(q) &&
        !p.dest.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [products, search, region, duration, category, destFilter, pricingStatus, pricingByCode]);

  const pagination = usePagination(filtered, pageSize, [
    search,
    region,
    duration,
    category,
    destFilter,
    pricingStatus,
    pageSize,
  ]);

  useEffect(() => {
    onShownCountChange?.(filtered.length);
  }, [filtered.length, onShownCountChange]);

  /** Destination counts from products matching all filters except dest (so sidebar stays useful). */
  const destCounts = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach((p) => {
      const q = search.toLowerCase();
      if (region && p.region !== region) return;
      if (duration && p.dur !== duration) return;
      if (category && !p.cat.toLowerCase().includes(category.toLowerCase())) return;
      if (!matchesPricingStatusFilter(p.code, pricingByCode, pricingStatus)) return;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.desc.toLowerCase().includes(q) &&
        !p.code.toLowerCase().includes(q) &&
        !p.dest.toLowerCase().includes(q)
      )
        return;
      const key = p.dest || 'Other';
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [products, search, region, duration, category, pricingStatus, pricingByCode]);

  const destList = useMemo(
    () => Object.keys(destCounts).sort((a, b) => a.localeCompare(b)),
    [destCounts]
  );

  const destTotal = useMemo(() => Object.values(destCounts).reduce((n, c) => n + c, 0), [destCounts]);

  /** Pricing health for products matching filters except pricing status (so pulse stays actionable). */
  const pricingPulse = useMemo(() => {
    const tallies: Record<PricingStatus, number> = { complete: 0, incomplete: 0, missing: 0 };
    products.forEach((p) => {
      const q = search.toLowerCase();
      if (region && p.region !== region) return;
      if (duration && p.dur !== duration) return;
      if (category && !p.cat.toLowerCase().includes(category.toLowerCase())) return;
      if (destFilter && p.dest !== destFilter) return;
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.desc.toLowerCase().includes(q) &&
        !p.code.toLowerCase().includes(q) &&
        !p.dest.toLowerCase().includes(q)
      )
        return;
      tallies[getPricingStatus(pricingByCode.get(p.code))] += 1;
    });
    const total = tallies.complete + tallies.incomplete + tallies.missing;
    return { ...tallies, total };
  }, [products, search, region, duration, category, destFilter, pricingByCode]);

  const hasFilters = !!(search || region || duration || category || destFilter || pricingStatus);

  const clearFilters = () => {
    onSearchChange('');
    onRegionChange('');
    onDurationChange('');
    onCategoryChange('');
    onDestFilterChange('');
    onPricingStatusChange('');
  };

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (destFilter) activeChips.push({ key: 'dest', label: destFilter, clear: () => onDestFilterChange('') });
  if (region) {
    const label = REGIONS.find((r) => r.value === region)?.label || region;
    activeChips.push({ key: 'region', label, clear: () => onRegionChange('') });
  }
  if (duration) activeChips.push({ key: 'dur', label: duration, clear: () => onDurationChange('') });
  if (category) activeChips.push({ key: 'cat', label: category, clear: () => onCategoryChange('') });
  if (pricingStatus) {
    const label = PRICING_OPTIONS.find((o) => o.value === pricingStatus)?.label || pricingStatus;
    activeChips.push({ key: 'price', label, clear: () => onPricingStatusChange('') });
  }
  if (search) activeChips.push({ key: 'q', label: `“${search}”`, clear: () => onSearchChange('') });

  const facetPanel = (
    <aside className="tp-facet">
      <div className="tp-facet-block">
        <div className="tp-facet-label">Destinations</div>
        <DestFilterCombobox
          destFilter={destFilter}
          destList={destList}
          destCounts={destCounts}
          destTotal={destTotal}
          onDestFilterChange={onDestFilterChange}
        />
      </div>

      <div className="tp-facet-block">
        <div className="tp-facet-label">Region</div>
        <div className="tp-facet-pills">
          <button
            type="button"
            className={`tp-facet-pill${region === '' ? ' on' : ''}`}
            onClick={() => onRegionChange('')}
          >
            All
          </button>
          {REGIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              className={`tp-facet-pill${region === r.value ? ' on' : ''}`}
              onClick={() => onRegionChange(region === r.value ? '' : r.value)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tp-facet-block">
        <div className="tp-facet-label">Duration</div>
        <div className="tp-facet-pills">
          <button
            type="button"
            className={`tp-facet-pill${duration === '' ? ' on' : ''}`}
            onClick={() => onDurationChange('')}
          >
            All
          </button>
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              className={`tp-facet-pill${duration === d ? ' on' : ''}`}
              onClick={() => onDurationChange(duration === d ? '' : d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="tp-facet-block">
        <div className="tp-facet-label">Category</div>
        <div className="tp-facet-pills">
          <button
            type="button"
            className={`tp-facet-pill${category === '' ? ' on' : ''}`}
            onClick={() => onCategoryChange('')}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`tp-facet-pill${category === c ? ' on' : ''}`}
              onClick={() => onCategoryChange(category === c ? '' : c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="tp-facet-block">
        <div className="tp-facet-label">Pricing</div>
        <div className="tp-facet-pills">
          {PRICING_OPTIONS.map((o) => (
            <button
              key={o.value || 'all'}
              type="button"
              className={`tp-facet-pill${pricingStatus === o.value ? ' on' : ''}`}
              onClick={() => onPricingStatusChange(pricingStatus === o.value ? '' : o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tp-facet-pulse">
        <div className="tp-facet-pulse-hd">
          <span className="tp-facet-label" style={{ marginBottom: 0 }}>
            Pricing health
          </span>
          <Link href="/pricing-essentials" className="tp-facet-pulse-link">
            Open Pricing
          </Link>
        </div>
        <div className="tp-facet-pulse-bars" aria-hidden={pricingPulse.total === 0}>
          {pricingPulse.complete > 0 && (
            <span
              className="tp-facet-pulse-seg tp-facet-pulse-seg--ok"
              style={{ flexGrow: pricingPulse.complete }}
              title={`Full pricing: ${pricingPulse.complete}`}
            />
          )}
          {pricingPulse.incomplete > 0 && (
            <span
              className="tp-facet-pulse-seg tp-facet-pulse-seg--partial"
              style={{ flexGrow: pricingPulse.incomplete }}
              title={`Partial: ${pricingPulse.incomplete}`}
            />
          )}
          {pricingPulse.missing > 0 && (
            <span
              className="tp-facet-pulse-seg tp-facet-pulse-seg--miss"
              style={{ flexGrow: pricingPulse.missing }}
              title={`No pricing: ${pricingPulse.missing}`}
            />
          )}
        </div>
        <div className="tp-facet-pulse-stats">
          {(
            [
              ['complete', 'Full', pricingPulse.complete],
              ['incomplete', 'Partial', pricingPulse.incomplete],
              ['missing', 'No $', pricingPulse.missing],
            ] as const
          ).map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              className={`tp-facet-pulse-stat${pricingStatus === key ? ' on' : ''}`}
              onClick={() => onPricingStatusChange(pricingStatus === key ? '' : key)}
              title={`Show ${label.toLowerCase()} pricing`}
            >
              <strong>{count}</strong>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="tp-facet-pulse-links">
          <Link href="/attractions">Museum hours</Link>
          <Link href="/gallery">Photo library</Link>
        </div>
      </div>

      <div className="tp-facet-foot">
        <span className="tp-facet-foot-stat">
          {filtered.length} match{filtered.length === 1 ? '' : 'es'}
        </span>
        {hasFilters ? (
          <button type="button" className="tp-facet-foot-clear" onClick={clearFilters}>
            Clear filters
          </button>
        ) : (
          <span className="tp-facet-foot-hint">Tap a status to filter</span>
        )}
      </div>
    </aside>
  );

  return (
    <div className={`tp-catalog${pickMode ? ' prod-pick-mode' : ''}`}>
      <button type="button" className="tp-facet-toggle" onClick={() => setFacetOpen((o) => !o)}>
        {facetOpen ? 'Hide filters' : 'Filters & destinations'}
      </button>

      <div className={`tp-facet-backdrop${facetOpen ? ' open' : ''}`} onClick={() => setFacetOpen(false)} />
      <div className={`tp-facet-wrap${facetOpen ? ' open' : ''}`}>{facetPanel}</div>

      <div className="tp-catalog-main">
        {pickMode && <div className="prod-pick-scrim" aria-hidden />}
        <div className="tp-catalog-inner">
          {(activeChips.length > 0 || hasFilters) && (
            <div className="tp-active-chips">
              {activeChips.map((chip) => (
                <button key={chip.key} type="button" className="tp-chip" onClick={chip.clear}>
                  {chip.label} <span aria-hidden>×</span>
                </button>
              ))}
              {hasFilters && (
                <button type="button" className="tp-chip-clear" onClick={clearFilters}>
                  Clear all
                </button>
              )}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="tp-empty-state">No products match. Adjust filters or clear them.</div>
          ) : (
            <>
              <div className="tp-grid">
                {pagination.paginatedItems.map((p) => (
                  <ProductCard
                    key={p.code}
                    product={p}
                    pickMode={pickMode}
                    onOpenDetail={onOpenDetail}
                    onPick={onPickProduct}
                  />
                ))}
              </div>
              <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DestFilterCombobox({
  destFilter,
  destList,
  destCounts,
  destTotal,
  onDestFilterChange,
}: {
  destFilter: string;
  destList: string[];
  destCounts: Record<string, number>;
  destTotal: number;
  onDestFilterChange: (v: string) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(destFilter);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return destList;
    return destList.filter((d) => d.toLowerCase().includes(q));
  }, [destList, query]);

  const pick = (value: string) => {
    onDestFilterChange(value);
    setQuery(value);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      setQuery(destFilter);
      return;
    }
    if (!open) return;

    const options = ['', ...suggestions];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      pick(options[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="tp-dest-combo" ref={rootRef}>
      <input
        type="search"
        className="tp-dest-combo-input"
        value={open ? query : destFilter}
        placeholder="Search destinations…"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        role="combobox"
        onFocus={() => {
          setOpen(true);
          setQuery(destFilter);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
          if (!e.target.value.trim()) onDestFilterChange('');
        }}
        onKeyDown={onKeyDown}
      />
      {destFilter && (
        <button
          type="button"
          className="tp-dest-combo-clear"
          aria-label="Clear destination"
          onClick={() => {
            onDestFilterChange('');
            setQuery('');
          }}
        >
          ×
        </button>
      )}
      {open && (
        <ul id={listId} className="tp-dest-combo-list" role="listbox">
          <li role="option" aria-selected={destFilter === ''}>
            <button
              type="button"
              className={`tp-facet-item${destFilter === '' ? ' on' : ''}${activeIndex === 0 ? ' tp-dest-combo-active' : ''}`}
              onMouseEnter={() => setActiveIndex(0)}
              onClick={() => pick('')}
            >
              <span>All destinations</span>
              <span className="tp-facet-count">{destTotal}</span>
            </button>
          </li>
          {suggestions.map((dest, i) => (
            <li key={dest} role="option" aria-selected={destFilter === dest}>
              <button
                type="button"
                className={`tp-facet-item${destFilter === dest ? ' on' : ''}${activeIndex === i + 1 ? ' tp-dest-combo-active' : ''}`}
                onMouseEnter={() => setActiveIndex(i + 1)}
                onClick={() => pick(dest)}
              >
                <span className="tp-facet-item-label">{dest}</span>
                <span className="tp-facet-count">{destCounts[dest]}</span>
              </button>
            </li>
          ))}
          {suggestions.length === 0 && (
            <li className="tp-dest-combo-empty">No destinations match</li>
          )}
        </ul>
      )}
    </div>
  );
}

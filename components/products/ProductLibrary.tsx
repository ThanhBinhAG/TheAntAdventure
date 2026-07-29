'use client';

import { useEffect, useMemo, useState } from 'react';
import ProductCard from '@/components/products/ProductCard';
import { deriveCategoriesFromProducts } from '@/lib/products/product-form';
import {
  matchesPricingStatusFilter,
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
        <button
          type="button"
          className={`tp-facet-item${destFilter === '' ? ' on' : ''}`}
          onClick={() => onDestFilterChange('')}
        >
          <span>All destinations</span>
          <span className="tp-facet-count">{destTotal}</span>
        </button>
        <div className="tp-facet-list">
          {destList.map((dest) => (
            <button
              key={dest}
              type="button"
              className={`tp-facet-item${destFilter === dest ? ' on' : ''}`}
              onClick={() => onDestFilterChange(destFilter === dest ? '' : dest)}
            >
              <span className="tp-facet-item-label">{dest}</span>
              <span className="tp-facet-count">{destCounts[dest]}</span>
            </button>
          ))}
        </div>
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
            <div className="tp-grid">
              {filtered.map((p) => (
                <ProductCard
                  key={p.code}
                  product={p}
                  pickMode={pickMode}
                  onOpenDetail={onOpenDetail}
                  onPick={onPickProduct}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

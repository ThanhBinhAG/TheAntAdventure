'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import ProductCard from '@/components/products/ProductCard';
import { deriveCategoriesFromProducts } from '@/lib/product-form';
import type { Product } from '@/lib/types';

const DURATION_OPTIONS = [
  '',
  'Half Day',
  'Full Day',
  'Evening (2–3 hours)',
  'Evening (3–4 hours)',
  '2 Days 1 Night',
  '3 Days 2 Nights',
  '4 Days 3 Nights',
  'Service',
];

interface ProductLibraryProps {
  products: Product[];
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
  pickMode?: boolean;
  expandedCode: string | null;
  onToggleExpand: (code: string) => void;
  onPickProduct?: (p: Product) => void;
}

export default function ProductLibrary({
  products,
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
  pickMode = false,
  expandedCode,
  onToggleExpand,
  onPickProduct,
}: ProductLibraryProps) {
  const categories = useMemo(() => deriveCategoriesFromProducts(products), [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.toLowerCase();
      if (region && p.region !== region) return false;
      if (duration && p.dur !== duration) return false;
      if (category && !p.cat.toLowerCase().includes(category.toLowerCase())) return false;
      if (destFilter && !p.dest.toLowerCase().includes(destFilter.toLowerCase())) return false;
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
  }, [products, search, region, duration, category, destFilter]);

  const byDest = useMemo(() => {
    const map: Record<string, Product[]> = {};
    filtered.forEach((p) => {
      const key = p.dest || 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [filtered]);

  const destCount = Object.keys(byDest).length;
  const hasFilters = !!(search || region || duration || category || destFilter);

  const clearFilters = () => {
    onSearchChange('');
    onRegionChange('');
    onDurationChange('');
    onCategoryChange('');
    onDestFilterChange('');
  };

  return (
    <div className="prod-page">
      <div className={`prod-search-bar${pickMode ? ' prod-search-bar--active' : ''}`}>
        <div className="prod-page-hd">
          <div>
            <h2 className="prod-page-title">Product Library</h2>
            <p className="prod-page-sub">Browse and filter tour products by destination, region, and category.</p>
          </div>
          <div className="prod-stat-chips">
            <span className="prod-stat-chip">
              <strong>{filtered.length}</strong> shown
            </span>
            <span className="prod-stat-chip">
              <strong>{destCount}</strong> destinations
            </span>
            <span className="prod-stat-chip muted">
              <strong>{products.length}</strong> total
            </span>
          </div>
        </div>

        <div className="prod-filter-grid">
          <div className="fg prod-search-field">
            <label className="lbl">
              {pickMode ? 'Find product to edit' : 'Search products'}
            </label>
            <input
              placeholder="Name, code, destination… e.g. Halong, AA-NV-HAN"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <div className="fg">
            <label className="lbl">Region</label>
            <select value={region} onChange={(e) => onRegionChange(e.target.value)} aria-label="Region">
              <option value="">All Regions</option>
              <option value="north">Northern</option>
              <option value="central">Central</option>
              <option value="south">Southern</option>
              <option value="services">Services</option>
            </select>
          </div>
          <div className="fg">
            <label className="lbl">Duration</label>
            <select value={duration} onChange={(e) => onDurationChange(e.target.value)} aria-label="Duration">
              <option value="">All Durations</option>
              {DURATION_OPTIONS.filter(Boolean).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label className="lbl">Category</label>
            <select value={category} onChange={(e) => onCategoryChange(e.target.value)} aria-label="Category">
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label className="lbl">Destination</label>
            <input
              className="prod-dest-filter"
              placeholder="Filter destination…"
              value={destFilter}
              onChange={(e) => onDestFilterChange(e.target.value)}
              aria-label="Destination filter"
            />
          </div>
        </div>

        {hasFilters && (
          <div className="prod-filter-active">
            <span>Filters active</span>
            <button type="button" className="prod-filter-clear" onClick={clearFilters}>
              Clear all
            </button>
          </div>
        )}

        {pickMode && hasFilters && (
          <div className="prod-search-context">
            Showing <b>{filtered.length}</b> result{filtered.length !== 1 ? 's' : ''}
            {search && (
              <>
                {' '}
                for &ldquo;<b>{search}</b>&rdquo;
              </>
            )}
            — click a card below to edit
          </div>
        )}
      </div>

      {!pickMode && (
        <div className="prod-quick-links">
          <span>🏛 <b>Planning a site visit?</b></span>
          <Link href="/attractions" className="btn btn-s btn-sm">
            → Museum Hours & Closures
          </Link>
          <span>⭐ <b>Tour done?</b></span>
          <Link href="/posttour" className="btn btn-s btn-sm">
            → Post-Tour Feedback
          </Link>
        </div>
      )}

      <div className={`prod-list-panel${pickMode ? ' prod-pick-mode' : ''}`}>
        {pickMode && <div className="prod-pick-scrim" aria-hidden />}
        <div className="prod-list-inner">
          {filtered.length === 0 ? (
            <div className="prod-empty-state">No products match your search. Try different keywords or clear filters.</div>
          ) : (
            Object.keys(byDest)
              .sort()
              .map((dest) => (
                <div key={dest} className="prod-dest-group">
                  <div className="prod-dest-hd">
                    <span className="prod-dest-name">📍 {dest}</span>
                    <span className="prod-dest-count">
                      {byDest[dest].length} product{byDest[dest].length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="prod-grid">
                    {byDest[dest].map((p) => (
                      <ProductCard
                        key={p.code}
                        product={p}
                        pickMode={pickMode}
                        expanded={expandedCode === p.code}
                        onToggleExpand={onToggleExpand}
                        onPick={onPickProduct}
                      />
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

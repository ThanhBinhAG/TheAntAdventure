'use client';

import Link from 'next/link';
import DestFilterCombobox from '@/components/products/DestFilterCombobox';
import { REG_COLORS_HEX } from '@/lib/core/page-helpers';
import {
  PRODUCT_DURATION_OPTIONS,
  PRODUCT_PRICING_OPTIONS,
  PRODUCT_REGIONS,
} from '@/lib/products/product-filter-constants';
import type { PricingStatus, PricingStatusFilter } from '@/lib/products/product-pricing-helpers';

interface ProductFilterBarProps {
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
  destList: string[];
  destCounts: Record<string, number>;
  destTotal: number;
  categories: readonly string[];
  pricingPulse: { complete: number; incomplete: number; missing: number; total: number };
  filteredCount: number;
  hasFilters: boolean;
  onClearFilters: () => void;
  mobileOpen?: boolean;
  onMobileToggle?: () => void;
}

export default function ProductFilterBar({
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
  destList,
  destCounts,
  destTotal,
  categories,
  pricingPulse,
  filteredCount,
  hasFilters,
  onClearFilters,
  mobileOpen = true,
  onMobileToggle,
}: ProductFilterBarProps) {
  const activeFilterCount = [
    region,
    duration,
    category,
    destFilter,
    pricingStatus,
  ].filter(Boolean).length;

  return (
    <div className="tp-filter-bar">
      {onMobileToggle && (
        <button type="button" className="tp-filter-bar-toggle" onClick={onMobileToggle}>
          {mobileOpen ? 'Hide filters' : `Filters${activeFilterCount ? ` (${activeFilterCount})` : ''}`}
        </button>
      )}

      <div className={`tp-filter-bar-body${mobileOpen ? ' open' : ''}`}>
        <div className="tp-filter-bar-row tp-filter-bar-row--region">
          <span className="tp-filter-bar-label">Region</span>
          <div className="tp-filter-region-seg" role="group" aria-label="Filter by region">
            <button
              type="button"
              className={`tp-filter-region-btn${region === '' ? ' on' : ''}`}
              onClick={() => onRegionChange('')}
            >
              All
            </button>
            {PRODUCT_REGIONS.map((r) => {
              const [bg, fg] = REG_COLORS_HEX[r.value] || ['#f5f5f5', '#333'];
              const isOn = region === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  className={`tp-filter-region-btn${isOn ? ' on' : ''}`}
                  style={isOn ? { background: bg, color: fg, borderColor: fg } : undefined}
                  onClick={() => onRegionChange(region === r.value ? '' : r.value)}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="tp-filter-bar-row tp-filter-bar-row--controls">
          <div className="tp-filter-bar-field tp-filter-bar-field--dest">
            <span className="tp-filter-bar-label">Destination</span>
            <DestFilterCombobox
              destFilter={destFilter}
              destList={destList}
              destCounts={destCounts}
              destTotal={destTotal}
              onDestFilterChange={onDestFilterChange}
              compact
            />
          </div>

          <div className="tp-filter-bar-field">
            <label className="tp-filter-bar-label" htmlFor="tp-filter-duration">
              Duration
            </label>
            <select
              id="tp-filter-duration"
              className="tp-filter-select"
              value={duration}
              onChange={(e) => onDurationChange(e.target.value)}
            >
              <option value="">All durations</option>
              {PRODUCT_DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="tp-filter-bar-field">
            <label className="tp-filter-bar-label" htmlFor="tp-filter-category">
              Category
            </label>
            <select
              id="tp-filter-category"
              className="tp-filter-select"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="tp-filter-bar-field">
            <label className="tp-filter-bar-label" htmlFor="tp-filter-pricing">
              Pricing
            </label>
            <select
              id="tp-filter-pricing"
              className="tp-filter-select"
              value={pricingStatus}
              onChange={(e) => onPricingStatusChange(e.target.value as PricingStatusFilter)}
            >
              {PRODUCT_PRICING_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tp-filter-bar-row tp-filter-bar-row--pulse">
          <div className="tp-filter-pulse">
            <div className="tp-filter-pulse-hd">
              <span className="tp-filter-bar-label">Pricing health</span>
              <Link href="/pricing-essentials" className="tp-filter-pulse-link">
                Open Pricing
              </Link>
            </div>
            <div className="tp-filter-pulse-inner">
              <div className="tp-facet-pulse-bars tp-filter-pulse-bars" aria-hidden={pricingPulse.total === 0}>
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
              <div className="tp-filter-pulse-stats">
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
                    className={`tp-filter-pulse-stat${pricingStatus === key ? ' on' : ''}`}
                    onClick={() => onPricingStatusChange(pricingStatus === key ? '' : (key as PricingStatus))}
                    title={`Show ${label.toLowerCase()} pricing`}
                  >
                    <strong>{count}</strong>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="tp-filter-bar-foot">
            <span className="tp-filter-bar-stat">
              {filteredCount} match{filteredCount === 1 ? '' : 'es'}
            </span>
            {hasFilters ? (
              <button type="button" className="tp-filter-bar-clear" onClick={onClearFilters}>
                Clear filters
              </button>
            ) : (
              <span className="tp-filter-bar-hint">Tap a status to filter</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

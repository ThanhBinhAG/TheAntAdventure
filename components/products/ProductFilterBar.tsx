'use client';

import Link from 'next/link';
import DestFilterCombobox from '@/components/products/DestFilterCombobox';
import { REG_COLORS_HEX } from '@/lib/core/page-helpers';
import {
  PRODUCT_DURATION_OPTIONS,
  PRODUCT_REGIONS,
} from '@/lib/products/product-filter-constants';
import type { PricingStatus, PricingStatusFilter } from '@/lib/products/product-pricing-helpers';
import { useLanguage } from '@/hooks/useLanguage';

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

const PRICING_FILTER_VALUES: PricingStatusFilter[] = ['', 'complete', 'incomplete', 'missing'];

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
  const { tp, tpl } = useLanguage();

  const pricingFilterLabel = (value: PricingStatusFilter) => {
    if (value === '') return tp('products', 'pricingAll');
    if (value === 'complete') return tp('products', 'pricingFull');
    if (value === 'incomplete') return tp('products', 'pricingPartialFilter');
    if (value === 'missing') return tp('products', 'pricingNone');
    return value;
  };

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
          {mobileOpen
            ? tp('products', 'hideFilters')
            : activeFilterCount
              ? tpl('products', 'showFiltersWithCount', { count: activeFilterCount })
              : tp('products', 'showFilters')}
        </button>
      )}

      <div className={`tp-filter-bar-body${mobileOpen ? ' open' : ''}`}>
        <div className="tp-filter-bar-row tp-filter-bar-row--region">
          <span className="tp-filter-bar-label">{tp('products', 'labelRegion')}</span>
          <div className="tp-filter-region-seg" role="group" aria-label={tp('products', 'filterByRegionAria')}>
            <button
              type="button"
              className={`tp-filter-region-btn${region === '' ? ' on' : ''}`}
              onClick={() => onRegionChange('')}
            >
              {tp('products', 'regionAll')}
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
            <span className="tp-filter-bar-label">{tp('products', 'labelDestinationFilter')}</span>
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
              {tp('products', 'labelDuration')}
            </label>
            <select
              id="tp-filter-duration"
              className="tp-filter-select"
              value={duration}
              onChange={(e) => onDurationChange(e.target.value)}
            >
              <option value="">{tp('products', 'allDurations')}</option>
              {PRODUCT_DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="tp-filter-bar-field">
            <label className="tp-filter-bar-label" htmlFor="tp-filter-category">
              {tp('products', 'labelCategoryTag')}
            </label>
            <select
              id="tp-filter-category"
              className="tp-filter-select"
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              <option value="">{tp('products', 'allCategories')}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="tp-filter-bar-field">
            <label className="tp-filter-bar-label" htmlFor="tp-filter-pricing">
              {tp('products', 'labelPricing')}
            </label>
            <select
              id="tp-filter-pricing"
              className="tp-filter-select"
              value={pricingStatus}
              onChange={(e) => onPricingStatusChange(e.target.value as PricingStatusFilter)}
            >
              {PRICING_FILTER_VALUES.map((value) => (
                <option key={value || 'all'} value={value}>
                  {pricingFilterLabel(value)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tp-filter-bar-row tp-filter-bar-row--pulse">
          <div className="tp-filter-pulse">
            <div className="tp-filter-pulse-hd">
              <span className="tp-filter-bar-label">{tp('products', 'pricingHealth')}</span>
              <Link href="/pricing-essentials" className="tp-filter-pulse-link">
                {tp('products', 'openPricing')}
              </Link>
            </div>
            <div className="tp-filter-pulse-inner">
              <div className="tp-facet-pulse-bars tp-filter-pulse-bars" aria-hidden={pricingPulse.total === 0}>
                {pricingPulse.complete > 0 && (
                  <span
                    className="tp-facet-pulse-seg tp-facet-pulse-seg--ok"
                    style={{ flexGrow: pricingPulse.complete }}
                    title={tpl('products', 'pulseFullTitle', { count: pricingPulse.complete })}
                  />
                )}
                {pricingPulse.incomplete > 0 && (
                  <span
                    className="tp-facet-pulse-seg tp-facet-pulse-seg--partial"
                    style={{ flexGrow: pricingPulse.incomplete }}
                    title={tpl('products', 'pulsePartialTitle', { count: pricingPulse.incomplete })}
                  />
                )}
                {pricingPulse.missing > 0 && (
                  <span
                    className="tp-facet-pulse-seg tp-facet-pulse-seg--miss"
                    style={{ flexGrow: pricingPulse.missing }}
                    title={tpl('products', 'pulseMissingTitle', { count: pricingPulse.missing })}
                  />
                )}
              </div>
              <div className="tp-filter-pulse-stats">
                {(
                  [
                    ['complete', tp('products', 'pulseFull'), pricingPulse.complete],
                    ['incomplete', tp('products', 'pulsePartial'), pricingPulse.incomplete],
                    ['missing', tp('products', 'pulseNoPrice'), pricingPulse.missing],
                  ] as const
                ).map(([key, label, count]) => (
                  <button
                    key={key}
                    type="button"
                    className={`tp-filter-pulse-stat${pricingStatus === key ? ' on' : ''}`}
                    onClick={() => onPricingStatusChange(pricingStatus === key ? '' : (key as PricingStatus))}
                    title={tpl('products', 'pulseFilterTitle', { label: label.toLowerCase() })}
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
              {filteredCount === 1
                ? tpl('products', 'matchCount', { count: filteredCount })
                : tpl('products', 'matchCountPlural', { count: filteredCount })}
            </span>
            {hasFilters ? (
              <button type="button" className="tp-filter-bar-clear" onClick={onClearFilters}>
                {tp('products', 'clearFilters')}
              </button>
            ) : (
              <span className="tp-filter-bar-hint">{tp('products', 'tapStatusHint')}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

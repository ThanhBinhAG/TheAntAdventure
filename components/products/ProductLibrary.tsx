'use client';

import { useEffect, useState } from 'react';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import ProductCard from '@/components/products/ProductCard';
import ProductFilterBar from '@/components/products/ProductFilterBar';
import { usePageSize } from '@/hooks/usePageSize';
import { useProductPage } from '@/hooks/useProductPage';
import type { ProductPageSize } from '@/lib/products/product-list-input';
import { PRODUCT_CATEGORIES } from '@/lib/products/product-form';
import {
  PRODUCT_REGIONS,
} from '@/lib/products/product-filter-constants';
import type { PricingStatusFilter } from '@/lib/products/product-pricing-helpers';
import type { Product } from '@/lib/types';
import { useLanguage } from '@/hooks/useLanguage';

interface ProductLibraryProps {
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
  const { tp, tc } = useLanguage();
  const [filterBarOpen, setFilterBarOpen] = useState(false);
  const { pageSize, setPageSize } = usePageSize();
  const [page, setPage] = useState(1);
  const {
    data: productPage,
    error: productPageError,
    isLoading: isProductPageLoading,
    retry: retryProductPage,
  } = useProductPage({
    page,
    pageSize: pageSize as ProductPageSize,
    view: 'catalog',
    q: search || undefined,
    region: region || undefined,
    duration: duration || undefined,
    category: category || undefined,
    destination: destFilter || undefined,
    pricingStatus: pricingStatus || undefined,
  });

  const items = productPage?.items ?? [];
  const total = productPage?.totalCount ?? 0;
  const currentPage = productPage?.page ?? page;
  const totalPages = productPage?.totalPages ?? 1;
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, total);
  const categories = productPage?.facets?.categories ?? PRODUCT_CATEGORIES;
  const destCounts = productPage?.facets?.destinations ?? {};
  const destList = Object.keys(destCounts).sort((a, b) => a.localeCompare(b));
  const destTotal = Object.values(destCounts).reduce((n, count) => n + count, 0);
  const pricingCounts = productPage?.facets?.pricingPulse ?? { complete: 0, incomplete: 0, missing: 0 };
  const pricingPulse = { ...pricingCounts, total: pricingCounts.complete + pricingCounts.incomplete + pricingCounts.missing };

  useEffect(() => {
    onShownCountChange?.(total);
  }, [total, onShownCountChange]);

  const hasFilters = !!(search || region || duration || category || destFilter || pricingStatus);

  const clearFilters = () => {
    onSearchChange('');
    onRegionChange('');
    onDurationChange('');
    onCategoryChange('');
    onDestFilterChange('');
    onPricingStatusChange('');
  };

  const pricingFilterLabel = (value: PricingStatusFilter) => {
    if (value === 'complete') return tp('products', 'pricingFull');
    if (value === 'incomplete') return tp('products', 'pricingPartialFilter');
    if (value === 'missing') return tp('products', 'pricingNone');
    return value;
  };

  const activeChips: { key: string; label: string; clear: () => void }[] = [];
  if (destFilter) activeChips.push({ key: 'dest', label: destFilter, clear: () => onDestFilterChange('') });
  if (region) {
    const label = PRODUCT_REGIONS.find((r) => r.value === region)?.label || region;
    activeChips.push({ key: 'region', label, clear: () => onRegionChange('') });
  }
  if (duration) activeChips.push({ key: 'dur', label: duration, clear: () => onDurationChange('') });
  if (category) activeChips.push({ key: 'cat', label: category, clear: () => onCategoryChange('') });
  if (pricingStatus) {
    activeChips.push({ key: 'price', label: pricingFilterLabel(pricingStatus), clear: () => onPricingStatusChange('') });
  }
  if (search) activeChips.push({ key: 'q', label: `“${search}”`, clear: () => onSearchChange('') });

  return (
    <div className={`tp-catalog${pickMode ? ' prod-pick-mode' : ''}`}>
      <ProductFilterBar
        region={region}
        onRegionChange={onRegionChange}
        duration={duration}
        onDurationChange={onDurationChange}
        category={category}
        onCategoryChange={onCategoryChange}
        destFilter={destFilter}
        onDestFilterChange={onDestFilterChange}
        pricingStatus={pricingStatus}
        onPricingStatusChange={onPricingStatusChange}
        destList={destList}
        destCounts={destCounts}
        destTotal={destTotal}
        categories={categories}
        pricingPulse={pricingPulse}
        filteredCount={total}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
        mobileOpen={filterBarOpen}
        onMobileToggle={() => setFilterBarOpen((o) => !o)}
      />

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
                  {tp('products', 'clearAll')}
                </button>
              )}
            </div>
          )}

          {productPageError ? (
            <div className="crm-empty-state crm-empty-state--flush">
              <p>{tp('products', 'errorLoadList')}</p>
              <button type="button" className="btn btn-s btn-sm" onClick={retryProductPage}>
                {tc('retry')}
              </button>
            </div>
          ) : isProductPageLoading && !productPage ? (
            <div className="crm-empty-state crm-empty-state--flush">
              <p>{tp('products', 'loadingProducts')}</p>
            </div>
          ) : total === 0 ? (
            <EmptyState
              className="crm-empty-state--flush"
              size="compact"
              variant="products"
              title={tp('products', 'emptyNoMatchTitle')}
              description={tp('products', 'emptyNoMatchDesc')}
              action={
                hasFilters ? (
                  <button type="button" className="btn btn-s btn-sm" onClick={clearFilters}>
                    {tp('products', 'clearFilters')}
                  </button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="tp-grid">
                {items.map((p) => (
                  <ProductCard
                    key={p.code}
                    product={p}
                    pickMode={pickMode}
                    onOpenDetail={onOpenDetail}
                    onPick={onPickProduct}
                  />
                ))}
              </div>
              <PaginationBar
                page={currentPage}
                setPage={setPage}
                totalPages={totalPages}
                total={total}
                pageSize={pageSize}
                rangeStart={rangeStart}
                rangeEnd={rangeEnd}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

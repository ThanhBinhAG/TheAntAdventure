'use client';

import { useEffect, useMemo, useState } from 'react';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import { usePageSize } from '@/hooks/usePageSize';
import { useProductPage } from '@/hooks/useProductPage';
import type { ProductPageSize } from '@/lib/products/product-list-input';
import { REG_COLORS_HEX, REG_LABELS } from '@/lib/core/page-helpers';
import {
  DUR_LABELS,
  MODULE_DUR_KEYS,
  MODULE_REGIONS,
  groupModulesProductPage,
  getModulePriceRange,
  type ModulesGrouped,
} from '@/lib/products/product-modules';
import type { Product } from '@/lib/types';

interface ModulesViewProps {
  search: string;
  pickMode?: boolean;
  onPickProduct?: (p: Product) => void;
  onOpenDetail: (code: string) => void;
  onShownCountChange?: (n: number) => void;
}

export default function ModulesView({
  search,
  pickMode = false,
  onPickProduct,
  onOpenDetail,
  onShownCountChange,
}: ModulesViewProps) {
  const { pageSize, setPageSize } = usePageSize();
  const [page, setPage] = useState(1);
  const { data: productPage, error, isLoading, retry } = useProductPage({
    page, pageSize: pageSize as ProductPageSize, view: 'modules', q: search || undefined,
  });
  useEffect(() => { setPage(1); }, [search, pageSize]);
  const items = productPage?.items ?? [];
  const total = productPage?.totalCount ?? 0;
  const currentPage = productPage?.page ?? page;
  const totalPages = productPage?.totalPages ?? 1;
  const pageGrouped = useMemo(
    () => groupModulesProductPage(items), [items]
  );

  useEffect(() => {
    onShownCountChange?.(total);
  }, [total, onShownCountChange]);

  return (
    <div className={`tp-modules${pickMode ? ' prod-pick-mode' : ''}`}>
      {pickMode && <div className="prod-pick-scrim" aria-hidden />}
      <div className="tp-modules-inner">
        {error ? <button type="button" className="btn btn-s btn-sm" onClick={retry}>Thử lại</button> : isLoading && !productPage ? <p>Đang tải products…</p> : total === 0 ? (
          <EmptyState
            className="crm-empty-state--flush"
            size="compact"
            variant="products"
            title="No products match your search"
            description="Try a different keyword, or clear the search to browse by region."
          />
        ) : (
          <>
            <div className="tp-mod-regions">
              {MODULE_REGIONS.map((reg) => (
                <RegionBlock
                  key={reg}
                  region={reg}
                  grouped={pageGrouped}
                  pickMode={pickMode}
                  onPickProduct={onPickProduct}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>
            <PaginationBar page={currentPage} setPage={setPage} totalPages={totalPages} total={total} pageSize={pageSize} rangeStart={total === 0 ? 0 : (currentPage - 1) * pageSize + 1} rangeEnd={Math.min(currentPage * pageSize, total)} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />
          </>
        )}
      </div>
    </div>
  );
}

function RegionBlock({
  region,
  grouped,
  pickMode,
  onPickProduct,
  onOpenDetail,
}: {
  region: (typeof MODULE_REGIONS)[number];
  grouped: ModulesGrouped;
  pickMode?: boolean;
  onPickProduct?: (p: Product) => void;
  onOpenDetail: (code: string) => void;
}) {
  const durs = grouped[region];
  if (!durs) return null;

  const hasAny = MODULE_DUR_KEYS.some((dk) => (durs[dk]?.length ?? 0) > 0);
  if (!hasAny) return null;

  const [rbg, rfg] = REG_COLORS_HEX[region] || ['#f5f5f5', '#333'];
  const count = MODULE_DUR_KEYS.reduce((n, dk) => n + (durs[dk]?.length ?? 0), 0);

  return (
    <section className="tp-mod-region">
      <header className="tp-mod-region-hd" style={{ background: rbg, color: rfg, borderColor: rbg }}>
        <span>{REG_LABELS[region] || region}</span>
        <span className="tp-mod-region-count">{count}</span>
      </header>
      <div className="tp-mod-region-body" style={{ borderColor: rbg }}>
        {MODULE_DUR_KEYS.map((dk) => {
          const prods = durs[dk];
          if (!prods?.length) return null;
          return (
            <div key={dk} className="tp-mod-dur-band">
              <div className="tp-mod-dur-hd" style={{ background: `${rbg}44`, color: rfg }}>
                {DUR_LABELS[dk]}
                <span className="tp-mod-dur-count">{prods.length}</span>
              </div>
              {prods.map((p) => (
                <ModuleRow
                  key={p.code}
                  product={p}
                  price={getModulePriceRange(p.code, p.price)}
                  pickMode={pickMode}
                  onPick={onPickProduct}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ModuleRow({
  product: p,
  price,
  pickMode,
  onPick,
  onOpenDetail,
}: {
  product: Product;
  price: string;
  pickMode?: boolean;
  onPick?: (p: Product) => void;
  onOpenDetail: (code: string) => void;
}) {
  const handleRowClick = () => {
    if (pickMode && onPick) onPick(p);
  };

  const handleNameClick = () => {
    if (pickMode && onPick) {
      onPick(p);
      return;
    }
    onOpenDetail(p.code);
  };

  return (
    <div
      className={`tp-mod-row${pickMode ? ' tp-mod-row--pickable' : ''}`}
      onClick={pickMode ? handleRowClick : undefined}
      role={pickMode ? 'button' : undefined}
      tabIndex={pickMode ? 0 : undefined}
    >
      <div className="tp-mod-row-main">
        <div className="tp-mod-row-left">
          <button type="button" className="tp-mod-row-name" onClick={handleNameClick}>
            {p.name}
          </button>
          <div className="tp-mod-row-tags">
            {p.dest && <span className="tp-mod-row-dest">{p.dest}</span>}
            {p.cat && <span className="prod-tag-pill prod-tag-cat">{p.cat}</span>}
            {p.lvl && <span className="prod-tag-pill prod-tag-lvl">{p.lvl}</span>}
          </div>
        </div>
        <span className="tp-mod-row-price">{price}</span>
      </div>
    </div>
  );
}

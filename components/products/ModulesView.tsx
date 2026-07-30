'use client';

import { useEffect, useMemo } from 'react';
import PaginationBar from '@/components/PaginationBar';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { isSelectableProduct } from '@/lib/products/product-display';
import { REG_COLORS_HEX, REG_LABELS } from '@/lib/core/page-helpers';
import {
  DUR_LABELS,
  MODULE_DUR_KEYS,
  MODULE_REGIONS,
  flattenModulesProducts,
  groupModulesProductPage,
  groupProductsForModules,
  getModulePriceRange,
  type ModulesGrouped,
} from '@/lib/products/product-modules';
import type { Product } from '@/lib/types';

interface ModulesViewProps {
  products: Product[];
  search: string;
  pickMode?: boolean;
  onPickProduct?: (p: Product) => void;
  onOpenDetail: (code: string) => void;
  onShownCountChange?: (n: number) => void;
}

export default function ModulesView({
  products,
  search,
  pickMode = false,
  onPickProduct,
  onOpenDetail,
  onShownCountChange,
}: ModulesViewProps) {
  const { pageSize, setPageSize } = usePageSize();
  const activeProducts = useMemo(() => products.filter(isSelectableProduct), [products]);
  const groupedAll = useMemo(() => groupProductsForModules(activeProducts, search), [activeProducts, search]);
  const flatList = useMemo(() => flattenModulesProducts(groupedAll), [groupedAll]);
  const pagination = usePagination(flatList, pageSize, [search, pageSize]);
  const pageGrouped = useMemo(
    () => groupModulesProductPage(pagination.paginatedItems),
    [pagination.paginatedItems]
  );

  useEffect(() => {
    onShownCountChange?.(flatList.length);
  }, [flatList.length, onShownCountChange]);

  return (
    <div className={`tp-modules${pickMode ? ' prod-pick-mode' : ''}`}>
      {pickMode && <div className="prod-pick-scrim" aria-hidden />}
      <div className="tp-modules-inner">
        {flatList.length === 0 ? (
          <div className="tp-empty-state">No products match your search.</div>
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
            <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
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

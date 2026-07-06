'use client';

import { useMemo, type MouseEvent } from 'react';
import { isSelectableProduct } from '@/lib/product-display';
import { REG_COLORS_HEX, REG_LABELS } from '@/lib/page-helpers';
import {
  DUR_LABELS,
  MODULE_DUR_KEYS,
  MODULE_REGIONS,
  countModulesProducts,
  getModulePriceRange,
  groupProductsForModules,
  type ModulesGrouped,
} from '@/lib/product-modules';
import type { Product } from '@/lib/types';

interface ModulesViewProps {
  products: Product[];
  search: string;
  onSearchChange: (q: string) => void;
  pickMode?: boolean;
  onPickProduct?: (p: Product) => void;
  expandedCode: string | null;
  onToggleExpand: (code: string) => void;
}

export default function ModulesView({
  products,
  search,
  onSearchChange,
  pickMode = false,
  onPickProduct,
  expandedCode,
  onToggleExpand,
}: ModulesViewProps) {
  const activeProducts = useMemo(() => products.filter(isSelectableProduct), [products]);
  const grouped = groupProductsForModules(activeProducts, search);
  const total = countModulesProducts(grouped);
  const regionCount = MODULE_REGIONS.filter((r) =>
    MODULE_DUR_KEYS.some((dk) => (grouped[r][dk]?.length ?? 0) > 0)
  ).length;

  return (
    <div className="prod-page prod-page--modules">
      <div className={`prod-search-bar${pickMode ? ' prod-search-bar--active' : ''}`}>
        <div className="prod-page-hd">
          <div>
            <h2 className="prod-page-title">Modules View</h2>
            <p className="prod-page-sub">All active products grouped by region and duration with pricing.</p>
          </div>
          <div className="prod-stat-chips">
            <span className="prod-stat-chip">
              <strong>{total}</strong> products
            </span>
            <span className="prod-stat-chip">
              <strong>{regionCount}</strong> regions
            </span>
          </div>
        </div>

        <div className="prod-filter-grid prod-filter-grid--modules">
          <div className="fg prod-search-field">
            <label className="lbl">{pickMode ? 'Find product to edit' : 'Search modules'}</label>
            <input
              placeholder="Name, code, description… e.g. street food, AA-NV-HAN"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {pickMode && search.trim() && (
          <div className="prod-search-context">
            Showing <b>{total}</b> result{total !== 1 ? 's' : ''} for &ldquo;<b>{search}</b>&rdquo; — click a row to edit
          </div>
        )}
      </div>

      <div className={`prod-list-panel mod-list-panel${pickMode ? ' prod-pick-mode' : ''}`}>
        {pickMode && <div className="prod-pick-scrim" aria-hidden />}
        <div className="prod-list-inner">
          <div className="card mod-card">
            <div className="card-hd mod-card-hd">
              <span className="card-title">By Region & Duration</span>
              <span className="mod-card-meta">{total} experiences</span>
            </div>
            <div className="card-body mod-card-body">
              {total === 0 ? (
                <div className="prod-empty-state">No products match your search.</div>
              ) : (
                <div className="mod-regions-grid">
                  {MODULE_REGIONS.map((reg) => (
                    <RegionBlock
                      key={reg}
                      region={reg}
                      grouped={grouped}
                      pickMode={pickMode}
                      onPickProduct={onPickProduct}
                      expandedCode={expandedCode}
                      onToggleExpand={onToggleExpand}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegionBlock({
  region,
  grouped,
  pickMode,
  onPickProduct,
  expandedCode,
  onToggleExpand,
}: {
  region: (typeof MODULE_REGIONS)[number];
  grouped: ModulesGrouped;
  pickMode?: boolean;
  onPickProduct?: (p: Product) => void;
  expandedCode: string | null;
  onToggleExpand: (code: string) => void;
}) {
  const durs = grouped[region];
  if (!durs) return null;

  const hasAny = MODULE_DUR_KEYS.some((dk) => (durs[dk]?.length ?? 0) > 0);
  if (!hasAny) return null;

  const [rbg, rfg] = REG_COLORS_HEX[region] || ['#f5f5f5', '#333'];
  const count = MODULE_DUR_KEYS.reduce((n, dk) => n + (durs[dk]?.length ?? 0), 0);

  return (
    <div className="mod-region-block">
      <div className="mod-region-hd" style={{ background: rbg, color: rfg, borderColor: rbg }}>
        <span>{REG_LABELS[region] || region}</span>
        <span className="mod-region-count">{count}</span>
      </div>
      <div className="mod-region-body" style={{ borderColor: rbg }}>
        {MODULE_DUR_KEYS.map((dk) => {
          const prods = durs[dk];
          if (!prods?.length) return null;
          return (
            <div key={dk} className="mod-dur-band">
              <div className="mod-dur-hd" style={{ background: `${rbg}44`, color: rfg }}>
                {DUR_LABELS[dk]}
                <span className="mod-dur-count">{prods.length}</span>
              </div>
              {prods.map((p) => (
                <ModuleRow
                  key={p.code}
                  product={p}
                  price={getModulePriceRange(p.code, p.price)}
                  pickMode={pickMode}
                  expanded={expandedCode === p.code}
                  onPick={onPickProduct}
                  onToggleExpand={onToggleExpand}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModuleRow({
  product: p,
  price,
  pickMode,
  expanded,
  onPick,
  onToggleExpand,
}: {
  product: Product;
  price: string;
  pickMode?: boolean;
  expanded: boolean;
  onPick?: (p: Product) => void;
  onToggleExpand: (code: string) => void;
}) {
  const handleRowClick = () => {
    if (pickMode && onPick) onPick(p);
  };

  const handleNameClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (pickMode && onPick) {
      onPick(p);
      return;
    }
    onToggleExpand(p.code);
  };

  return (
    <div
      className={`mod-prod-row${pickMode ? ' mod-pickable' : ''}${expanded ? ' expanded' : ''}`}
      onClick={pickMode ? handleRowClick : undefined}
      role={pickMode ? 'button' : undefined}
      tabIndex={pickMode ? 0 : undefined}
    >
      <div className="mod-prod-row-main">
        <div className="mod-prod-left">
          <button type="button" className="mod-prod-name" onClick={handleNameClick}>
            {!pickMode && <span className="mod-prod-chevron">{expanded ? '▾' : '▸'}</span>}
            {p.name}
          </button>
          <div className="mod-prod-tags">
            {p.cat && <span className="prod-tag-pill prod-tag-cat">{p.cat}</span>}
            {p.lvl && <span className="prod-tag-pill prod-tag-lvl">{p.lvl}</span>}
          </div>
        </div>
        <span className="mod-prod-price">{price}</span>
      </div>
      {expanded && !pickMode && (
        <div className="mod-prod-desc">
          {p.desc && <p>{p.desc}</p>}
          {p.usp && <p className="mod-prod-usp">{p.usp.replace(/\n/g, ' · ')}</p>}
          {!p.desc && !p.usp && <p className="mod-prod-empty">No description available.</p>}
        </div>
      )}
    </div>
  );
}

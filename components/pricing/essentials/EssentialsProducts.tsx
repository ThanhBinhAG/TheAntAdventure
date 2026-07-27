'use client';

import { Fragment, useMemo, useState } from 'react';
import EditableSection from '@/components/pricing/EditableSection';
import InlineEdit from '@/components/pricing/InlineEdit';
import { ESS_PAX_COLUMNS, type EssCostLine, type EssProduct } from '@/lib/pricing/catalog-types';

const PAX_COLS = Array.from({ length: ESS_PAX_COLUMNS }, (_, i) => i + 1);
const KEY_PAX_COLS = [1, 2, 7, 10, 14, 20];
const PAX_BAND_ENDS = new Set([2, 7, 14, 20]);

const KIND_LABELS: Record<EssCostLine['kind'], string> = {
  component: 'Cost component',
  hotel: 'Hotel selling',
  selling_group: 'Selling — per group',
  selling_pax: 'Selling — per pax',
  surcharge: 'Surcharge',
};

type Props = {
  products: EssProduct[];
  costLines: EssCostLine[];
  onPatchProduct: (code: string, patch: Partial<EssProduct>) => Promise<void>;
  onPatchCostLine: (id: string, patch: Partial<EssCostLine>) => Promise<void>;
};

function usd(value: number): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function vnd(value: number): string {
  return value.toLocaleString('en-US');
}

function fmtPax(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export default function EssentialsProducts({
  products,
  costLines,
  onPatchProduct,
  onPatchCostLine,
}: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))),
    [products]
  );

  const linesByProduct = useMemo(() => {
    const map = new Map<string, EssCostLine[]>();
    for (const line of costLines) {
      const bucket = map.get(line.productCode);
      if (bucket) bucket.push(line);
      else map.set(line.productCode, [line]);
    }
    for (const bucket of map.values()) bucket.sort((a, b) => a.sortOrder - b.sortOrder);
    return map;
  }, [costLines]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (!needle) return true;
      return [p.code, p.name, p.overnight, p.journeys].some((f) => f.toLowerCase().includes(needle));
    });
  }, [products, search, category]);

  const sellingFor = (code: string, kind: EssCostLine['kind'], paxIndex: number): number | null => {
    const lines = linesByProduct.get(code) ?? [];
    const line = [...lines].reverse().find((l) => l.kind === kind);
    return line?.pax[paxIndex] ?? null;
  };

  return (
    <div>
      <div className="search-row">
        <input
          type="text"
          placeholder="Search code, experience, overnight…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <span className="pcx-muted">
          {filtered.length} of {products.length} experiences
        </span>
      </div>

      <div className="card">
        <div className="card-body pcx-table-wrap">
          <table className="tbl pcx-table">
            <thead>
              <tr>
                <th className="pcx-col-chevron" />
                <th>Code</th>
                <th>Experience</th>
                <th>Category</th>
                <th className="pcx-num">Days</th>
                <th>Overnight</th>
                <th className="pcx-num">Solo / pax</th>
                <th className="pcx-num">10 pax</th>
                <th className="pcx-num">20 pax</th>
                <th className="pcx-num">Guide (VND)</th>
                <th className="pcx-num">Truck (VND)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const open = expanded === product.code;
                const lines = linesByProduct.get(product.code) ?? [];
                const solo = sellingFor(product.code, 'selling_pax', 0);
                const ten = sellingFor(product.code, 'selling_pax', 9);
                const twenty = sellingFor(product.code, 'selling_pax', 19);

                return (
                  <Fragment key={product.code}>
                    <tr
                      className={`pcx-row${open ? ' open' : ''}`}
                      onClick={() => setExpanded(open ? null : product.code)}
                    >
                      <td className="pcx-col-chevron">
                        <span className={`pcx-chevron${open ? ' open' : ''}`}>▸</span>
                      </td>
                      <td>
                        <code className="pcx-code">{product.code}</code>
                      </td>
                      <td>
                        <b>{product.name}</b>
                      </td>
                      <td className="pcx-muted">{product.category || '—'}</td>
                      <td className="pcx-num">{product.durationDays ?? '—'}</td>
                      <td className="pcx-muted">{product.overnight || '—'}</td>
                      <td className="pcx-num">{solo != null ? usd(solo) : '—'}</td>
                      <td className="pcx-num">{ten != null ? usd(ten) : '—'}</td>
                      <td className="pcx-num">{twenty != null ? usd(twenty) : '—'}</td>
                      <td className="pcx-num">{product.guideMain != null ? vnd(product.guideMain) : '—'}</td>
                      <td className="pcx-num">{product.truckPrice != null ? vnd(product.truckPrice) : '—'}</td>
                    </tr>

                    {open && (
                      <tr className="pcx-expand-row">
                        <td colSpan={11}>
                          <ProductDetail
                            product={product}
                            lines={lines}
                            onPatchProduct={onPatchProduct}
                            onPatchCostLine={onPatchCostLine}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={11} className="pcx-empty">
                    No experiences match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ProductDetail({
  product,
  lines,
  onPatchProduct,
  onPatchCostLine,
}: {
  product: EssProduct;
  lines: EssCostLine[];
  onPatchProduct: (code: string, patch: Partial<EssProduct>) => Promise<void>;
  onPatchCostLine: (id: string, patch: Partial<EssCostLine>) => Promise<void>;
}) {
  const [showAllPax, setShowAllPax] = useState(false);

  const patchPax = (line: EssCostLine, index: number, value: number | null) => {
    const pax = [...line.pax];
    pax[index] = value;
    return onPatchCostLine(line.id, { pax });
  };

  return (
    <div className="pcx-detail" onClick={(e) => e.stopPropagation()}>
      <div className="pcx-detail-grid">
        <div className="pcx-detail-top">
          <EditableSection title="Journey">
            {({ editing }) => (
              <dl className="pcx-facts">
                <div>
                  <dt>Route</dt>
                  <dd>
                    <InlineEdit
                      editing={editing}
                      value={product.journeys}
                      onSave={(v) => onPatchProduct(product.code, { journeys: String(v ?? '') })}
                      type="multiline"
                    />
                  </dd>
                </div>
                <div>
                  <dt>Overnight</dt>
                  <dd>
                    <InlineEdit
                      editing={editing}
                      value={product.overnight}
                      onSave={(v) => onPatchProduct(product.code, { overnight: String(v ?? '') })}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Duration (days)</dt>
                  <dd>
                    <InlineEdit
                      editing={editing}
                      value={product.durationDays}
                      type="number"
                      onSave={(v) => onPatchProduct(product.code, { durationDays: v as number | null })}
                    />
                  </dd>
                </div>
              </dl>
            )}
          </EditableSection>

          <EditableSection title="Provider fees (VND)">
            {({ editing }) => (
              <dl className="pcx-facts">
                <div>
                  <dt>Main guide</dt>
                  <dd>
                    <InlineEdit
                      editing={editing}
                      value={product.guideMain}
                      type="number"
                      format={vnd}
                      onSave={(v) => onPatchProduct(product.code, { guideMain: v as number | null })}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Assistant guide</dt>
                  <dd>
                    <InlineEdit
                      editing={editing}
                      value={product.guideAssistant}
                      type="number"
                      format={vnd}
                      onSave={(v) => onPatchProduct(product.code, { guideAssistant: v as number | null })}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Guide overnight</dt>
                  <dd>
                    <InlineEdit
                      editing={editing}
                      value={product.guideOvernight}
                      type="number"
                      format={vnd}
                      onSave={(v) => onPatchProduct(product.code, { guideOvernight: v as number | null })}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Truck</dt>
                  <dd>
                    <InlineEdit
                      editing={editing}
                      value={product.truckPrice}
                      type="number"
                      format={vnd}
                      onSave={(v) => onPatchProduct(product.code, { truckPrice: v as number | null })}
                    />
                  </dd>
                </div>
              </dl>
            )}
          </EditableSection>
        </div>

        <EditableSection title="Inclusions by vehicle tier" className="pcx-detail-wide">
          {({ editing }) => (
            <div className="pcx-incl-grid">
              {(
                [
                  ['1–2 pax · 7 seats', 'incl7'],
                  ['3–7 pax · 16 seats', 'incl16'],
                  ['8–14 pax · 29 seats', 'incl29'],
                  ['15–20 pax · 35 seats', 'incl35'],
                ] as const
              ).map(([label, field]) => (
                <div key={field} className="pcx-incl-card">
                  <div className="pcx-incl-label">{label}</div>
                  <InlineEdit
                    editing={editing}
                    value={product[field]}
                    type="multiline"
                    placeholder="Not specified"
                    onSave={(v) => onPatchProduct(product.code, { [field]: String(v ?? '') })}
                  />
                </div>
              ))}
            </div>
          )}
        </EditableSection>
      </div>

      <EditableSection
        title="Cost builder — USD by group size"
        hint={lines.length ? 'Blank cells were broken formulas in Excel.' : undefined}
      >
        {({ editing }) => {
          if (!lines.length) {
            return <p className="pcx-muted">No cost-builder block was found for this experience in the workbook.</p>;
          }

          const showingAll = editing || showAllPax;
          const visiblePax = showingAll ? PAX_COLS : KEY_PAX_COLS;

          return (
            <>
              <div className="pcx-pax-toolbar">
                <span className="pcx-muted">
                  {showingAll ? 'All group sizes 1–20 · scroll sideways to view' : 'Key group sizes by vehicle tier'}
                </span>
                <div className="pcx-pax-view-toggle" aria-label="Cost builder columns">
                  <button
                    type="button"
                    className={`pcx-pax-view-btn${!showingAll ? ' on' : ''}`}
                    disabled={editing}
                    onClick={() => setShowAllPax(false)}
                    title={editing ? 'Finish editing to return to key group sizes' : undefined}
                  >
                    Key pax
                  </button>
                  <button
                    type="button"
                    className={`pcx-pax-view-btn${showingAll ? ' on' : ''}`}
                    onClick={() => setShowAllPax(true)}
                  >
                    All 1–20
                  </button>
                </div>
              </div>
              <div className="pcx-pax-wrap">
                <table className={`pcx-pax-grid${showingAll ? '' : ' compact'}`}>
                  <thead>
                    <tr>
                      <th className="pcx-pax-label">Line</th>
                      {visiblePax.map((n) => (
                        <th
                          key={n}
                          className={[
                            n === 1 ? 'pcx-pax-solo' : '',
                            PAX_BAND_ENDS.has(n) ? 'pcx-pax-band-end' : '',
                          ].filter(Boolean).join(' ') || undefined}
                        >
                          {n}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line) => (
                      <tr key={line.id} className={`pcx-pax-row pcx-kind-${line.kind}`}>
                        <th className="pcx-pax-label" title={KIND_LABELS[line.kind]}>
                          {line.groupLabel && <span className="pcx-pax-group">{line.groupLabel}</span>}
                          {line.label}
                        </th>
                        {visiblePax.map((n) => {
                          const index = n - 1;
                          return (
                            <td
                              key={n}
                              className={`pcx-pax-cell${PAX_BAND_ENDS.has(n) ? ' pcx-pax-band-end' : ''}`}
                            >
                              <InlineEdit
                                editing={editing}
                                value={line.pax[index] ?? null}
                                type="number"
                                align="right"
                                compact
                                placeholder="·"
                                format={fmtPax}
                                onSave={(v) => patchPax(line, index, v as number | null)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          );
        }}
      </EditableSection>
    </div>
  );
}

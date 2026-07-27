'use client';

import { Fragment, useMemo, useState } from 'react';
import EditableSection from '@/components/pricing/EditableSection';
import InlineEdit from '@/components/pricing/InlineEdit';
import type { AccCruiseRate } from '@/lib/pricing/catalog-types';

type Props = {
  cruises: AccCruiseRate[];
  sheets: string[];
  onPatch: (id: string, patch: Partial<AccCruiseRate>) => Promise<void>;
};

interface CruiseBlock {
  key: string;
  sheet: string;
  name: string;
  location: string;
  stars: string;
  phone: string;
  email: string;
  cabins: AccCruiseRate[];
}

export default function AccCruiseTable({ cruises, sheets, onPatch }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sheetFilter, setSheetFilter] = useState('');

  const blocks = useMemo(() => {
    const map = new Map<string, CruiseBlock>();
    for (const cabin of cruises) {
      if (sheetFilter && cabin.sheet !== sheetFilter) continue;
      const key = `${cabin.sheet}::${cabin.propertyName}`;
      const existing = map.get(key);
      if (existing) {
        existing.cabins.push(cabin);
        continue;
      }
      map.set(key, {
        key,
        sheet: cabin.sheet,
        name: cabin.propertyName,
        location: cabin.location,
        stars: cabin.stars,
        phone: cabin.phone,
        email: cabin.email,
        cabins: [cabin],
      });
    }
    return [...map.values()];
  }, [cruises, sheetFilter]);

  const emptySheets = sheets.filter((sheet) => !cruises.some((c) => c.sheet === sheet));

  return (
    <div>
      <div className="search-row">
        <select value={sheetFilter} onChange={(e) => setSheetFilter(e.target.value)}>
          <option value="">All cruise sheets</option>
          {sheets.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="pcx-muted">
          {blocks.length} cruises · {cruises.length} cabin rows
        </span>
      </div>

      {emptySheets.length > 0 && (
        <div className="pcx-alert pcx-alert-warn">
          No cabin rows yet in: {emptySheets.join(', ')}.
        </div>
      )}

      {blocks.length > 0 && (
        <div className="card">
          <div className="card-body pcx-table-wrap">
            <table className="tbl pcx-table">
              <thead>
                <tr>
                  <th className="pcx-col-chevron" />
                  <th>Cruise</th>
                  <th>Location</th>
                  <th>Stars</th>
                  <th className="pcx-num">Cabins</th>
                  <th className="pcx-num">From (2026)</th>
                  <th className="pcx-num">From (2027)</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map((block) => {
                  const open = expanded === block.key;
                  const sell26 = block.cabins.map((c) => c.sell2026).filter((v): v is number => v != null);
                  const sell27 = block.cabins.map((c) => c.sell2027).filter((v): v is number => v != null);

                  return (
                    <Fragment key={block.key}>
                      <tr
                        className={`pcx-row${open ? ' open' : ''}`}
                        onClick={() => setExpanded(open ? null : block.key)}
                      >
                        <td className="pcx-col-chevron">
                          <span className={`pcx-chevron${open ? ' open' : ''}`}>▸</span>
                        </td>
                        <td>
                          <b>{block.name}</b>
                        </td>
                        <td className="pcx-muted">{block.location || '—'}</td>
                        <td>{block.stars ? <span className="bdg bdg-a">{block.stars}</span> : '—'}</td>
                        <td className="pcx-num">{block.cabins.length}</td>
                        <td className="pcx-num">{sell26.length ? `$${Math.min(...sell26)}` : '—'}</td>
                        <td className="pcx-num">{sell27.length ? `$${Math.min(...sell27)}` : '—'}</td>
                        <td className="pcx-muted">{block.email || block.phone || '—'}</td>
                      </tr>

                      {open && (
                        <tr className="pcx-expand-row">
                          <td colSpan={8}>
                            <CruiseDetail block={block} onPatch={onPatch} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CruiseDetail({
  block,
  onPatch,
}: {
  block: CruiseBlock;
  onPatch: (id: string, patch: Partial<AccCruiseRate>) => Promise<void>;
}) {
  return (
    <div className="pcx-detail" onClick={(e) => e.stopPropagation()}>
      <div className="pcx-detail-grid">
        <section className="pcx-detail-block">
          <h4 className="pcx-detail-title">Contact</h4>
          <dl className="pcx-facts">
            <div>
              <dt>Phone</dt>
              <dd>{block.phone || '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{block.email || '—'}</dd>
            </div>
            <div>
              <dt>Sheet</dt>
              <dd className="pcx-muted">{block.sheet}</dd>
            </div>
          </dl>
        </section>
      </div>

      <EditableSection title="Cabin pricing (USD per cabin)">
        {({ editing }) => (
          <div className="pcx-table-wrap">
            <table className="tbl pcx-table pcx-subtable">
              <thead>
                <tr>
                  <th>Cabin type</th>
                  <th className="pcx-num">Cost 2026</th>
                  <th className="pcx-num">Cost 2027</th>
                  <th className="pcx-num">Sell 2026</th>
                  <th className="pcx-num">Sell 2027</th>
                  <th className="pcx-num">Markup %</th>
                  <th className="pcx-num">Margin</th>
                </tr>
              </thead>
              <tbody>
                {block.cabins.map((cabin) => (
                  <tr key={cabin.id}>
                    <td>
                      <InlineEdit
                        editing={editing}
                        value={cabin.roomType}
                        onSave={(v) => onPatch(cabin.id, { roomType: String(v ?? '') })}
                      />
                    </td>
                    {(
                      [
                        ['cost2026', cabin.cost2026],
                        ['cost2027', cabin.cost2027],
                        ['sell2026', cabin.sell2026],
                        ['sell2027', cabin.sell2027],
                        ['markupPct', cabin.markupPct],
                        ['margin', cabin.margin],
                      ] as const
                    ).map(([field, value]) => (
                      <td key={field} className="pcx-num">
                        <InlineEdit
                          editing={editing}
                          value={value}
                          type="number"
                          align="right"
                          onSave={(v) => onPatch(cabin.id, { [field]: v as number | null })}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </EditableSection>
    </div>
  );
}

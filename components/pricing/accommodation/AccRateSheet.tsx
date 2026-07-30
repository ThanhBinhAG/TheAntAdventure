'use client';

import { Fragment, useMemo, useState } from 'react';
import PaginationBar from '@/components/PaginationBar';
import EditableSection from '@/components/pricing/EditableSection';
import InlineEdit from '@/components/pricing/InlineEdit';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import type { AccRoomRate } from '@/lib/pricing/catalog-types';

type Props = {
  sheet: string;
  rates: AccRoomRate[];
  onPatch: (id: string, patch: Partial<AccRoomRate>) => Promise<void>;
};

interface PropertyBlock {
  key: string;
  location: string;
  propertyName: string;
  rates: AccRoomRate[];
}

const SEASON_TONE: Record<string, string> = {
  LOW: 'pcx-season-low',
  HIGH: 'pcx-season-high',
  PEAK: 'pcx-season-peak',
};

function seasonClass(season: string): string {
  const key = season.trim().toUpperCase();
  return SEASON_TONE[key] ?? 'pcx-season-flat';
}

const money = (value: number) => value.toLocaleString('en-US');

export default function AccRateSheet({ sheet, rates, onPatch }: Props) {
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const locations = useMemo(
    () => Array.from(new Set(rates.map((r) => r.location).filter(Boolean))).sort(),
    [rates]
  );

  const blocks = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const map = new Map<string, PropertyBlock>();

    for (const rate of rates) {
      if (location && rate.location !== location) continue;
      if (needle && ![rate.propertyName, rate.roomType, rate.location].some((f) => f.toLowerCase().includes(needle))) {
        continue;
      }
      const key = `${rate.location}::${rate.propertyName}`;
      const existing = map.get(key);
      if (existing) existing.rates.push(rate);
      else map.set(key, { key, location: rate.location, propertyName: rate.propertyName, rates: [rate] });
    }
    return [...map.values()];
  }, [rates, search, location]);

  const { pageSize, setPageSize } = usePageSize();
  const pagination = usePagination(blocks, pageSize, [search, location, sheet, pageSize]);
  const { paginatedItems } = pagination;

  if (!rates.length) {
    return <p className="pcx-empty">No rows imported from “{sheet}”.</p>;
  }

  return (
    <div>
      <div className="search-row">
        <input
          type="text"
          placeholder="Search property or room type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={location} onChange={(e) => setLocation(e.target.value)}>
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <span className="pcx-muted">
          {blocks.length} properties · {rates.length} rate rows
        </span>
      </div>

      <div className="card">
        <div className="card-body pcx-table-wrap">
          <table className="tbl pcx-table">
            <thead>
              <tr>
                <th className="pcx-col-chevron" />
                <th>Property</th>
                <th>Location</th>
                <th className="pcx-num">Rooms</th>
                <th>Seasons</th>
                <th className="pcx-num">Lowest sell</th>
                <th className="pcx-num">Highest sell</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((block) => {
                const open = expanded === block.key;
                const sells = block.rates.map((r) => r.sellPrice).filter((v): v is number => v != null);
                const seasons = Array.from(new Set(block.rates.map((r) => r.season).filter(Boolean)));

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
                        <b>{block.propertyName}</b>
                      </td>
                      <td className="pcx-muted">{block.location || '—'}</td>
                      <td className="pcx-num">{block.rates.length}</td>
                      <td>
                        <div className="pcx-chips">
                          {seasons.length ? (
                            seasons.map((season) => (
                              <span key={season} className={`pcx-season ${seasonClass(season)}`}>
                                {season}
                              </span>
                            ))
                          ) : (
                            <span className="pcx-muted">—</span>
                          )}
                        </div>
                      </td>
                      <td className="pcx-num">{sells.length ? `$${Math.min(...sells)}` : '—'}</td>
                      <td className="pcx-num">{sells.length ? `$${Math.max(...sells)}` : '—'}</td>
                    </tr>

                    {open && (
                      <tr className="pcx-expand-row">
                        <td colSpan={7}>
                          <RateDetail block={block} onPatch={onPatch} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
        </div>
      </div>
    </div>
  );
}

function RateDetail({
  block,
  onPatch,
}: {
  block: PropertyBlock;
  onPatch: (id: string, patch: Partial<AccRoomRate>) => Promise<void>;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, AccRoomRate[]>();
    for (const rate of block.rates) {
      const key = [rate.yearLabel, rate.season].filter(Boolean).join(' · ') || 'Rates';
      const bucket = map.get(key);
      if (bucket) bucket.push(rate);
      else map.set(key, [rate]);
    }
    return [...map.entries()];
  }, [block.rates]);

  const policyNotes = useMemo(
    () => block.rates.filter((r) => r.notes).map((r) => ({ id: r.id, notes: r.notes })),
    [block.rates]
  );

  return (
    <div className="pcx-detail" onClick={(e) => e.stopPropagation()}>
      {groups.map(([label, rows]) => {
        const first = rows[0];
        const period = [first?.periodFrom, first?.periodTo].filter(Boolean).join(' → ');

        return (
          <EditableSection
            key={label}
            title={
              <>
                <span className={`pcx-season ${seasonClass(first?.season ?? '')}`}>{label}</span>
                {period && <span className="pcx-detail-hint">{period}</span>}
              </>
            }
          >
            {({ editing }) => (
              <div className="pcx-table-wrap">
                <table className="tbl pcx-table pcx-subtable">
                  <thead>
                    <tr>
                      <th>Room type</th>
                      <th>Period from</th>
                      <th>Period to</th>
                      <th className="pcx-num">VND / room / night</th>
                      <th className="pcx-num">USD cost</th>
                      <th className="pcx-num">Sell (USD)</th>
                      <th className="pcx-num">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((rate) => (
                      <tr key={rate.id}>
                        <td>
                          <InlineEdit
                            editing={editing}
                            value={rate.roomType}
                            onSave={(v) => onPatch(rate.id, { roomType: String(v ?? '') })}
                          />
                        </td>
                        <td className="pcx-muted">
                          <InlineEdit
                            editing={editing}
                            value={rate.periodFrom}
                            placeholder="—"
                            onSave={(v) => onPatch(rate.id, { periodFrom: String(v ?? '') })}
                          />
                        </td>
                        <td className="pcx-muted">
                          <InlineEdit
                            editing={editing}
                            value={rate.periodTo}
                            placeholder="—"
                            onSave={(v) => onPatch(rate.id, { periodTo: String(v ?? '') })}
                          />
                        </td>
                        <td className="pcx-num">
                          <InlineEdit
                            editing={editing}
                            value={rate.vndCost}
                            type="number"
                            align="right"
                            format={money}
                            onSave={(v) => onPatch(rate.id, { vndCost: v as number | null })}
                          />
                        </td>
                        <td className="pcx-num">
                          <InlineEdit
                            editing={editing}
                            value={rate.usdCost}
                            type="number"
                            align="right"
                            onSave={(v) => onPatch(rate.id, { usdCost: v as number | null })}
                          />
                        </td>
                        <td className="pcx-num">
                          <InlineEdit
                            editing={editing}
                            value={rate.sellPrice}
                            type="number"
                            align="right"
                            onSave={(v) => onPatch(rate.id, { sellPrice: v as number | null })}
                          />
                        </td>
                        <td className="pcx-num">
                          <InlineEdit
                            editing={editing}
                            value={rate.margin}
                            type="number"
                            align="right"
                            onSave={(v) => onPatch(rate.id, { margin: v as number | null })}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </EditableSection>
        );
      })}

      {policyNotes.length > 0 && (
        <section className="pcx-detail-block">
          <h4 className="pcx-detail-title">Policies &amp; occupancy</h4>
          {policyNotes.map((note) => (
            <pre key={note.id} className="pcx-policy">
              {note.notes}
            </pre>
          ))}
        </section>
      )}
    </div>
  );
}

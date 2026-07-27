'use client';

import { Fragment, useMemo, useState } from 'react';
import EditableSection from '@/components/pricing/EditableSection';
import InlineEdit from '@/components/pricing/InlineEdit';
import type { EssHotelRate, EssNote } from '@/lib/pricing/catalog-types';

type Props = {
  hotels: EssHotelRate[];
  notes: EssNote[];
  onPatch: (id: string, patch: Partial<EssHotelRate>) => Promise<void>;
};

interface PropertyGroup {
  key: string;
  sheet: string;
  property: string;
  rates: EssHotelRate[];
}

const money = (value: number) => value.toLocaleString('en-US');

export default function EssentialsHotels({ hotels, notes, onPatch }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const map = new Map<string, PropertyGroup>();

    for (const rate of hotels) {
      if (needle && ![rate.property, rate.roomType, rate.sheet].some((f) => f.toLowerCase().includes(needle))) {
        continue;
      }
      const key = `${rate.sheet}::${rate.property}`;
      const existing = map.get(key);
      if (existing) existing.rates.push(rate);
      else map.set(key, { key, sheet: rate.sheet, property: rate.property || rate.sheet, rates: [rate] });
    }
    return [...map.values()];
  }, [hotels, search]);

  const unratedBySheet = useMemo(() => {
    const map = new Map<string, EssNote[]>();
    for (const note of notes) {
      if (note.section !== 'Properties without rates') continue;
      const bucket = map.get(note.sheet.trim());
      if (bucket) bucket.push(note);
      else map.set(note.sheet.trim(), [note]);
    }
    return map;
  }, [notes]);

  if (!hotels.length) {
    return <p className="pcx-empty">No Essentials hotel rates imported yet.</p>;
  }

  return (
    <div>
      <div className="search-row">
        <input
          type="text"
          placeholder="Search property, room or destination sheet…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="pcx-muted">
          {groups.length} properties · {hotels.length} room rows
        </span>
      </div>

      <div className="card">
        <div className="card-body pcx-table-wrap">
          <table className="tbl pcx-table">
            <thead>
              <tr>
                <th className="pcx-col-chevron" />
                <th>Property</th>
                <th>Destination sheet</th>
                <th className="pcx-num">Rooms</th>
                <th className="pcx-num">From (VND)</th>
                <th className="pcx-num">From (USD)</th>
                <th className="pcx-num">From selling</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const open = expanded === group.key;
                const vndValues = group.rates.map((r) => r.vndA).filter((v): v is number => v != null);
                const usdValues = group.rates.map((r) => r.usdA).filter((v): v is number => v != null);
                const sellValues = group.rates.map((r) => r.sellA).filter((v): v is number => v != null);

                return (
                  <Fragment key={group.key}>
                    <tr
                      className={`pcx-row${open ? ' open' : ''}`}
                      onClick={() => setExpanded(open ? null : group.key)}
                    >
                      <td className="pcx-col-chevron">
                        <span className={`pcx-chevron${open ? ' open' : ''}`}>▸</span>
                      </td>
                      <td>
                        <b>{group.property}</b>
                      </td>
                      <td className="pcx-muted">{group.sheet}</td>
                      <td className="pcx-num">{group.rates.length}</td>
                      <td className="pcx-num">{vndValues.length ? money(Math.min(...vndValues)) : '—'}</td>
                      <td className="pcx-num">{usdValues.length ? `$${Math.min(...usdValues)}` : '—'}</td>
                      <td className="pcx-num">{sellValues.length ? `$${Math.min(...sellValues)}` : '—'}</td>
                    </tr>

                    {open && (
                      <tr className="pcx-expand-row">
                        <td colSpan={7}>
                          <HotelDetail group={group} onPatch={onPatch} />
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

      {unratedBySheet.size > 0 && (
        <section className="card">
          <div className="card-hd">
            <span className="card-title">Properties listed without rates</span>
          </div>
          <div className="card-body">
            <div className="pcx-chip-groups">
              {[...unratedBySheet.entries()].map(([sheet, list]) => (
                <div key={sheet} className="pcx-chip-group">
                  <span className="pcx-chip-group-label">{sheet}</span>
                  <div className="pcx-chips">
                    {list.map((note) => (
                      <span key={note.id} className="bdg bdg-w">
                        {note.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function HotelDetail({
  group,
  onPatch,
}: {
  group: PropertyGroup;
  onPatch: (id: string, patch: Partial<EssHotelRate>) => Promise<void>;
}) {
  const sections = useMemo(() => {
    const map = new Map<string, EssHotelRate[]>();
    for (const rate of group.rates) {
      const key = rate.section || 'Rooms';
      const bucket = map.get(key);
      if (bucket) bucket.push(rate);
      else map.set(key, [rate]);
    }
    return [...map.entries()];
  }, [group.rates]);

  const sample = group.rates[0];
  const twoTier = Boolean(sample?.variantB);
  const variantA = sample?.variantA || 'Rate';
  const variantB = sample?.variantB || '';

  return (
    <div className="pcx-detail" onClick={(e) => e.stopPropagation()}>
      {sections.map(([section, rates]) => (
        <EditableSection key={section} title={section}>
          {({ editing }) => (
            <div className="pcx-table-wrap">
              <table className="tbl pcx-table pcx-subtable">
                <thead>
                  <tr>
                    <th rowSpan={twoTier ? 2 : 1}>Room type</th>
                    <th colSpan={twoTier ? 2 : 1} className="pcx-num">
                      VND cost
                    </th>
                    <th colSpan={twoTier ? 2 : 1} className="pcx-num">
                      USD cost
                    </th>
                    <th colSpan={twoTier ? 2 : 1} className="pcx-num">
                      Selling incl. breakfast
                    </th>
                    <th rowSpan={twoTier ? 2 : 1}>Notes</th>
                  </tr>
                  {twoTier && (
                    <tr>
                      {[variantA, variantB, variantA, variantB, variantA, variantB].map((label, i) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <th key={`${label}-${i}`} className="pcx-num pcx-subhead">
                          {label}
                        </th>
                      ))}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {rates.map((rate) => (
                    <tr key={rate.id}>
                      <td>{rate.roomType}</td>
                      <td className="pcx-num">
                        <InlineEdit
                          editing={editing}
                          value={rate.vndA}
                          type="number"
                          align="right"
                          format={money}
                          onSave={(v) => onPatch(rate.id, { vndA: v as number | null })}
                        />
                      </td>
                      {twoTier && (
                        <td className="pcx-num">
                          <InlineEdit
                            editing={editing}
                            value={rate.vndB}
                            type="number"
                            align="right"
                            format={money}
                            onSave={(v) => onPatch(rate.id, { vndB: v as number | null })}
                          />
                        </td>
                      )}
                      <td className="pcx-num">
                        <InlineEdit
                          editing={editing}
                          value={rate.usdA}
                          type="number"
                          align="right"
                          onSave={(v) => onPatch(rate.id, { usdA: v as number | null })}
                        />
                      </td>
                      {twoTier && (
                        <td className="pcx-num">
                          <InlineEdit
                            editing={editing}
                            value={rate.usdB}
                            type="number"
                            align="right"
                            onSave={(v) => onPatch(rate.id, { usdB: v as number | null })}
                          />
                        </td>
                      )}
                      <td className="pcx-num">
                        <InlineEdit
                          editing={editing}
                          value={rate.sellA}
                          type="number"
                          align="right"
                          onSave={(v) => onPatch(rate.id, { sellA: v as number | null })}
                        />
                      </td>
                      {twoTier && (
                        <td className="pcx-num">
                          <InlineEdit
                            editing={editing}
                            value={rate.sellB}
                            type="number"
                            align="right"
                            onSave={(v) => onPatch(rate.id, { sellB: v as number | null })}
                          />
                        </td>
                      )}
                      <td className="pcx-note-cell">
                        <InlineEdit
                          editing={editing}
                          value={rate.notes}
                          type="multiline"
                          placeholder="Add a note"
                          onSave={(v) => onPatch(rate.id, { notes: String(v ?? '') })}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </EditableSection>
      ))}
    </div>
  );
}

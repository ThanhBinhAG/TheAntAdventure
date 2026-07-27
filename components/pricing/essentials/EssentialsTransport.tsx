'use client';

import { useMemo, useState } from 'react';
import { EditableCard } from '@/components/pricing/EditableSection';
import InlineEdit from '@/components/pricing/InlineEdit';
import type { EssCarRate } from '@/lib/pricing/catalog-types';

type Props = {
  cars: EssCarRate[];
  onPatch: (id: string, patch: Partial<EssCarRate>) => Promise<void>;
};

const SEATS = [
  ['s7', '7 seats'],
  ['s16', '16 seats'],
  ['s29', '29 seats'],
  ['s35', '35 seats'],
  ['s45', '45 seats'],
] as const;

const money = (value: number) => value.toLocaleString('en-US');

export default function EssentialsTransport({ cars, onPatch }: Props) {
  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const map = new Map<string, EssCarRate[]>();
    for (const car of cars) {
      if (needle && ![car.tourTitle, car.route, car.duration].some((f) => f.toLowerCase().includes(needle))) {
        continue;
      }
      const key = car.category || 'Transfers';
      const bucket = map.get(key);
      if (bucket) bucket.push(car);
      else map.set(key, [car]);
    }
    return [...map.entries()];
  }, [cars, search]);

  if (!cars.length) {
    return <p className="pcx-empty">No vehicle rates imported yet.</p>;
  }

  return (
    <div>
      <div className="search-row">
        <input
          type="text"
          placeholder="Search route or duration…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="pcx-muted">Rates in VND per vehicle</span>
      </div>

      {groups.map(([category, rows]) => (
        <EditableCard
          key={category}
          title={category}
          meta={<span className="pcx-count">{rows.length}</span>}
        >
          {({ editing }) => (
            <div className="card-body pcx-table-wrap">
              <table className="tbl pcx-table">
                <thead>
                  <tr>
                    <th>Tour</th>
                    <th>Route</th>
                    <th className="pcx-num">KM</th>
                    <th>Duration</th>
                    {SEATS.map(([, label]) => (
                      <th key={label} className="pcx-num">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((car) => (
                    <tr key={car.id}>
                      <td>
                        <b>{car.tourTitle || '—'}</b>
                      </td>
                      <td className="pcx-muted">{car.route || '—'}</td>
                      <td className="pcx-num">
                        <InlineEdit
                          editing={editing}
                          value={car.km}
                          type="number"
                          align="right"
                          onSave={(v) => onPatch(car.id, { km: v as number | null })}
                        />
                      </td>
                      <td className="pcx-muted">{car.duration || '—'}</td>
                      {SEATS.map(([field]) => (
                        <td key={field} className="pcx-num">
                          <InlineEdit
                            editing={editing}
                            value={car[field]}
                            type="number"
                            align="right"
                            format={money}
                            onSave={(v) => onPatch(car.id, { [field]: v as number | null })}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </EditableCard>
      ))}
    </div>
  );
}

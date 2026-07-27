'use client';

import { useMemo } from 'react';
import { EditableCard } from '@/components/pricing/EditableSection';
import InlineEdit from '@/components/pricing/InlineEdit';
import type {
  AccCruiseRate,
  AccProperty,
  AccRoomRate,
  PricingSetting,
} from '@/lib/pricing/catalog-types';

type Props = {
  properties: AccProperty[];
  roomRates: AccRoomRate[];
  cruiseRates: AccCruiseRate[];
  settings: PricingSetting[];
  onPatchSetting: (id: string, patch: Partial<PricingSetting>) => Promise<void>;
};

function tally(values: string[]): [string, number][] {
  const map = new Map<string, number>();
  for (const value of values) {
    const key = value.trim() || 'Unspecified';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export default function AccOverview({
  properties,
  roomRates,
  cruiseRates,
  settings,
  onPatchSetting,
}: Props) {
  const byRegion = useMemo(() => tally(properties.map((p) => p.region)), [properties]);
  const byType = useMemo(() => tally(properties.map((p) => p.type)), [properties]);
  const byStars = useMemo(() => tally(properties.map((p) => p.stars)), [properties]);
  const byApproval = useMemo(() => tally(properties.map((p) => p.approved)), [properties]);
  const cruiseStars = useMemo(() => tally(cruiseRates.map((c) => c.stars)), [cruiseRates]);

  const pricedRates = roomRates.filter((r) => r.vndCost != null || r.sellPrice != null).length;
  const ratedProperties = new Set(roomRates.map((r) => r.propertyName.toLowerCase())).size;

  return (
    <div>
      <div className="pcx-stat-row">
        <div className="pcx-stat-card">
          <span className="pcx-stat-value">{properties.length}</span>
          <span className="pcx-stat-label">properties</span>
        </div>
        <div className="pcx-stat-card">
          <span className="pcx-stat-value">{ratedProperties}</span>
          <span className="pcx-stat-label">with contracted rates</span>
        </div>
        <div className="pcx-stat-card">
          <span className="pcx-stat-value">{pricedRates.toLocaleString('en-US')}</span>
          <span className="pcx-stat-label">priced room rows</span>
        </div>
        <div className="pcx-stat-card">
          <span className="pcx-stat-value">{cruiseRates.length}</span>
          <span className="pcx-stat-label">cruise cabin rows</span>
        </div>
      </div>

      {settings.length > 0 && (
        <EditableCard
          title="Sheet inputs"
          meta={<span className="pcx-muted">Exchange rate and markup per rate sheet</span>}
        >
          {({ editing }) => (
            <div className="card-body">
              <div className="pcx-setting-grid">
                {settings.map((setting) => (
                  <div key={setting.id} className="pcx-setting">
                    <span className="pcx-setting-label">{setting.label || setting.key}</span>
                    <InlineEdit
                      editing={editing}
                      value={setting.valueNum ?? setting.valueText}
                      type={setting.valueNum != null ? 'number' : 'text'}
                      onSave={(v) =>
                        onPatchSetting(setting.id, {
                          valueNum: typeof v === 'number' ? v : null,
                          valueText: String(v ?? ''),
                        })
                      }
                    />
                    <span className="pcx-setting-sheet">{setting.sheet}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </EditableCard>
      )}

      <div className="pcx-block-grid">
        {(
          [
            ['By region', byRegion],
            ['By property type', byType],
            ['By star rating', byStars],
            ['Approval status', byApproval],
            ['Cruise cabins by rating', cruiseStars],
          ] as const
        ).map(([title, rows]) =>
          rows.length ? (
            <section key={title} className="card pcx-block-card">
              <div className="card-hd">
                <span className="card-title">{title}</span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="tbl pcx-table">
                  <tbody>
                    {rows.map(([label, count]) => (
                      <tr key={label}>
                        <td>{label}</td>
                        <td className="pcx-num" style={{ width: 70 }}>
                          <b>{count}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null
        )}
      </div>
    </div>
  );
}

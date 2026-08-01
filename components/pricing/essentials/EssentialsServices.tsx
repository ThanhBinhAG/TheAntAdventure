'use client';

import { useMemo } from 'react';
import { EditableCard } from '@/components/pricing/EditableSection';
import InlineEdit from '@/components/pricing/InlineEdit';
import type { EssServiceRate } from '@/lib/pricing/catalog-types';
import EmptyState from '@/components/EmptyState';

type Props = {
  services: EssServiceRate[];
  onPatch: (id: string, patch: Partial<EssServiceRate>) => Promise<void>;
};

const money = (value: number) => value.toLocaleString('en-US');

export default function EssentialsServices({ services, onPatch }: Props) {
  const blocks = useMemo(() => {
    const map = new Map<string, EssServiceRate[]>();
    for (const rate of services) {
      const key = rate.block || 'Other rates';
      const bucket = map.get(key);
      if (bucket) bucket.push(rate);
      else map.set(key, [rate]);
    }
    return [...map.entries()];
  }, [services]);

  if (!services.length) {
    return (
      <EmptyState
        className="crm-empty-state--flush"
        size="compact"
        variant="docs"
        title="No service rates yet"
        description="Import the Essentials workbook to populate service rates."
      />
    );
  }

  return (
    <div className="pcx-block-grid">
      {blocks.map(([block, rates]) => (
        <EditableCard
          key={block}
          title={block}
          meta={<span className="pcx-count">{rates.length}</span>}
        >
          {({ editing }) => (
            <div className="card-body" style={{ padding: 0 }}>
              <table className="tbl pcx-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Unit</th>
                    <th className="pcx-num">Rate</th>
                    <th className="pcx-num">Alt. rate</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((rate) => (
                    <tr key={rate.id}>
                      <td>
                        <InlineEdit
                          editing={editing}
                          value={rate.label}
                          onSave={(v) => onPatch(rate.id, { label: String(v ?? '') })}
                        />
                      </td>
                      <td className="pcx-muted">
                        <InlineEdit
                          editing={editing}
                          value={rate.unit}
                          onSave={(v) => onPatch(rate.id, { unit: String(v ?? '') })}
                        />
                      </td>
                      <td className="pcx-num">
                        <InlineEdit
                          editing={editing}
                          value={rate.amount}
                          type="number"
                          align="right"
                          format={money}
                          onSave={(v) => onPatch(rate.id, { amount: v as number | null })}
                        />
                      </td>
                      <td className="pcx-num">
                        <InlineEdit
                          editing={editing}
                          value={rate.amount2}
                          type="number"
                          align="right"
                          format={money}
                          onSave={(v) => onPatch(rate.id, { amount2: v as number | null })}
                        />
                      </td>
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

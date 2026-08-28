'use client';

import { useMemo, useState } from 'react';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import QuickListFormModal, { type QuickListKind } from '@/components/suppliers/QuickListFormModal';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { useQuickListMutations } from '@/hooks/useQuickListMutations';
import { useStore } from '@/hooks/useStore';
import { filterByRegion, supplierMatchesSearch, type SupplierFilters } from '@/lib/suppliers/supplier-utils';
import type { CruiseSupplier, RestaurantSupplier, TransportSupplier } from '@/lib/types';
import { toast } from '@/lib/toast';

import { confirmDialog } from '@/lib/confirm';

type QuickRow = TransportSupplier | RestaurantSupplier | CruiseSupplier;

const TABLE_CONFIG: Record<
  QuickListKind,
  {
    title: string;
    columns: { key: string; label: string; style?: React.CSSProperties }[];
    searchFields: (row: QuickRow) => (string | number | undefined)[];
    regionField?: (row: QuickRow) => string | undefined;
  }
> = {
  transport: {
    title: 'Transport',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Company' },
      { key: 'region', label: 'Region' },
      { key: 'vehicles', label: 'Vehicles' },
      { key: 'rate', label: 'Day Rate', style: { fontWeight: 600, color: 'var(--g)' } },
      { key: 'notes', label: 'Notes', style: { color: 'var(--m)', fontSize: 12 } },
    ],
    searchFields: (r) => [r.name, (r as TransportSupplier).region, (r as TransportSupplier).vehicles, (r as TransportSupplier).notes],
    regionField: (r) => {
      const reg = (r as TransportSupplier).region?.toLowerCase();
      if (reg === 'north') return 'north';
      if (reg === 'central') return 'central';
      if (reg === 'south') return 'south';
      return reg;
    },
  },
  restaurant: {
    title: 'Restaurant',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Restaurant' },
      { key: 'city', label: 'City' },
      { key: 'cuisine', label: 'Cuisine' },
      { key: 'set', label: 'Set Menu From', style: { fontWeight: 600, color: 'var(--g)' } },
      { key: 'cap', label: 'Capacity' },
      { key: 'rating', label: 'Rating', style: { color: 'var(--gold)' } },
    ],
    searchFields: (r) => {
      const row = r as RestaurantSupplier;
      return [row.name, row.city, row.cuisine, row.set, row.rating];
    },
  },
  cruise: {
    title: 'Cruise',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Cruise' },
      { key: 'route', label: 'Route' },
      { key: 'cabins', label: 'Cabin Types' },
      { key: 'rate', label: 'Rate', style: { fontWeight: 600, color: 'var(--g)' } },
      { key: 'valid', label: 'Validity' },
      { key: 'rating', label: 'Rating', style: { color: 'var(--gold)' } },
    ],
    searchFields: (r) => {
      const row = r as CruiseSupplier;
      return [row.name, row.route, row.cabins, row.rate];
    },
  },
};

type Props = {
  kind: QuickListKind;
  filters: SupplierFilters;
  canWrite?: boolean;
};

export default function QuickListTab({ kind, filters, canWrite }: Props) {
  const transport = useStore((s) => s.transport);
  const restaurants = useStore((s) => s.restaurants);
  const cruises = useStore((s) => s.cruises);
  const { createRow, patchRow, deleteRow } = useQuickListMutations(kind);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState<string | null>(null);

  const cfg = TABLE_CONFIG[kind];
  const rows: QuickRow[] = kind === 'transport' ? transport : kind === 'restaurant' ? restaurants : cruises;

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (!supplierMatchesSearch(filters.search, cfg.searchFields(row))) return false;
      if (filters.region && cfg.regionField) {
        const reg = cfg.regionField(row);
        if (reg !== filters.region) return false;
      } else if (filters.region && (row as TransportSupplier).region) {
        const reg = filterByRegion([row as TransportSupplier], filters.region);
        if (!reg.length) return false;
      }
      return true;
    });
  }, [rows, filters, cfg]);

  const { pageSize, setPageSize } = usePageSize();
  const pagination = usePagination(filtered, pageSize, [filters.region, filters.search, kind, pageSize]);
  const { paginatedItems } = pagination;

  const editRow = editId ? rows.find((r) => r.id === editId) : null;

  const openAdd = () => {
    setEditId(null);
    setFormMode('add');
    setFormOpen(true);
  };

  const openEdit = (id: string) => {
    setEditId(id);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirmDialog('Remove this entry?', { title: 'Remove entry' });
    if (!ok) return;
    const result = await deleteRow(id);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success('Entry removed.');
  };

  const handleSave = async (row: QuickRow) => {
    if (formMode === 'edit' && editId) {
      const result = await patchRow(editId, row);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Entry updated.');
      return;
    }
    const result = await createRow(row);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success('Entry created.');
  };

  return (
    <>
      <div className="sup-sub-bar" style={{ marginBottom: 10 }}>
        <div className="info-bar" style={{ margin: 0, flex: 1 }}>
          Showing <b>{filtered.length}</b> of <b>{rows.length}</b> {cfg.title.toLowerCase()} partners
        </div>
        <button
          className="btn btn-p btn-sm"
          type="button"
          onClick={openAdd}
          disabled={!canWrite}
          title={!canWrite ? `You need write permission to add ${cfg.title.toLowerCase()}` : undefined}
        >
          ＋ Add {cfg.title}
        </button>
      </div>
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                {cfg.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((row) => (
                <tr key={row.id}>
                  {cfg.columns.map((col) => (
                    <td key={col.key} style={col.style}>
                      {col.key === 'id' ? (
                        <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{String((row as unknown as Record<string, unknown>)[col.key] ?? '')}</code>
                      ) : col.key === 'name' ? (
                        <b>{String((row as unknown as Record<string, unknown>)[col.key] ?? '')}</b>
                      ) : (
                        String((row as unknown as Record<string, unknown>)[col.key] ?? '—')
                      )}
                    </td>
                  ))}
                  <td>
                    <button
                      className="btn btn-s btn-sm"
                      type="button"
                      onClick={() => openEdit(row.id)}
                      disabled={!canWrite}
                      title={!canWrite ? 'You need write permission to edit' : undefined}
                    >
                      ✏
                    </button>
                    <button
                      className="btn btn-s btn-sm"
                      type="button"
                      style={{ marginLeft: 4 }}
                      onClick={() => void handleDelete(row.id)}
                      disabled={!canWrite}
                      title={!canWrite ? 'You need write permission to delete' : undefined}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
              {!paginatedItems.length && (
                <tr>
                  <td colSpan={cfg.columns.length + 1} style={{ padding: 0, border: 'none' }}>
                    <EmptyState
                      className="crm-empty-state--table"
                      size="compact"
                      variant="suppliers"
                      title={`No ${cfg.title.toLowerCase()} partners found`}
                      description="Add a partner, or adjust search/region filters."
                      action={
                        <button
                          type="button"
                          className="btn btn-p btn-sm"
                          onClick={openAdd}
                          disabled={!canWrite}
                          title={!canWrite ? `You need write permission to add ${cfg.title.toLowerCase()}` : undefined}
                        >
                          ＋ Add {cfg.title}
                        </button>
                      }
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
        </div>
      </div>

      <QuickListFormModal
        open={formOpen}
        kind={kind}
        mode={formMode}
        row={editRow}
        existing={rows}
        onClose={() => setFormOpen(false)}
        onSave={(row) => {
          void handleSave(row);
        }}
      />
    </>
  );
}

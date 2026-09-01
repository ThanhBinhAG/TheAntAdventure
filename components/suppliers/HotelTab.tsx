'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import HotelFormModal from '@/components/suppliers/HotelFormModal';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { useHotelMutations } from '@/hooks/useHotelMutations';
import { useStore } from '@/hooks/useStore';
import { filterByRegion, supplierMatchesSearch, type SupplierFilters } from '@/lib/suppliers/supplier-utils';
import type { Hotel } from '@/lib/types';
import { toast } from '@/lib/toast';

import { confirmDialog } from '@/lib/confirm';
import { useLanguage } from '@/hooks/useLanguage';
import type { SUPPLIERSKey } from '@/lib/i18n/pages/suppliers';

const REG_BADGE_I18N: Record<string, SUPPLIERSKey> = {
  north: 'regBadgeNorth',
  central: 'regBadgeCentral',
  south: 'regBadgeSouth',
};

type Props = {
  filters: SupplierFilters;
  canWrite?: boolean;
};

export default function HotelTab({ filters, canWrite }: Props) {
  const { tp, tpl } = useLanguage();
  const hotels = useStore((s) => s.hotels);
  const { createHotel, patchHotel, deleteHotel } = useHotelMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return filterByRegion(hotels, filters.region).filter(
      (h) => supplierMatchesSearch(filters.search, [h.name, h.dest, h.cat, h.id])
    );
  }, [hotels, filters]);

  const { pageSize, setPageSize } = usePageSize();
  const pagination = usePagination(filtered, pageSize, [filters.region, filters.search, pageSize]);
  const { paginatedItems } = pagination;

  const editHotel = editId ? hotels.find((h) => h.id === editId) : null;

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
    const ok = await confirmDialog(tp('suppliers', 'confirmRemoveHotel'), {
      title: tp('suppliers', 'confirmRemoveHotelTitle'),
    });
    if (!ok) return;
    const result = await deleteHotel(id);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(tp('suppliers', 'toastHotelRemoved'));
  };

  const handleSave = async (hotel: Hotel) => {
    if (formMode === 'edit' && editId) {
      const result = await patchHotel(editId, hotel);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(tp('suppliers', 'toastHotelUpdated'));
      return;
    }
    const result = await createHotel(hotel);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(tp('suppliers', 'toastHotelCreated'));
  };

  return (
    <>
      <div className="sup-hotel-bar">
        <div className="info-bar" style={{ margin: 0, flex: 1 }}>
          {tpl('suppliers', 'showingHotels', { filtered: filtered.length, total: hotels.length })}
        </div>
        <Link href="/attractions" className="btn btn-s btn-sm">
          {tp('suppliers', 'linkAttractionSchedule')}
        </Link>
        <button
          className="btn btn-p btn-sm"
          type="button"
          onClick={openAdd}
          disabled={!canWrite}
          title={!canWrite ? tp('suppliers', 'permAddHotel') : undefined}
        >
          {tp('suppliers', 'addHotel')}
        </button>
      </div>
      <div className="card">
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="tbl sup-hotel-tbl">
            <thead>
              <tr>
                <th>{tp('suppliers', 'colId')}</th>
                <th>{tp('suppliers', 'colHotel')}</th>
                <th>{tp('suppliers', 'colDestination')}</th>
                <th>{tp('suppliers', 'colStars')}</th>
                <th>{tp('suppliers', 'colRoomType')}</th>
                <th className="sup-th sup-th-low">{tp('suppliers', 'colLowMup')}</th>
                <th className="sup-th sup-th-high">{tp('suppliers', 'colHighMup')}</th>
                <th className="sup-th sup-th-fest">{tp('suppliers', 'colFestMup')}</th>
                <th className="sup-th sup-th-peak">{tp('suppliers', 'colPeakMup')}</th>
                <th className="sup-th sup-th-low sup-th-net">{tp('suppliers', 'colLowNet')}</th>
                <th className="sup-th sup-th-high sup-th-net">{tp('suppliers', 'colHighNet')}</th>
                <th className="sup-th sup-th-fest sup-th-net">{tp('suppliers', 'colFestNet')}</th>
                <th className="sup-th sup-th-peak sup-th-net">{tp('suppliers', 'colPeakNet')}</th>
                <th>{tp('suppliers', 'colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.map((h) =>
                h.rooms.map((r, ri) => (
                  <tr key={`${h.id}-${ri}`}>
                    {ri === 0 && (
                      <>
                        <td rowSpan={h.rooms.length} style={{ verticalAlign: 'top', paddingTop: 12 }}>
                          <code style={{ fontSize: 10, color: 'var(--g)' }}>{h.id}</code>
                          <br />
                          <span className="sup-reg-badge">
                            {tp('suppliers', REG_BADGE_I18N[h.region] ?? 'regBadgeNorth')}
                          </span>
                        </td>
                        <td rowSpan={h.rooms.length} style={{ verticalAlign: 'top', paddingTop: 12 }}>
                          <b>{h.name}</b>
                          <br />
                          <span style={{ fontSize: 10.5, color: 'var(--m)' }}>{h.cat}</span>
                        </td>
                        <td rowSpan={h.rooms.length} style={{ verticalAlign: 'top', paddingTop: 12 }}>
                          {h.dest}
                        </td>
                        <td rowSpan={h.rooms.length} style={{ verticalAlign: 'top', paddingTop: 12, color: 'var(--gold)' }}>
                          {h.stars}
                        </td>
                      </>
                    )}
                    <td style={{ fontSize: 11.5 }}>
                      <b>{r.type}</b>
                      {r.view && (
                        <>
                          <br />
                          <span style={{ fontSize: 10, color: 'var(--m)' }}>{r.view}</span>
                        </>
                      )}
                      {r.sqm && (
                        <>
                          <br />
                          <span style={{ fontSize: 9.5, color: 'var(--m)' }}>{r.sqm}m²</span>
                        </>
                      )}
                    </td>
                    <td className="sup-td sup-td-low">${r.lm}</td>
                    <td className="sup-td sup-td-high">${r.hm}</td>
                    <td className="sup-td sup-td-fest">${r.fm}</td>
                    <td className="sup-td sup-td-peak">${r.pm}</td>
                    <td className="sup-td sup-td-net sup-td-low">${r.ln}</td>
                    <td className="sup-td sup-td-net sup-td-high">${r.hn}</td>
                    <td className="sup-td sup-td-net sup-td-fest">${r.fn}</td>
                    <td className="sup-td sup-td-net sup-td-peak">${r.pn}</td>
                    {ri === 0 && (
                      <td rowSpan={h.rooms.length} style={{ verticalAlign: 'top', paddingTop: 12 }}>
                        <button
                          className="btn btn-s btn-sm"
                          type="button"
                          onClick={() => openEdit(h.id)}
                          disabled={!canWrite}
                          title={!canWrite ? tp('suppliers', 'permEditHotel') : undefined}
                        >
                          ✏
                        </button>
                        <button
                          className="btn btn-s btn-sm"
                          type="button"
                          style={{ marginLeft: 4 }}
                          onClick={() => void handleDelete(h.id)}
                          disabled={!canWrite}
                          title={!canWrite ? tp('suppliers', 'permDeleteHotel') : undefined}
                        >
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
              {!paginatedItems.length && (
                <tr>
                  <td colSpan={14} style={{ padding: 0, border: 'none' }}>
                    <EmptyState
                      className="crm-empty-state--table"
                      size="compact"
                      variant="suppliers"
                      title={tp('suppliers', 'emptyHotels')}
                      description={tp('suppliers', 'emptyHotelsDesc')}
                      action={
                        <button
                          type="button"
                          className="btn btn-p btn-sm"
                          onClick={openAdd}
                          disabled={!canWrite}
                          title={!canWrite ? tp('suppliers', 'permAddHotel') : undefined}
                        >
                          {tp('suppliers', 'addHotel')}
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

      <HotelFormModal
        open={formOpen}
        mode={formMode}
        hotel={editHotel}
        existing={hotels}
        onClose={() => setFormOpen(false)}
        onSave={(hotel) => {
          void handleSave(hotel);
        }}
      />
    </>
  );
}

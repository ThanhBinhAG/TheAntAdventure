'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import HotelFormModal from '@/components/suppliers/HotelFormModal';
import { useStore } from '@/hooks/useStore';
import { filterByRegion, REG_BADGE, supplierMatchesSearch, type SupplierFilters } from '@/lib/supplier-utils';
import type { Hotel } from '@/lib/types';

type Props = {
  filters: SupplierFilters;
};

export default function HotelTab({ filters }: Props) {
  const hotels = useStore((s) => s.hotels);
  const addHotel = useStore((s) => s.addHotel);
  const updateHotel = useStore((s) => s.updateHotel);
  const removeHotel = useStore((s) => s.removeHotel);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return filterByRegion(hotels, filters.region).filter(
      (h) => supplierMatchesSearch(filters.search, [h.name, h.dest, h.cat, h.id])
    );
  }, [hotels, filters]);

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

  const handleDelete = (id: string) => {
    if (confirm('Remove this hotel?')) removeHotel(id);
  };

  const handleSave = (hotel: Hotel) => {
    if (formMode === 'edit' && editId) updateHotel(editId, hotel);
    else addHotel(hotel);
  };

  return (
    <>
      <div className="sup-hotel-bar">
        <div className="info-bar" style={{ margin: 0, flex: 1 }}>
          Showing <b>{filtered.length}</b> of <b>{hotels.length}</b> hotels · MUP = client rate · NET = cost · USD/rm/nt
        </div>
        <Link href="/attractions" className="btn btn-s btn-sm">
          🏛 Attraction Schedule
        </Link>
        <button className="btn btn-p btn-sm" type="button" onClick={openAdd}>
          ＋ Add Hotel
        </button>
      </div>
      <div className="card">
        <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="tbl sup-hotel-tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Hotel</th>
                <th>Destination</th>
                <th>Stars</th>
                <th>Room Type</th>
                <th className="sup-th sup-th-low">Low MUP</th>
                <th className="sup-th sup-th-high">High MUP</th>
                <th className="sup-th sup-th-fest">Festive MUP</th>
                <th className="sup-th sup-th-peak">Peak MUP</th>
                <th className="sup-th sup-th-low sup-th-net">Low NET</th>
                <th className="sup-th sup-th-high sup-th-net">High NET</th>
                <th className="sup-th sup-th-fest sup-th-net">Fest NET</th>
                <th className="sup-th sup-th-peak sup-th-net">Peak NET</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) =>
                h.rooms.map((r, ri) => (
                  <tr key={`${h.id}-${ri}`}>
                    {ri === 0 && (
                      <>
                        <td rowSpan={h.rooms.length} style={{ verticalAlign: 'top', paddingTop: 12 }}>
                          <code style={{ fontSize: 10, color: 'var(--g)' }}>{h.id}</code>
                          <br />
                          <span className="sup-reg-badge">{REG_BADGE[h.region]}</span>
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
                        <button className="btn btn-s btn-sm" type="button" onClick={() => openEdit(h.id)}>
                          ✏
                        </button>
                        <button className="btn btn-s btn-sm" type="button" style={{ marginLeft: 4 }} onClick={() => handleDelete(h.id)}>
                          ✕
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
              {!filtered.length && (
                <tr>
                  <td colSpan={14} style={{ textAlign: 'center', color: 'var(--m)', padding: 24 }}>
                    No hotels found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <HotelFormModal
        open={formOpen}
        mode={formMode}
        hotel={editHotel}
        existing={hotels}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}

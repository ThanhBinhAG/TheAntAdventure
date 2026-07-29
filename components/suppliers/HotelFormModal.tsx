'use client';

import { useState } from 'react';
import { nextSupplierId } from '@/lib/suppliers/supplier-utils';
import type { Hotel, HotelRoom } from '@/lib/types';

const EMPTY_ROOM = (): HotelRoom => ({
  type: '',
  view: '',
  sqm: undefined,
  lm: 0,
  hm: 0,
  fm: 0,
  pm: 0,
  ln: 0,
  hn: 0,
  fn: 0,
  pn: 0,
});

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  hotel?: Hotel | null;
  existing: Hotel[];
  onClose: () => void;
  onSave: (hotel: Hotel) => void;
}

function initialForm(mode: Props['mode'], hotel: Props['hotel'], existing: Hotel[]): Hotel {
  if (mode === 'edit' && hotel) {
    return {
      ...hotel,
      rooms: hotel.rooms.length ? hotel.rooms.map((room) => ({ ...room })) : [EMPTY_ROOM()],
    };
  }
  return {
    id: nextSupplierId('HTL-N-', existing),
    name: '',
    dest: '',
    cat: '',
    stars: '★★★★',
    region: 'north',
    rooms: [EMPTY_ROOM()],
    status: 'Active',
  };
}

export default function HotelFormModal({ open, mode, hotel, existing, onClose, onSave }: Props) {
  const formKey = `${open}-${mode}-${hotel ? JSON.stringify(hotel) : existing.map((item) => item.id).join(',')}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [form, setForm] = useState<Hotel>(() => initialForm(mode, hotel, existing));

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    setForm(initialForm(mode, hotel, existing));
  }

  if (!open) return null;

  function updateRoom(index: number, patch: Partial<HotelRoom>) {
    setForm((f) => ({
      ...f,
      rooms: f.rooms.map((room, i) => (i === index ? { ...room, ...patch } : room)),
    }));
  }

  function addRoom() {
    setForm((f) => ({ ...f, rooms: [...f.rooms, EMPTY_ROOM()] }));
  }

  function removeRoom(index: number) {
    setForm((f) => ({ ...f, rooms: f.rooms.filter((_, i) => i !== index) }));
  }

  function handleSave() {
    if (!form.name.trim() || !form.dest.trim()) {
      alert('Hotel name and destination are required.');
      return;
    }
    const rooms = form.rooms
      .filter((r) => r.type.trim())
      .map((room, i) => ({
        ...room,
        id: room.id || `${form.id}-R${i + 1}`,
        type: room.type.trim(),
      }));
    if (!rooms.length) {
      alert('Add at least one room type.');
      return;
    }
    onSave({ ...form, name: form.name.trim(), dest: form.dest.trim(), rooms });
    onClose();
  }

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal" style={{ width: 900, maxHeight: '92vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green">
          <span style={{ color: '#fff', fontWeight: 700 }}>{mode === 'edit' ? '✏ Edit Hotel' : '＋ Add Hotel'}</span>
          <button className="modal-close-btn" type="button" onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="fg">
              <label className="lbl">Hotel Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="fg">
              <label className="lbl">Destination *</label>
              <input value={form.dest} onChange={(e) => setForm({ ...form, dest: e.target.value })} />
            </div>
            <div className="fg">
              <label className="lbl">Category</label>
              <input value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })} />
            </div>
            <div className="fg">
              <label className="lbl">Stars</label>
              <select value={form.stars} onChange={(e) => setForm({ ...form, stars: e.target.value })}>
                {['★★★', '★★★★', '★★★★★'].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Region</label>
              <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value as Hotel['region'] })}>
                <option value="north">North</option>
                <option value="central">Central</option>
                <option value="south">South</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Status</label>
              <select value={form.status || 'Active'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <b>Room types & rates (USD/rm/nt)</b>
            <button className="btn btn-s btn-sm" type="button" onClick={addRoom}>
              ＋ Add room
            </button>
          </div>

          {form.rooms.map((room, ri) => (
            <div key={ri} className="card" style={{ marginBottom: 10 }}>
              <div className="card-body" style={{ padding: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 80px', gap: 8, marginBottom: 8 }}>
                  <input placeholder="Room type *" value={room.type} onChange={(e) => updateRoom(ri, { type: e.target.value })} />
                  <input placeholder="View" value={room.view || ''} onChange={(e) => updateRoom(ri, { view: e.target.value })} />
                  <input placeholder="sqm" type="number" value={room.sqm ?? ''} onChange={(e) => updateRoom(ri, { sqm: e.target.value ? +e.target.value : undefined })} />
                  <button className="btn btn-s btn-sm" type="button" onClick={() => removeRoom(ri)} disabled={form.rooms.length <= 1}>
                    ✕
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 11 }}>
                  {(
                    [
                      ['lm', 'Low MUP'],
                      ['hm', 'High MUP'],
                      ['fm', 'Fest MUP'],
                      ['pm', 'Peak MUP'],
                      ['ln', 'Low NET'],
                      ['hn', 'High NET'],
                      ['fn', 'Fest NET'],
                      ['pn', 'Peak NET'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="fg" style={{ margin: 0 }}>
                      <label className="lbl" style={{ fontSize: 10 }}>
                        {label}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={room[key]}
                        onChange={(e) => updateRoom(ri, { [key]: +e.target.value || 0 })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button className="btn btn-s" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-p" type="button" onClick={handleSave}>
              Save Hotel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

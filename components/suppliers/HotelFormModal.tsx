'use client';

import { useMemo, useState } from 'react';
import { nextSupplierId } from '@/lib/suppliers/supplier-utils';
import { normalizeHotelTier, SUGGESTED_HOTEL_TIERS } from '@/lib/suppliers/hotel-tiers';
import type { Hotel, HotelRoom } from '@/lib/types';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

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

const RATE_COLUMNS = [
  { key: 'lm', labelKey: 'rateLowMup' as const, thClass: 'sup-th-low', tdClass: 'sup-td-low' },
  { key: 'hm', labelKey: 'rateHighMup' as const, thClass: 'sup-th-high', tdClass: 'sup-td-high' },
  { key: 'fm', labelKey: 'rateFestMup' as const, thClass: 'sup-th-fest', tdClass: 'sup-td-fest' },
  { key: 'pm', labelKey: 'ratePeakMup' as const, thClass: 'sup-th-peak', tdClass: 'sup-td-peak' },
  { key: 'ln', labelKey: 'rateLowNet' as const, thClass: 'sup-th-low sup-th-net', tdClass: 'sup-td-low sup-td-net' },
  { key: 'hn', labelKey: 'rateHighNet' as const, thClass: 'sup-th-high sup-th-net', tdClass: 'sup-td-high sup-td-net' },
  { key: 'fn', labelKey: 'rateFestNet' as const, thClass: 'sup-th-fest sup-th-net', tdClass: 'sup-td-fest sup-td-net' },
  { key: 'pn', labelKey: 'ratePeakNet' as const, thClass: 'sup-th-peak sup-th-net', tdClass: 'sup-td-peak sup-td-net' },
] as const;

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  hotel?: Hotel | null;
  existing: Hotel[];
  onClose: () => void;
  onSave: (hotel: Hotel) => boolean | Promise<boolean>;
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
    stars: '4★',
    region: 'north',
    rooms: [EMPTY_ROOM()],
    status: 'Active',
  };
}

export default function HotelFormModal({ open, mode, hotel, existing, onClose, onSave }: Props) {
  const formKey = `${open}-${mode}-${hotel ? JSON.stringify(hotel) : existing.map((item) => item.id).join(',')}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [form, setForm] = useState<Hotel>(() => initialForm(mode, hotel, existing));
  const [formError, setFormError] = useState<string | null>(null);

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    setForm(initialForm(mode, hotel, existing));
    setFormError(null);
  }

  const { tp, tc, language } = useLanguage();
  const baselineForm = useMemo(() => initialForm(mode, hotel, existing), [formKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useFormDirty(open, baselineForm, form, undefined, formKey);
  const { requestClose } = useConfirmClose({ open, dirty, onClose, language });
  const hotelTierChoice = SUGGESTED_HOTEL_TIERS.includes(form.stars) ? form.stars : '__custom';

  if (!open) return null;

  function updateRoom(index: number, patch: Partial<HotelRoom>) {
    setFormError(null);
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

  async function handleSave() {
    if (!form.name.trim() || !form.dest.trim()) {
      setFormError(tp('suppliers', 'errorHotelRequired'));
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
      setFormError(tp('suppliers', 'errorRoomRequired'));
      return;
    }
    const saved = await onSave({ ...form, name: form.name.trim(), dest: form.dest.trim(), stars: normalizeHotelTier(form.stars), rooms });
    if (saved) onClose();
  }

  return (
    <div className="overlay open" onClick={() => void requestClose()}>
      <div className="modal nc-modal" style={{ width: 900, maxWidth: '96vw' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green nc-modal-hd">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
              {mode === 'edit' ? tp('suppliers', 'editHotel') : tp('suppliers', 'addHotelModal')}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>
              {tp('suppliers', 'hotelModalSub')}
            </div>
          </div>
          <button className="modal-close-btn" type="button" onClick={() => void requestClose()}>
            ✕
          </button>
        </div>

        <div className="nc-modal-body">
          <div className="nc-section-title">{tp('suppliers', 'sectionProperty')}</div>
          <div className="nc-grid-2" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblHotelName')}</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblDestination')}</label>
              <input value={form.dest} onChange={(e) => setForm({ ...form, dest: e.target.value })} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblCategory')}</label>
              <input value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })} placeholder="e.g. Boutique" />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblStars')}</label>
              <select
                value={hotelTierChoice}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  stars: event.target.value === '__custom' ? '' : event.target.value,
                }))}
              >
                {SUGGESTED_HOTEL_TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                <option value="__custom">Custom tier…</option>
              </select>
              {hotelTierChoice === '__custom' && (
                <input
                  value={form.stars}
                  onChange={(event) => setForm({ ...form, stars: event.target.value })}
                  placeholder="e.g. Eco Lodge 3★"
                  style={{ marginTop: 7 }}
                />
              )}
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblRegion')}</label>
              <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value as Hotel['region'] })}>
                <option value="north">{tp('suppliers', 'regionNorth')}</option>
                <option value="central">{tp('suppliers', 'regionCentral')}</option>
                <option value="south">{tp('suppliers', 'regionSouth')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblStatus')}</label>
              <select value={form.status || 'Active'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="Active">{tp('suppliers', 'statusActive')}</option>
                <option value="Inactive">{tp('suppliers', 'statusInactive')}</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div className="sup-form-section" style={{ margin: 0 }}>
              {tp('suppliers', 'sectionRoomRates')}
            </div>
            <button className="btn btn-s btn-sm" type="button" onClick={addRoom}>
              {tp('suppliers', 'addRoom')}
            </button>
          </div>
          <p className="nc-form-hint">{tp('suppliers', 'roomRatesHint')}</p>

          {form.rooms.map((room, ri) => (
            <div key={ri} className="nc-form-card" style={{ padding: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 80px 40px', gap: 8, marginBottom: 10 }}>
                <input placeholder={tp('suppliers', 'roomTypePlaceholder')} value={room.type} onChange={(e) => updateRoom(ri, { type: e.target.value })} />
                <input placeholder={tp('suppliers', 'viewPlaceholder')} value={room.view || ''} onChange={(e) => updateRoom(ri, { view: e.target.value })} />
                <input
                  placeholder={tp('suppliers', 'sqmPlaceholder')}
                  type="number"
                  value={room.sqm ?? ''}
                  onChange={(e) => updateRoom(ri, { sqm: e.target.value ? +e.target.value : undefined })}
                />
                <button className="btn btn-s btn-sm" type="button" onClick={() => removeRoom(ri)} disabled={form.rooms.length <= 1}>
                  ✕
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {RATE_COLUMNS.map((col) => (
                  <div key={col.key} className="fg" style={{ margin: 0 }}>
                    <label className={`lbl sup-th ${col.thClass}`} style={{ fontSize: 10, display: 'block', padding: '4px 6px', borderRadius: 4 }}>
                      {tp('suppliers', col.labelKey)}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className={col.tdClass}
                      value={room[col.key as keyof HotelRoom] as number}
                      onChange={(e) => updateRoom(ri, { [col.key]: +e.target.value || 0 })}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="nc-modal-ft">
          {formError ? (
            <div className="nc-form-error" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="nc-modal-ft-actions">
            <button className="btn btn-s" type="button" onClick={() => void requestClose()}>
              {tc('cancel')}
            </button>
            <button className="btn btn-p" type="button" onClick={handleSave}>
              {tp('suppliers', 'saveHotel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

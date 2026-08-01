'use client';

import { useState } from 'react';
import { nextSupplierId } from '@/lib/suppliers/supplier-utils';
import type { CruiseSupplier, RestaurantSupplier, TransportSupplier } from '@/lib/types';
import { toast } from '@/lib/toast';

export type QuickListKind = 'transport' | 'restaurant' | 'cruise';

type QuickRow = TransportSupplier | RestaurantSupplier | CruiseSupplier;

const CONFIG: Record<
  QuickListKind,
  { title: string; idPrefix: string; fields: { key: string; label: string; placeholder?: string; type?: string }[] }
> = {
  transport: {
    title: 'Transport',
    idPrefix: 'SUP-T-',
    fields: [
      { key: 'name', label: 'Company *', placeholder: 'Hanoi Luxury Transfer' },
      { key: 'region', label: 'Region', placeholder: 'North' },
      { key: 'vehicles', label: 'Vehicles', placeholder: '4-seat, 7-seat' },
      { key: 'rate', label: 'Day Rate', placeholder: '$55–$120/day' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  restaurant: {
    title: 'Restaurant',
    idPrefix: 'SUP-R-',
    fields: [
      { key: 'name', label: 'Restaurant *', placeholder: 'Cha Ca La Vong' },
      { key: 'city', label: 'City', placeholder: 'Hanoi' },
      { key: 'cuisine', label: 'Cuisine', placeholder: 'Vietnamese Traditional' },
      { key: 'set', label: 'Set Menu From', placeholder: '$18/pax' },
      { key: 'cap', label: 'Capacity', type: 'number' },
      { key: 'rating', label: 'Rating', placeholder: '★★★★' },
      { key: 'notes', label: 'Notes' },
    ],
  },
  cruise: {
    title: 'Cruise',
    idPrefix: 'SUP-C-',
    fields: [
      { key: 'name', label: 'Cruise *', placeholder: 'Bhaya Cruise Halong' },
      { key: 'route', label: 'Route', placeholder: 'Halong Bay 2N3D' },
      { key: 'cabins', label: 'Cabin Types', placeholder: 'Deluxe / Suite' },
      { key: 'rate', label: 'Rate', placeholder: '$165–$280/cabin/night' },
      { key: 'valid', label: 'Validity', placeholder: 'Dec 2026' },
      { key: 'rating', label: 'Rating', placeholder: '★★★★★' },
      { key: 'notes', label: 'Notes' },
    ],
  },
};

interface Props {
  open: boolean;
  kind: QuickListKind;
  mode: 'add' | 'edit';
  row?: QuickRow | null;
  existing: QuickRow[];
  onClose: () => void;
  onSave: (row: QuickRow) => void;
}

function initialForm(mode: Props['mode'], row: Props['row'], cfg: (typeof CONFIG)[QuickListKind], existing: QuickRow[]) {
  if (mode === 'edit' && row) {
    const next: Record<string, string> = { id: row.id };
    for (const field of cfg.fields) {
      const value = (row as unknown as Record<string, unknown>)[field.key];
      next[field.key] = value != null ? String(value) : '';
    }
    return next;
  }
  return {
    id: nextSupplierId(cfg.idPrefix, existing),
    ...Object.fromEntries(cfg.fields.map((field) => [field.key, ''])),
  };
}

export default function QuickListFormModal({ open, kind, mode, row, existing, onClose, onSave }: Props) {
  const cfg = CONFIG[kind];
  const formKey = `${open}-${kind}-${mode}-${row ? JSON.stringify(row) : existing.map((item) => item.id).join(',')}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [form, setForm] = useState<Record<string, string>>(() => initialForm(mode, row, cfg, existing));

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    setForm(initialForm(mode, row, cfg, existing));
  }

  if (!open) return null;

  function handleSave() {
    if (!form.name?.trim()) {
      toast.warning('Name is required.');
      return;
    }
    const saved: Record<string, unknown> = { id: form.id };
    for (const f of cfg.fields) {
      const raw = form[f.key] ?? '';
      saved[f.key] = f.type === 'number' ? (raw ? Number(raw) : undefined) : raw.trim();
    }
    onSave(saved as unknown as QuickRow);
    onClose();
  }

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal" style={{ width: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green">
          <span style={{ color: '#fff', fontWeight: 700 }}>
            {mode === 'edit' ? `✏ Edit ${cfg.title}` : `＋ Add ${cfg.title}`}
          </span>
          <button className="modal-close-btn" type="button" onClick={onClose}>
            ✕
          </button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cfg.fields.map((f) => (
            <div className="fg" key={f.key}>
              <label className="lbl">{f.label}</label>
              <input
                type={f.type || 'text'}
                value={form[f.key] ?? ''}
                placeholder={f.placeholder}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-s" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-p" type="button" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

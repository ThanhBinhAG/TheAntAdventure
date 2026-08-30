'use client';

import { useState } from 'react';
import { nextSupplierId } from '@/lib/suppliers/supplier-utils';
import type { CruiseSupplier, RestaurantSupplier, TransportSupplier } from '@/lib/types';

export type QuickListKind = 'transport' | 'restaurant' | 'cruise';

type QuickRow = TransportSupplier | RestaurantSupplier | CruiseSupplier;

type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  type?: string;
  fullWidth?: boolean;
};

const CONFIG: Record<
  QuickListKind,
  { title: string; idPrefix: string; fields: FieldDef[] }
> = {
  transport: {
    title: 'Transport',
    idPrefix: 'SUP-T-',
    fields: [
      { key: 'name', label: 'Company *', placeholder: 'Hanoi Luxury Transfer' },
      { key: 'region', label: 'Region', placeholder: 'North' },
      { key: 'vehicles', label: 'Vehicles', placeholder: '4-seat, 7-seat' },
      { key: 'rate', label: 'Day Rate', placeholder: '$55–$120/day' },
      { key: 'notes', label: 'Notes', fullWidth: true },
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
      { key: 'notes', label: 'Notes', fullWidth: true },
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
      { key: 'notes', label: 'Notes', fullWidth: true },
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
  const [formError, setFormError] = useState<string | null>(null);

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    setForm(initialForm(mode, row, cfg, existing));
    setFormError(null);
  }

  if (!open) return null;

  const gridFields = cfg.fields.filter((f) => !f.fullWidth);
  const fullFields = cfg.fields.filter((f) => f.fullWidth);

  function handleSave() {
    if (!form.name?.trim()) {
      setFormError('Name is required.');
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
      <div className="modal nc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green nc-modal-hd">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
              {mode === 'edit' ? `Edit ${cfg.title}` : `Add ${cfg.title}`}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>
              Partner catalog entry for quotations and operations
            </div>
          </div>
          <button className="modal-close-btn" type="button" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="nc-modal-body">
          <div className="nc-section-title">Details</div>
          <div className="nc-grid-2">
            {gridFields.map((f) => (
              <div className="fg" key={f.key}>
                <label className="lbl">{f.label}</label>
                <input
                  type={f.type || 'text'}
                  value={form[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) => {
                    setFormError(null);
                    setForm((prev) => ({ ...prev, [f.key]: e.target.value }));
                  }}
                />
              </div>
            ))}
          </div>
          {fullFields.map((f) => (
            <div className="fg" key={f.key} style={{ marginTop: 12 }}>
              <label className="lbl">{f.label}</label>
              <textarea
                value={form[f.key] ?? ''}
                placeholder={f.placeholder}
                style={{ minHeight: 72 }}
                onChange={(e) => {
                  setFormError(null);
                  setForm((prev) => ({ ...prev, [f.key]: e.target.value }));
                }}
              />
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

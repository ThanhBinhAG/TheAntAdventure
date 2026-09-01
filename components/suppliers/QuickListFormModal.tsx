'use client';

import { useMemo, useState } from 'react';
import { nextSupplierId } from '@/lib/suppliers/supplier-utils';
import type { CruiseSupplier, RestaurantSupplier, TransportSupplier } from '@/lib/types';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';
import type { SUPPLIERSKey } from '@/lib/i18n/pages/suppliers';

export type QuickListKind = 'transport' | 'restaurant' | 'cruise';

type QuickRow = TransportSupplier | RestaurantSupplier | CruiseSupplier;

type FieldDef = {
  key: string;
  labelKey: SUPPLIERSKey;
  placeholder?: string;
  type?: string;
  fullWidth?: boolean;
};

const CONFIG: Record<
  QuickListKind,
  { titleKey: SUPPLIERSKey; idPrefix: string; fields: FieldDef[] }
> = {
  transport: {
    titleKey: 'titleTransport',
    idPrefix: 'SUP-T-',
    fields: [
      { key: 'name', labelKey: 'fieldCompany', placeholder: 'Hanoi Luxury Transfer' },
      { key: 'region', labelKey: 'fieldRegion', placeholder: 'North' },
      { key: 'vehicles', labelKey: 'fieldVehicles', placeholder: '4-seat, 7-seat' },
      { key: 'rate', labelKey: 'fieldDayRate', placeholder: '$55–$120/day' },
      { key: 'notes', labelKey: 'fieldNotes', fullWidth: true },
    ],
  },
  restaurant: {
    titleKey: 'titleRestaurant',
    idPrefix: 'SUP-R-',
    fields: [
      { key: 'name', labelKey: 'fieldRestaurant', placeholder: 'Cha Ca La Vong' },
      { key: 'city', labelKey: 'fieldCity', placeholder: 'Hanoi' },
      { key: 'cuisine', labelKey: 'fieldCuisine', placeholder: 'Vietnamese Traditional' },
      { key: 'set', labelKey: 'fieldSetMenu', placeholder: '$18/pax' },
      { key: 'cap', labelKey: 'fieldCapacity', type: 'number' },
      { key: 'rating', labelKey: 'fieldRating', placeholder: '★★★★' },
      { key: 'notes', labelKey: 'fieldNotes', fullWidth: true },
    ],
  },
  cruise: {
    titleKey: 'titleCruise',
    idPrefix: 'SUP-C-',
    fields: [
      { key: 'name', labelKey: 'fieldCruise', placeholder: 'Bhaya Cruise Halong' },
      { key: 'route', labelKey: 'fieldRoute', placeholder: 'Halong Bay 2N3D' },
      { key: 'cabins', labelKey: 'fieldCabins', placeholder: 'Deluxe / Suite' },
      { key: 'rate', labelKey: 'fieldRate', placeholder: '$165–$280/cabin/night' },
      { key: 'valid', labelKey: 'fieldValidity', placeholder: 'Dec 2026' },
      { key: 'rating', labelKey: 'fieldRating', placeholder: '★★★★★' },
      { key: 'notes', labelKey: 'fieldNotes', fullWidth: true },
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

  const { tp, tpl, tc, language } = useLanguage();
  const baselineForm = useMemo(() => initialForm(mode, row, cfg, existing), [formKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useFormDirty(open, baselineForm, form, undefined, formKey);
  const { requestClose } = useConfirmClose({ open, dirty, onClose, language });

  if (!open) return null;

  const gridFields = cfg.fields.filter((f) => !f.fullWidth);
  const fullFields = cfg.fields.filter((f) => f.fullWidth);

  function handleSave() {
    if (!form.name?.trim()) {
      setFormError(tp('suppliers', 'errorNameRequired'));
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
    <div className="overlay open" onClick={() => void requestClose()}>
      <div className="modal nc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green nc-modal-hd">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
              {mode === 'edit'
                ? tpl('suppliers', 'editPartner', { kind: tp('suppliers', cfg.titleKey) })
                : tpl('suppliers', 'addPartnerModal', { kind: tp('suppliers', cfg.titleKey) })}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>
              {tp('suppliers', 'quickModalSub')}
            </div>
          </div>
          <button className="modal-close-btn" type="button" onClick={() => void requestClose()}>
            ✕
          </button>
        </div>

        <div className="nc-modal-body">
          <div className="nc-section-title">{tp('suppliers', 'sectionDetails')}</div>
          <div className="nc-grid-2">
            {gridFields.map((f) => (
              <div className="fg" key={f.key}>
                <label className="lbl">{tp('suppliers', f.labelKey)}</label>
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
              <label className="lbl">{tp('suppliers', f.labelKey)}</label>
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
            <button className="btn btn-s" type="button" onClick={() => void requestClose()}>
              {tc('cancel')}
            </button>
            <button className="btn btn-p" type="button" onClick={handleSave}>
              {tc('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

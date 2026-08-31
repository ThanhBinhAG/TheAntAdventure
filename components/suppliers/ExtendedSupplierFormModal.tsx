'use client';

import { useMemo, useState } from 'react';
import {
  EXTENDED_CATEGORY_OPTIONS,
  EXTENDED_TAG_OPTIONS,
  emptyExtendedSupplier,
  nextSupplierId,
} from '@/lib/suppliers/supplier-utils';
import type { ExtendedSupplier } from '@/lib/types';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  supplier?: ExtendedSupplier | null;
  defaultCat?: string;
  existing: ExtendedSupplier[];
  onClose: () => void;
  onSave: (supplier: ExtendedSupplier) => void;
}

function prefixForCat(cat: string): string {
  const map: Record<string, string> = {
    visa: 'LOG-V',
    fasttrack: 'LOG-FT',
    aviation: 'LOG-AV',
    river: 'WAT',
    coastal: 'WAT',
    park: 'WAT',
    cycling: 'ADV-C',
    trekking: 'ADV-T',
    wildlife: 'ADV-W',
    artisan: 'EXP-A',
    wellness: 'EXP-W',
    events: 'EXP-E',
    specguide: 'PER-G',
    media: 'PER-M',
    safety: 'PER-S',
  };
  return map[cat] ?? 'SUP-X';
}

function initialForm(
  mode: Props['mode'],
  supplier: Props['supplier'],
  defaultCat: string | undefined,
  existing: ExtendedSupplier[]
): ExtendedSupplier {
  if (mode === 'edit' && supplier) {
    return { ...supplier, tags: [...(supplier.tags || [])] };
  }
  const cat = defaultCat || 'visa';
  return {
    ...emptyExtendedSupplier(cat),
    id: nextSupplierId(`${prefixForCat(cat)}-`, existing),
  };
}

export default function ExtendedSupplierFormModal({
  open,
  mode,
  supplier,
  defaultCat,
  existing,
  onClose,
  onSave,
}: Props) {
  const formKey = `${open}-${mode}-${supplier ? JSON.stringify(supplier) : `${defaultCat}-${existing.map((item) => item.id).join(',')}`}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [form, setForm] = useState<ExtendedSupplier>(() => initialForm(mode, supplier, defaultCat, existing));
  const [formError, setFormError] = useState<string | null>(null);

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    setForm(initialForm(mode, supplier, defaultCat, existing));
    setFormError(null);
  }

  const { language } = useLanguage();
  const baselineForm = useMemo(
    () => initialForm(mode, supplier, defaultCat, existing),
    [formKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dirty = useFormDirty(open, baselineForm, form, undefined, formKey);
  const { requestClose } = useConfirmClose({ open, dirty, onClose, language });

  if (!open) return null;

  function setField<K extends keyof ExtendedSupplier>(key: K, value: ExtendedSupplier[K]) {
    setFormError(null);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTag(tag: string) {
    setForm((f) => {
      const tags = f.tags || [];
      return {
        ...f,
        tags: tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag],
      };
    });
  }

  function handleSave() {
    if (!form.name.trim() || !form.phone?.trim() || !form.desc?.trim()) {
      setFormError('Name, phone, and description are required.');
      return;
    }
    onSave({
      ...form,
      name: form.name.trim(),
      ename: (form.ename || form.name).trim(),
      phone: form.phone?.trim(),
      email: form.email?.trim(),
      location: form.location?.trim(),
      rate: form.rate?.trim(),
      desc: form.desc?.trim(),
      notes: form.notes?.trim(),
      subcat: form.subcat?.trim() || form.cat,
      contact: form.contact?.trim(),
      payment: form.payment?.trim(),
      cancel: form.cancel?.trim(),
      insurance: form.insurance?.trim(),
      avail: form.avail?.trim(),
    });
    onClose();
  }

  return (
    <div className="overlay open" onClick={() => void requestClose()}>
      <div className="modal nc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green nc-modal-hd">
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>
              {mode === 'edit' ? 'Edit Supplier' : 'Add Supplier'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>
              Extended partner catalog — logistics, experiences, personnel
            </div>
          </div>
          <button className="modal-close-btn" type="button" onClick={() => void requestClose()}>
            ✕
          </button>
        </div>

        <div className="nc-modal-body">
          <div className="nc-section-title">Classification</div>
          <div className="nc-grid-2" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">Category *</label>
              <select value={form.cat} onChange={(e) => setField('cat', e.target.value)} disabled={mode === 'edit'}>
                {EXTENDED_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Sub-category</label>
              <input
                placeholder="e.g. FR Specialist Guide"
                value={form.subcat || ''}
                onChange={(e) => setField('subcat', e.target.value)}
              />
            </div>
          </div>

          <div className="nc-section-title">Contact</div>
          <div className="nc-grid-2" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">Supplier Name *</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">English Name</label>
              <input value={form.ename || ''} onChange={(e) => setField('ename', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Contact Person</label>
              <input value={form.contact || ''} onChange={(e) => setField('contact', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Phone *</label>
              <input value={form.phone || ''} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Email</label>
              <input value={form.email || ''} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Location</label>
              <input value={form.location || ''} onChange={(e) => setField('location', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Region</label>
              <select value={form.region || 'national'} onChange={(e) => setField('region', e.target.value)}>
                <option value="national">Nationwide</option>
                <option value="north">North</option>
                <option value="central">Central</option>
                <option value="south">South</option>
              </select>
            </div>
          </div>

          <div className="nc-section-title">Commercial</div>
          <div className="nc-grid-2" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">Rate / Pricing</label>
              <input
                placeholder="$45/application · $120 urgent"
                value={form.rate || ''}
                onChange={(e) => setField('rate', e.target.value)}
              />
            </div>
            <div className="fg">
              <label className="lbl">Currency</label>
              <select value={form.currency || 'USD'} onChange={(e) => setField('currency', e.target.value)}>
                {['USD', 'EUR', 'VND'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Payment Terms</label>
              <input
                value={form.payment || ''}
                onChange={(e) => setField('payment', e.target.value)}
                placeholder="100% upfront"
              />
            </div>
            <div className="fg">
              <label className="lbl">Contract</label>
              <select value={form.contract || 'verbal'} onChange={(e) => setField('contract', e.target.value)}>
                <option value="verbal">Verbal agreement</option>
                <option value="yes">Signed contract</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Cancellation Policy</label>
              <input value={form.cancel || ''} onChange={(e) => setField('cancel', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Insurance / Licence</label>
              <input value={form.insurance || ''} onChange={(e) => setField('insurance', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Availability</label>
              <input value={form.avail || ''} onChange={(e) => setField('avail', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Rating</label>
              <select value={form.rating || '★★★★'} onChange={(e) => setField('rating', e.target.value)}>
                {['★★★', '★★★★', '★★★★★'].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Status</label>
              <select value={form.status || 'Active'} onChange={(e) => setField('status', e.target.value)}>
                <option value="Active">Active</option>
                <option value="Standby">Standby</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="nc-section-title">Description</div>
          <div className="fg" style={{ marginBottom: 12 }}>
            <label className="lbl">Description *</label>
            <textarea style={{ minHeight: 80 }} value={form.desc || ''} onChange={(e) => setField('desc', e.target.value)} />
          </div>

          <div className="nc-section-title">Tags</div>
          <div className="fg" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EXTENDED_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`sup-tag${(form.tags || []).includes(tag) ? ' tag-on' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="nc-section-title">Notes</div>
          <div className="fg">
            <label className="lbl">Internal Notes</label>
            <textarea style={{ minHeight: 50 }} value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} />
          </div>
        </div>

        <div className="nc-modal-ft">
          {formError ? (
            <div className="nc-form-error" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="nc-modal-ft-actions">
            <button className="btn btn-s" type="button" onClick={() => void requestClose()}>
              Cancel
            </button>
            <button className="btn btn-p" type="button" onClick={handleSave}>
              Save Supplier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

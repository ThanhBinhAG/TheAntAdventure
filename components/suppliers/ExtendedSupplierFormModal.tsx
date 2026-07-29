'use client';

import { useEffect, useState } from 'react';
import {
  EXTENDED_CATEGORY_OPTIONS,
  EXTENDED_TAG_OPTIONS,
  emptyExtendedSupplier,
  nextSupplierId,
} from '@/lib/suppliers/supplier-utils';
import type { ExtendedSupplier } from '@/lib/types';

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

export default function ExtendedSupplierFormModal({
  open,
  mode,
  supplier,
  defaultCat,
  existing,
  onClose,
  onSave,
}: Props) {
  const [form, setForm] = useState<ExtendedSupplier>(emptyExtendedSupplier());

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && supplier) {
      setForm({ ...supplier, tags: [...(supplier.tags || [])] });
    } else {
      const cat = defaultCat || 'visa';
      setForm({
        ...emptyExtendedSupplier(cat),
        id: nextSupplierId(`${prefixForCat(cat)}-`, existing),
      });
    }
  }, [open, mode, supplier, defaultCat, existing]);

  if (!open) return null;

  function setField<K extends keyof ExtendedSupplier>(key: K, value: ExtendedSupplier[K]) {
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
      alert('Name, phone, and description are required.');
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
    <div className="overlay open" onClick={onClose}>
      <div className="modal sup-add-modal" style={{ width: 640, maxHeight: '92vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green">
          <span style={{ color: '#fff', fontWeight: 700 }}>{mode === 'edit' ? '✏ Edit Supplier' : '＋ Add New Supplier'}</span>
          <button className="modal-close-btn" type="button" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body" style={{ padding: 20 }}>
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
            <input placeholder="e.g. FR Specialist Guide" value={form.subcat || ''} onChange={(e) => setField('subcat', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="fg">
              <label className="lbl">Supplier Name *</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">English Name</label>
              <input value={form.ename || ''} onChange={(e) => setField('ename', e.target.value)} />
            </div>
          </div>
          <div className="fg">
            <label className="lbl">Contact Person</label>
            <input value={form.contact || ''} onChange={(e) => setField('contact', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="fg">
              <label className="lbl">Phone *</label>
              <input value={form.phone || ''} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Email</label>
              <input value={form.email || ''} onChange={(e) => setField('email', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="fg">
              <label className="lbl">Rate / Pricing</label>
              <input placeholder="$45/application · $120 urgent" value={form.rate || ''} onChange={(e) => setField('rate', e.target.value)} />
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
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="fg">
              <label className="lbl">Payment Terms</label>
              <input value={form.payment || ''} onChange={(e) => setField('payment', e.target.value)} placeholder="100% upfront" />
            </div>
            <div className="fg">
              <label className="lbl">Contract</label>
              <select value={form.contract || 'verbal'} onChange={(e) => setField('contract', e.target.value)}>
                <option value="verbal">Verbal agreement</option>
                <option value="yes">Signed contract</option>
              </select>
            </div>
          </div>
          <div className="fg">
            <label className="lbl">Cancellation Policy</label>
            <input value={form.cancel || ''} onChange={(e) => setField('cancel', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="fg">
              <label className="lbl">Insurance / Licence</label>
              <input value={form.insurance || ''} onChange={(e) => setField('insurance', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">Availability</label>
              <input value={form.avail || ''} onChange={(e) => setField('avail', e.target.value)} />
            </div>
          </div>
          <div className="fg">
            <label className="lbl">Description *</label>
            <textarea style={{ minHeight: 80 }} value={form.desc || ''} onChange={(e) => setField('desc', e.target.value)} />
          </div>
          <div className="fg">
            <label className="lbl">Internal Notes</label>
            <textarea style={{ minHeight: 50 }} value={form.notes || ''} onChange={(e) => setField('notes', e.target.value)} />
          </div>
          <div className="fg">
            <label className="lbl">Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EXTENDED_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`csf-btn${(form.tags || []).includes(tag) ? ' on' : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button className="btn btn-s" type="button" onClick={onClose}>
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

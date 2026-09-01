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
import type { SUPPLIERSKey } from '@/lib/i18n/pages/suppliers';

const CAT_I18N: Record<string, SUPPLIERSKey> = {
  visa: 'catVisa',
  fasttrack: 'catFasttrack',
  aviation: 'catAviation',
  river: 'catRiver',
  coastal: 'catCoastal',
  park: 'catPark',
  cycling: 'catCycling',
  trekking: 'catTrekking',
  wildlife: 'catWildlife',
  artisan: 'catArtisan',
  wellness: 'catWellness',
  events: 'catEvents',
  specguide: 'catSpecguide',
  media: 'catMedia',
  safety: 'catSafety',
};

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

  const { tp, tc, language } = useLanguage();
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
      setFormError(tp('suppliers', 'errorSupplierRequired'));
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
              {mode === 'edit' ? tp('suppliers', 'editSupplier') : tp('suppliers', 'addSupplier')}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginTop: 1 }}>
              {tp('suppliers', 'extendedModalSub')}
            </div>
          </div>
          <button className="modal-close-btn" type="button" onClick={() => void requestClose()}>
            ✕
          </button>
        </div>

        <div className="nc-modal-body">
          <div className="nc-section-title">{tp('suppliers', 'sectionClassification')}</div>
          <div className="nc-grid-2" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblCategoryRequired')}</label>
              <select value={form.cat} onChange={(e) => setField('cat', e.target.value)} disabled={mode === 'edit'}>
                {EXTENDED_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {tp('suppliers', CAT_I18N[opt.value] ?? 'catVisa')}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblSubCategory')}</label>
              <input
                placeholder={tp('suppliers', 'subCategoryPlaceholder')}
                value={form.subcat || ''}
                onChange={(e) => setField('subcat', e.target.value)}
              />
            </div>
          </div>

          <div className="nc-section-title">{tp('suppliers', 'sectionContact')}</div>
          <div className="nc-grid-2" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblSupplierName')}</label>
              <input value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblEnglishName')}</label>
              <input value={form.ename || ''} onChange={(e) => setField('ename', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblContactPerson')}</label>
              <input value={form.contact || ''} onChange={(e) => setField('contact', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblPhone')}</label>
              <input value={form.phone || ''} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblEmail')}</label>
              <input value={form.email || ''} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblLocation')}</label>
              <input value={form.location || ''} onChange={(e) => setField('location', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblRegion')}</label>
              <select value={form.region || 'national'} onChange={(e) => setField('region', e.target.value)}>
                <option value="national">{tp('suppliers', 'regionNationwide')}</option>
                <option value="north">{tp('suppliers', 'regionNorth')}</option>
                <option value="central">{tp('suppliers', 'regionCentral')}</option>
                <option value="south">{tp('suppliers', 'regionSouth')}</option>
              </select>
            </div>
          </div>

          <div className="nc-section-title">{tp('suppliers', 'sectionCommercial')}</div>
          <div className="nc-grid-2" style={{ marginBottom: 16 }}>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblRatePricing')}</label>
              <input
                placeholder={tp('suppliers', 'ratePlaceholder')}
                value={form.rate || ''}
                onChange={(e) => setField('rate', e.target.value)}
              />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblCurrency')}</label>
              <select value={form.currency || 'USD'} onChange={(e) => setField('currency', e.target.value)}>
                {['USD', 'EUR', 'VND'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblPaymentTerms')}</label>
              <input
                value={form.payment || ''}
                onChange={(e) => setField('payment', e.target.value)}
                placeholder={tp('suppliers', 'paymentPlaceholder')}
              />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblContract')}</label>
              <select value={form.contract || 'verbal'} onChange={(e) => setField('contract', e.target.value)}>
                <option value="verbal">{tp('suppliers', 'contractVerbal')}</option>
                <option value="yes">{tp('suppliers', 'contractSigned')}</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblCancellation')}</label>
              <input value={form.cancel || ''} onChange={(e) => setField('cancel', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblInsurance')}</label>
              <input value={form.insurance || ''} onChange={(e) => setField('insurance', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblAvailability')}</label>
              <input value={form.avail || ''} onChange={(e) => setField('avail', e.target.value)} />
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblRating')}</label>
              <select value={form.rating || '★★★★'} onChange={(e) => setField('rating', e.target.value)}>
                {['★★★', '★★★★', '★★★★★'].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label className="lbl">{tp('suppliers', 'lblStatus')}</label>
              <select value={form.status || 'Active'} onChange={(e) => setField('status', e.target.value)}>
                <option value="Active">{tp('suppliers', 'statusActive')}</option>
                <option value="Standby">{tp('suppliers', 'statusStandby')}</option>
                <option value="Inactive">{tp('suppliers', 'statusInactive')}</option>
              </select>
            </div>
          </div>

          <div className="nc-section-title">{tp('suppliers', 'sectionDescription')}</div>
          <div className="fg" style={{ marginBottom: 12 }}>
            <label className="lbl">{tp('suppliers', 'lblDescription')}</label>
            <textarea style={{ minHeight: 80 }} value={form.desc || ''} onChange={(e) => setField('desc', e.target.value)} />
          </div>

          <div className="nc-section-title">{tp('suppliers', 'sectionTags')}</div>
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

          <div className="nc-section-title">{tp('suppliers', 'sectionNotesInternal')}</div>
          <div className="fg">
            <label className="lbl">{tp('suppliers', 'lblInternalNotes')}</label>
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
              {tc('cancel')}
            </button>
            <button className="btn btn-p" type="button" onClick={handleSave}>
              {tp('suppliers', 'saveSupplier')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { fmt } from '@/lib/constants';
import {
  ICO_EMOJIS,
  ICO_KEYS,
} from '@/lib/pricing/pricing-utils';
import type { ProductPricing, ProductPricingInclusions } from '@/lib/types';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

interface PricingEditModalProps {
  open: boolean;
  productCode: string;
  productName: string;
  pricing: ProductPricing | null;
  onClose: () => void;
  onSave: (row: ProductPricing) => void;
}

const PAX_COLS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
const DEFAULT_OPEN_PAX = 10;
const INCL_LABEL_KEYS = ['inclGuide', 'inclTransport', 'inclTickets', 'inclWater', 'inclMeals'] as const;

function clonePricing(base: ProductPricing): ProductPricing {
  return { ...base, incl: { ...base.incl } };
}

function clampOpenPax(value: number): number {
  if (!Number.isFinite(value) || value < DEFAULT_OPEN_PAX) return DEFAULT_OPEN_PAX;
  return Math.floor(value);
}

export default function PricingEditModal({
  open,
  productCode,
  productName,
  pricing,
  onClose,
  onSave,
}: PricingEditModalProps) {
  const formKey = `${open}-${pricing ? JSON.stringify(pricing) : ''}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [form, setForm] = useState<ProductPricing | null>(() => (pricing ? clonePricing(pricing) : null));
  const [original, setOriginal] = useState<ProductPricing | null>(() => (pricing ? clonePricing(pricing) : null));
  const [openPax, setOpenPax] = useState(DEFAULT_OPEN_PAX);

  if (formKey !== previousFormKey) {
    const cloned = pricing ? clonePricing(pricing) : null;
    setPreviousFormKey(formKey);
    setOriginal(cloned);
    setForm(cloned ? clonePricing(cloned) : null);
    setOpenPax(DEFAULT_OPEN_PAX);
  }

  const { language, tp } = useLanguage();
  const dirty = useFormDirty(
    open && !!form && !!original,
    { form: original, openPax: DEFAULT_OPEN_PAX },
    { form, openPax },
    (v) => JSON.stringify(v),
    formKey,
  );
  const { requestClose } = useConfirmClose({ open, dirty, onClose, language });

  if (!open || !form) return null;

  const setSell = (n: number, value: number) => {
    const key = `p${n}` as keyof ProductPricing;
    setForm((f) => (f ? { ...f, [key]: value } : f));
  };

  const setIncl = (key: keyof ProductPricingInclusions, checked: boolean) => {
    setForm((f) => (f ? { ...f, incl: { ...f.incl, [key]: checked } } : f));
  };

  const handleSave = () => {
    if (!form || !original) return;
    onSave({
      ...original,
      ...form,
      productCode: form.productCode,
      incl: { ...form.incl },
    });
  };

  const openRate = (form.p10 as number) || 0;
  const groupTotal = openRate * openPax;

  return (
    <div className="overlay open prod-form-overlay" onClick={() => void requestClose()}>
      <div className="modal prod-form-modal pricing-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green prod-form-modal-hd">
          <div>
            <div className="prod-form-modal-title">{tp('pricing', 'editModalTitle')}</div>
            <div className="prod-form-modal-sub">
              <code className="pricing-edit-code">{productCode}</code>
              <span className="pricing-edit-name">{productName}</span>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={() => void requestClose()}>
            ✕
          </button>
        </div>

        <div className="prod-form-modal-bd">
          <section className="prod-form-section">
            <div className="prod-form-section-hd">
              <h3 className="prod-form-section-title">{tp('pricing', 'editSellByGroupSize')}</h3>
              <p className="prod-form-section-hint">{tp('pricing', 'editSellHint')}</p>
            </div>

            <div className="pricing-edit-grid-wrap">
              <table className="pricing-edit-grid">
                <thead>
                  <tr>
                    {PAX_COLS.map((n) => (
                      <th
                        key={n}
                        className={
                          n === 1 ? 'pricing-edit-th-solo' : n === 10 ? 'pricing-edit-th-group' : undefined
                        }
                      >
                        {n === 10 ? (
                          <input
                            type="number"
                            min={DEFAULT_OPEN_PAX}
                            step={1}
                            className="pricing-edit-pax-input"
                            value={openPax}
                            onChange={(e) => setOpenPax(clampOpenPax(Number(e.target.value)))}
                            aria-label={tp('pricing', 'editOpenPaxAria')}
                          />
                        ) : (
                          n
                        )}
                        <span className="pricing-edit-th-unit">{tp('pricing', 'editPaxUnit')}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {PAX_COLS.map((n) => (
                      <td
                        key={n}
                        className={
                          n === 1 ? 'pricing-edit-td-solo' : n === 10 ? 'pricing-edit-td-group' : undefined
                        }
                      >
                        <div className="pricing-edit-cell">
                          <span className="pricing-edit-currency">$</span>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className="pricing-edit-input"
                            value={form[`p${n}` as keyof ProductPricing] as number || ''}
                            onChange={(e) => setSell(n, Number(e.target.value) || 0)}
                            placeholder="0"
                            aria-label={
                              n === 10
                                ? `Sell price per guest for ${openPax}+ pax`
                                : `Sell price for ${n} pax`
                            }
                          />
                        </div>
                        {n === 10 ? (
                          <div className="pricing-edit-group-total" title={`${openRate} × ${openPax}`}>
                            × {openPax} = ${fmt(groupTotal)}
                          </div>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="prod-form-section">
            <div className="prod-form-section-hd">
              <h3 className="prod-form-section-title">{tp('pricing', 'editWhatsIncluded')}</h3>
              <p className="prod-form-section-hint">{tp('pricing', 'editInclHint')}</p>
            </div>
            <div className="pricing-edit-incl">
              {ICO_KEYS.map((key, j) => {
                const on = form.incl[key];
                return (
                  <button
                    key={key}
                    type="button"
                    className={`pricing-edit-incl-btn${on ? ' on' : ''}`}
                    onClick={() => setIncl(key, !on)}
                    title={tp('pricing', INCL_LABEL_KEYS[j])}
                  >
                    <span className="pricing-edit-incl-icon">{ICO_EMOJIS[j]}</span>
                    <span className="pricing-edit-incl-label">{tp('pricing', INCL_LABEL_KEYS[j])}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        <div className="prod-form-modal-ft">
          <button type="button" className="btn btn-s" onClick={() => void requestClose()}>
            {tp('pricing', 'cancel')}
          </button>
          <button type="button" className="btn btn-p" onClick={handleSave}>
            {tp('pricing', 'savePricing')}
          </button>
        </div>
      </div>
    </div>
  );
}

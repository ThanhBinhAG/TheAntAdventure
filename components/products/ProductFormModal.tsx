'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import DestinationCombobox from '@/components/products/DestinationCombobox';
import { REG_COLORS_HEX, REG_LABELS } from '@/lib/page-helpers';
import {
  destinationsForRegion,
  formatCodeBreakdown,
  suggestTypeSegment,
  TYPE_SEGMENT_OPTIONS,
  validateProductCodeInput,
} from '@/lib/product-code';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_DURATIONS,
  PRODUCT_LEVELS,
  deriveCategoriesFromProducts,
  emptyProductForm,
  formToProduct,
  productToForm,
  regenerateProductCode,
  type ProductFormState,
} from '@/lib/product-form';
import { getDurationPillLabel } from '@/lib/product-display';
import { pricingStatus, pricingUrlForProduct } from '@/lib/product-pricing-helpers';
import { galleryUrlForProduct, productPhotoSlotStatus } from '@/lib/gallery-helpers';
import type { GalleryPhoto } from '@/lib/tour-design-types';
import { getLibPriceLabel } from '@/lib/tour-pricing';
import Link from 'next/link';
import { useStore } from '@/hooks/useStore';
import type { Product } from '@/lib/types';

type SourceTab = 'library' | 'modules';

interface ProductFormModalProps {
  open: boolean;
  product: Product | null;
  isNew: boolean;
  sourceTab: SourceTab;
  externalError?: string | null;
  onClose: () => void;
  onSave: (product: Product, asDraft: boolean) => void;
  onDelete?: (code: string) => void;
  onDismissError?: () => void;
}

function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="prod-form-section">
      <div className="prod-form-section-hd">
        <h3 className="prod-form-section-title">{title}</h3>
        {hint && <p className="prod-form-section-hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function defaultDestForRegion(region: string): string {
  if (region === 'services') return 'All Vietnam';
  const dests = destinationsForRegion(region);
  return dests[0]?.label ?? '';
}

export default function ProductFormModal({
  open,
  product,
  isNew,
  sourceTab,
  externalError,
  onClose,
  onSave,
  onDelete,
  onDismissError,
}: ProductFormModalProps) {
  const allProducts = useStore((s) => s.products);
  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const existingCodes = useMemo(() => allProducts.map((p) => p.code), [allProducts]);
  const [form, setForm] = useState<ProductFormState>(() => emptyProductForm('north', existingCodes));
  const pricingRow = useStore((s) =>
    form.code ? s.productPricing.find((r) => r.productCode === form.code) : undefined
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const categories = useMemo(() => deriveCategoriesFromProducts(allProducts), [allProducts]);
  const suggestedTypeSegment = useMemo(
    () => suggestTypeSegment(form.region, form.dur, form.cat),
    [form.region, form.dur, form.cat]
  );
  const isTypeSegmentOverridden = form.typeSegment !== suggestedTypeSegment;

  const rebuildCode = useCallback(
    (state: ProductFormState): ProductFormState => {
      if (!isNew) return state;
      try {
        return { ...state, code: regenerateProductCode(state, existingCodes) };
      } catch {
        return { ...state, code: '' };
      }
    },
    [existingCodes, isNew]
  );

  useEffect(() => {
    if (!open) return;
    setSaveError(null);
    if (product && !isNew) {
      setForm(productToForm(product));
    } else {
      setForm(emptyProductForm('north', existingCodes));
    }
  }, [open, product, isNew, existingCodes]);

  const typeSegmentOptions = useMemo(() => {
    const set = new Set<string>(TYPE_SEGMENT_OPTIONS);
    if (form.typeSegment) set.add(form.typeSegment);
    set.add(suggestedTypeSegment);
    return [...set];
  }, [form.typeSegment, suggestedTypeSegment]);

  if (!open) return null;

  const displayError = saveError || externalError || null;

  const applyUpdate = (patch: Partial<ProductFormState>, opts?: { refreshTypeSegment?: boolean }) => {
    setSaveError(null);
    onDismissError?.();
    setForm((f) => {
      let next = { ...f, ...patch };
      if (opts?.refreshTypeSegment) {
        next = { ...next, typeSegment: suggestTypeSegment(next.region, next.dur, next.cat) };
      }
      return rebuildCode(next);
    });
  };

  const handleRegionChange = (region: string) => {
    const dest = defaultDestForRegion(region);
    const dur = region === 'services' ? 'Service' : form.dur === 'Service' ? 'Half Day' : form.dur;
    const cat = region === 'services' && form.cat === 'Cultural' ? 'Service' : form.cat;
    applyUpdate({ region, dest, dur, cat }, { refreshTypeSegment: true });
  };

  const handleDestChange = (dest: string) => {
    applyUpdate({ dest });
  };

  const handleDurationChange = (dur: string) => {
    applyUpdate({ dur }, { refreshTypeSegment: true });
  };

  const handleCategoryChange = (cat: string) => {
    applyUpdate({ cat }, { refreshTypeSegment: true });
  };

  const handleTypeSegmentChange = (typeSegment: string) => {
    applyUpdate({ typeSegment });
  };

  const resetTypeSegment = () => {
    applyUpdate({ typeSegment: suggestedTypeSegment });
  };

  const handleSave = (asDraft: boolean) => {
    if (!form.name.trim()) {
      setSaveError('Please enter a product name.');
      return;
    }
    if (!form.desc.trim()) {
      setSaveError('Please enter a description.');
      return;
    }
    const codeInputError = validateProductCodeInput({
      region: form.region,
      dest: form.dest,
      dur: form.dur,
      cat: form.cat,
    });
    if (codeInputError) {
      setSaveError(codeInputError);
      return;
    }
    if (isNew && !form.code.trim()) {
      setSaveError('Could not generate a product code. Check destination and type segment.');
      return;
    }
    setSaveError(null);
    onSave(
      formToProduct({
        ...form,
        status: asDraft ? 'draft' : form.status === 'archived' ? 'archived' : 'active',
      }),
      asDraft
    );
  };

  const [rbg, rfg] = REG_COLORS_HEX[form.region as keyof typeof REG_COLORS_HEX] || ['#f5f5f5', '#333'];
  const previewPrice = form.price || getLibPriceLabel(form.code, 2);
  const pStatus = form.code ? pricingStatus(pricingRow) : 'missing';
  const photoStatus = form.code ? productPhotoSlotStatus(photos, form.code) : { linked: 0, needed: 2, complete: false };

  return (
    <div className="overlay open prod-form-overlay" onClick={onClose}>
      <div className="modal prod-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green prod-form-modal-hd">
          <div>
            <div className="prod-form-modal-title">
              {isNew ? 'Add New Product' : 'Edit Product'}
            </div>
            <div className="prod-form-modal-sub">
              {isNew ? 'Thêm sản phẩm mới' : form.code}
              {sourceTab === 'modules' && ' · opened from Modules View'}
              {sourceTab === 'library' && ' · opened from Product Library'}
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="prod-form-modal-bd">
          <div className="prod-form-live-card">
            <div className="prod-form-live-label">Library card preview</div>
            <div className="prod-card prod-form-preview-card">
              <div className="prod-card-tags">
                <code className="pl-code">{form.code || 'AA-…'}</code>
                <span className="prod-region-badge" style={{ background: rbg, color: rfg }}>
                  {REG_LABELS[form.region as keyof typeof REG_LABELS] || form.region}
                </span>
                {form.dur && <span className="prod-tag-pill prod-tag-dur">{getDurationPillLabel(form.dur)}</span>}
                {form.cat && <span className="prod-tag-pill prod-tag-cat">{form.cat}</span>}
                {form.lvl && <span className="prod-tag-pill prod-tag-lvl">{form.lvl}</span>}
                {form.status && form.status !== 'active' && (
                  <span className={`bdg ${form.status === 'draft' ? 'bdg-a' : 'bdg-r'}`}>{form.status}</span>
                )}
              </div>
              {form.code && (
                <div className="prod-form-code-breakdown" title="Product code segments">
                  {formatCodeBreakdown(form.code)}
                </div>
              )}
              <div className="prod-card-name prod-form-preview-name">{form.name || 'Product name (EN)'}</div>
              {form.dest && <div className="prod-card-dest">📍 {form.dest}</div>}
              <div className="prod-form-preview-desc">
                {form.desc ? `${form.desc.slice(0, 160)}${form.desc.length > 160 ? '…' : ''}` : 'Description preview…'}
              </div>
              {previewPrice && <div className="prod-card-price">Price: {previewPrice}</div>}
            </div>
          </div>

          <FormSection
            title="Card tags & classification"
            hint="Product code follows Portfolio Excel: AA-{region}-{dest}-{activity}-{duration}-{seq} (e.g. AA-SV-SGN-CULI-EVE-01)."
          >
            <div className="prod-form-grid prod-form-grid-4">
              <div className="fg">
                <label className="lbl">
                  Region <span className="req">*</span>
                </label>
                <select value={form.region} onChange={(e) => handleRegionChange(e.target.value)}>
                  <option value="north">Northern Vietnam</option>
                  <option value="central">Central Vietnam</option>
                  <option value="south">Southern Vietnam</option>
                  <option value="services">Services</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">
                  Duration <span className="req">*</span>
                </label>
                <select value={form.dur} onChange={(e) => handleDurationChange(e.target.value)}>
                  {PRODUCT_DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Category tag</label>
                <input
                  list="prod-cat-options"
                  value={form.cat}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  placeholder="Cultural, Culinary…"
                />
                <datalist id="prod-cat-options">
                  {[...new Set([...PRODUCT_CATEGORIES, ...categories])].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="fg">
                <label className="lbl">Level tag</label>
                <select value={form.lvl} onChange={(e) => setForm((f) => ({ ...f, lvl: e.target.value }))}>
                  {PRODUCT_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="prod-form-grid prod-form-grid-3">
              <div className="fg">
                <label className="lbl">
                  Destination tag <span className="req">*</span>
                </label>
                <DestinationCombobox
                  value={form.dest}
                  region={form.region}
                  products={allProducts}
                  onChange={handleDestChange}
                  required
                />
              </div>
              <div className="fg">
                <label className="lbl">Code type {isNew ? '(activity–duration)' : ''}</label>
                <div className="prod-form-type-seg-row">
                  <select
                    value={form.typeSegment}
                    onChange={(e) => handleTypeSegmentChange(e.target.value)}
                    disabled={!isNew}
                  >
                    {typeSegmentOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                        {t === suggestedTypeSegment ? ' (suggested)' : ''}
                      </option>
                    ))}
                  </select>
                  {isNew && isTypeSegmentOverridden && (
                    <button type="button" className="btn btn-s prod-form-reset-seg" onClick={resetTypeSegment}>
                      Reset
                    </button>
                  )}
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProductFormState['status'] }))}
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="prod-form-grid prod-form-grid-2">
              <div className="fg">
                <label className="lbl">Product code {isNew ? '(auto)' : ''}</label>
                <input value={form.code} readOnly className="prod-form-code-readonly" />
                {form.code && isNew && (
                  <p className="prod-form-section-hint" style={{ marginTop: 6 }}>
                    {formatCodeBreakdown(form.code)}
                  </p>
                )}
              </div>
            </div>
          </FormSection>

          <FormSection title="Product identity">
            <div className="prod-form-grid prod-form-grid-3">
              <div className="fg prod-form-span-2">
                <label className="lbl">
                  Name (EN) <span className="req">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Halong Bay Overnight Cruise"
                />
              </div>
              <div className="fg">
                <label className="lbl">Base cost / price</label>
                <input
                  type="text"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="80 or On request"
                />
              </div>
              <div className="fg prod-form-span-3">
                <label className="lbl">Tên (VN)</label>
                <input
                  value={form.nameVn}
                  onChange={(e) => setForm((f) => ({ ...f, nameVn: e.target.value }))}
                  placeholder="Vịnh Hạ Long 2N1Đ"
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Content & itinerary">
            <div className="prod-form-grid prod-form-grid-2">
              <div className="fg">
                <label className="lbl">
                  Description (EN) — for proposals <span className="req">*</span>
                </label>
                <textarea
                  value={form.desc}
                  onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                  placeholder="2–3 evocative sentences for client-facing materials…"
                  rows={5}
                />
              </div>
              <div className="fg">
                <label className="lbl">Highlights / USP</label>
                <textarea
                  value={form.usp}
                  onChange={(e) => setForm((f) => ({ ...f, usp: e.target.value }))}
                  placeholder="Bhaya Cruise · Sea kayaking · Cooking class…"
                  rows={5}
                />
              </div>
            </div>
            <div className="fg" style={{ marginTop: 12 }}>
              <label className="lbl">Logic / itinerary snippet</label>
              <textarea
                value={form.logic}
                onChange={(e) => setForm((f) => ({ ...f, logic: e.target.value }))}
                placeholder="Internal itinerary logic or supplier notes…"
                rows={2}
              />
            </div>
            <div className="fg" style={{ marginTop: 12 }}>
              <label className="lbl">
                Notes to Sales{' '}
                <span className="prod-form-field-hint">Internal — not shown on client proposals</span>
              </label>
              <textarea
                value={form.notesToSales}
                onChange={(e) => setForm((f) => ({ ...f, notesToSales: e.target.value }))}
                placeholder="Sales bullets from the portfolio (inclusions, operators, selling tips)…"
                rows={4}
                className="prod-form-notes-sales"
              />
            </div>
          </FormSection>

          {form.code && (
            <FormSection
              title="Pricing & gallery"
              hint="Linked to Price List and Photo Gallery by product code."
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <span className={`bdg ${pStatus === 'complete' ? 'bdg-g' : pStatus === 'incomplete' ? 'bdg-a' : 'bdg-r'}`}>
                  {pStatus === 'complete' ? 'Pricing complete' : pStatus === 'incomplete' ? 'Pricing partial' : 'No pricing'}
                </span>
                <span className={`bdg ${photoStatus.complete ? 'bdg-g' : 'bdg-a'}`}>
                  Photos {photoStatus.linked}/{photoStatus.needed}
                </span>
                <Link href={pricingUrlForProduct(form.code)} className="btn btn-s btn-sm">
                  Edit pricing →
                </Link>
                <Link href={galleryUrlForProduct(form.code)} className="btn btn-s btn-sm">
                  Photo gallery →
                </Link>
              </div>
            </FormSection>
          )}

          {displayError && <p className="prod-form-save-error">{displayError}</p>}
        </div>

        <div className="prod-form-modal-ft">
          {!isNew && onDelete && (
            <button
              type="button"
              className="btn btn-s prod-form-delete"
              onClick={() => {
                if (confirm(`Delete "${form.name}"? This cannot be undone.`)) onDelete(form.code);
              }}
            >
              Delete
            </button>
          )}
          <div className="prod-form-modal-ft-actions">
            <button className="btn btn-s" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-s" type="button" onClick={() => handleSave(true)}>
              Save as Draft
            </button>
            <button className="btn btn-p" type="button" onClick={() => handleSave(false)}>
              ✓ Save & Activate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

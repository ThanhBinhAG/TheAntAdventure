'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import DestinationCombobox from '@/components/products/DestinationCombobox';
import PhotoLibraryPicker from '@/components/gallery/PhotoLibraryPicker';
import {
  destinationsForRegion,
  suggestTypeSegment,
  TYPE_SEGMENT_OPTIONS,
  validateProductCodeInput,
} from '@/lib/products/product-code';
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
} from '@/lib/products/product-form';
import { pricingStatus, pricingUrlForProduct } from '@/lib/products/product-pricing-helpers';
import { productPhotoSlotStatus } from '@/lib/gallery/gallery-helpers';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import type { PhotoFolder } from '@/lib/gallery/photo-folders';
import Link from 'next/link';
import { useStore } from '@/hooks/useStore';
import type { Product } from '@/lib/types';
import { toast } from '@/lib/toast';

import { confirmDialog } from '@/lib/confirm';

type SourceTab = 'library' | 'modules';

export interface ProductEditPanelProps {
  open: boolean;
  product: Product | null;
  isNew: boolean;
  sourceTab: SourceTab;
  externalError?: string | null;
  onClose: () => void;
  /** Persist locally then push to Supabase; resolve only when remote sync finishes. */
  onSave: (product: Product, asDraft: boolean) => void | Promise<void>;
  onDelete?: (code: string) => void;
  onDismissError?: () => void;
  /** Live draft for the right-hand drawer preview. */
  onDraftChange?: (draft: Product) => void;
}

type SaveUiState = 'idle' | 'saving' | 'saved';

function formFingerprint(form: ProductFormState): string {
  return JSON.stringify({
    code: form.code,
    name: form.name,
    nameVn: form.nameVn,
    desc: form.desc,
    usp: form.usp,
    notesToSales: form.notesToSales,
    logic: form.logic,
    price: form.price,
    region: form.region,
    dest: form.dest,
    dur: form.dur,
    cat: form.cat,
    lvl: form.lvl,
    typeSegment: form.typeSegment,
    status: form.status,
    photoIds: form.photoIds,
    linkedPhotoIds: form.linkedPhotoIds,
  });
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

function draftFromForm(form: ProductFormState): Product {
  return formToProduct({
    ...form,
    status: form.status === 'archived' ? 'archived' : form.status === 'draft' ? 'draft' : 'active',
  });
}

/** Fixed form panel that slides in to the left of the product detail drawer. */
export default function ProductEditPanel({
  open,
  product,
  isNew,
  sourceTab,
  externalError,
  onClose,
  onSave,
  onDelete,
  onDismissError,
  onDraftChange,
}: ProductEditPanelProps) {
  const allProducts = useStore((s) => s.products);
  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const photoFolders = useStore((s) => s.photoFolders) as PhotoFolder[];
  const existingCodes = useMemo(() => allProducts.map((p) => p.code), [allProducts]);
  const [form, setForm] = useState<ProductFormState>(() => emptyProductForm('north', existingCodes));
  const pricingRow = useStore((s) =>
    form.code ? s.productPricing.find((r) => r.productCode === form.code) : undefined
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveUiState>('idle');
  const [saveKind, setSaveKind] = useState<'draft' | 'activate' | null>(null);
  const [savedFingerprint, setSavedFingerprint] = useState<string | null>(null);
  const productForm = product && !isNew ? productToForm(product) : emptyProductForm('north', existingCodes);
  const formInputKey = open ? `${isNew}:${formFingerprint(productForm)}` : null;
  const [previousFormInputKey, setPreviousFormInputKey] = useState<string | null>(formInputKey);
  const categories = useMemo(() => deriveCategoriesFromProducts(allProducts), [allProducts]);
  const suggestedTypeSegment = useMemo(
    () => suggestTypeSegment(form.region, form.dur, form.cat),
    [form.region, form.dur, form.cat]
  );
  const isTypeSegmentOverridden = form.typeSegment !== suggestedTypeSegment;
  const dirty = savedFingerprint === null || formFingerprint(form) !== savedFingerprint;
  const busy = saveState === 'saving';
  const cleanSaved = saveState === 'saved' && !dirty;
  const saveDisabled = busy || cleanSaved;

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

  if (formInputKey !== previousFormInputKey) {
    setPreviousFormInputKey(formInputKey);
    if (open && formFingerprint(form) !== formFingerprint(productForm)) {
      setSaveError(null);
      setSaveState('idle');
      setSaveKind(null);
      setSavedFingerprint(null);
      setForm(productForm);
    }
  }

  useEffect(() => {
    if (!open) return;
    onDraftChange?.(draftFromForm(form));
  }, [form, open, onDraftChange]);

  if (saveState === 'saved' && dirty) {
    setSaveState('idle');
    setSaveKind(null);
  }

  useEffect(() => {
    if (saveState !== 'saving') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveState]);

  const requestClose = () => {
    if (busy) return;
    onClose();
  };

  const typeSegmentOptions = useMemo(() => {
    const set = new Set<string>(TYPE_SEGMENT_OPTIONS);
    if (form.typeSegment) set.add(form.typeSegment);
    set.add(suggestedTypeSegment);
    return [...set];
  }, [form.typeSegment, suggestedTypeSegment]);

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

  const handleSave = async (asDraft: boolean) => {
    if (saveDisabled) return;
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

    const nextStatus = asDraft ? 'draft' : form.status === 'archived' ? 'archived' : 'active';
    const nextForm: ProductFormState = { ...form, status: nextStatus };
    setSaveError(null);
    setSaveKind(asDraft ? 'draft' : 'activate');
    setSaveState('saving');
    setForm(nextForm);

    try {
      await onSave(formToProduct(nextForm), asDraft);
      setSavedFingerprint(formFingerprint(nextForm));
      setSaveState('saved');
    } catch (err) {
      setSaveState('idle');
      setSaveKind(null);
      if (!externalError) {
        setSaveError(err instanceof Error ? err.message : 'Save failed');
      }
    }
  };

  const pStatus = form.code ? pricingStatus(pricingRow) : 'missing';
  const photoStatus = productPhotoSlotStatus(form);

  const draftLabel =
    busy && saveKind === 'draft'
      ? 'Saving…'
      : cleanSaved && saveKind === 'draft'
        ? '✓ Saved'
        : 'Save as Draft';
  const activateLabel =
    busy && saveKind === 'activate' ? 'Saving…' : cleanSaved ? '✓ Saved' : '✓ Save & Activate';

  return (
    <aside
      className={`tp-edit-aside${open ? ' open' : ''}${busy ? ' tp-edit-aside--saving' : ''}${cleanSaved ? ' tp-edit-aside--saved' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tp-edit-aside-title"
      aria-hidden={!open}
      aria-busy={busy}
    >
      <header className="tp-edit-aside-hd">
        <div>
          <h2 id="tp-edit-aside-title" className="tp-edit-aside-title">
            {isNew ? 'Add New Product' : 'Edit Product'}
          </h2>
          <p className="tp-edit-aside-sub">
            {isNew ? 'Thêm sản phẩm mới' : form.code}
            {sourceTab === 'modules' && ' · Modules'}
            {sourceTab === 'library' && ' · Catalog'}
            {' · preview updates on the right'}
          </p>
        </div>
        <button
          type="button"
          className="tp-edit-aside-close"
          onClick={requestClose}
          disabled={busy}
          aria-label="Close editor"
        >
          ✕
        </button>
        {busy && (
          <div className="tp-save-progress" role="progressbar" aria-label="Saving product">
            <span className="tp-save-progress-bar" />
          </div>
        )}
      </header>

      <div className={`tp-edit-aside-scroll${busy ? ' is-busy' : ''}`}>
        {busy && <div className="tp-save-overlay" aria-hidden="true" />}
        <fieldset className="tp-edit-aside-fields" disabled={busy}>
        <FormSection
          title="Card tags & classification"
          hint="Product code: AA-{region}-{dest}-{activity}-{duration}-{seq}."
        >
          <div className="prod-form-grid prod-form-grid-2">
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
                list="prod-cat-options-edit"
                value={form.cat}
                onChange={(e) => handleCategoryChange(e.target.value)}
                placeholder="Cultural, Culinary…"
              />
              <datalist id="prod-cat-options-edit">
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
            <div className="fg">
              <label className="lbl">
                Destination <span className="req">*</span>
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
              <label className="lbl">Code type {isNew ? '' : ''}</label>
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
            <div className="fg">
              <label className="lbl">Product code {isNew ? '(auto)' : ''}</label>
              <input value={form.code} readOnly className="prod-form-code-readonly" />
            </div>
          </div>
        </FormSection>

        <FormSection title="Product identity">
          <div className="prod-form-grid prod-form-grid-2">
            <div className="fg">
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
            <div className="fg prod-form-span-2">
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
          <div className="fg">
            <label className="lbl">
              Description (EN) <span className="req">*</span>
            </label>
            <textarea
              value={form.desc}
              onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
              placeholder="2–3 evocative sentences for client-facing materials…"
              rows={4}
            />
          </div>
          <div className="fg" style={{ marginTop: 12 }}>
            <label className="lbl">Highlights / USP</label>
            <textarea
              value={form.usp}
              onChange={(e) => setForm((f) => ({ ...f, usp: e.target.value }))}
              placeholder="Bhaya Cruise · Sea kayaking · Cooking class…"
              rows={3}
            />
          </div>
          <div className="fg" style={{ marginTop: 12 }}>
            <label className="lbl">Logic / itinerary snippet</label>
            <textarea
              value={form.logic}
              onChange={(e) => setForm((f) => ({ ...f, logic: e.target.value }))}
              placeholder="Internal itinerary logic…"
              rows={2}
            />
          </div>
          <div className="fg" style={{ marginTop: 12 }}>
            <label className="lbl">
              Notes to Sales <span className="prod-form-field-hint">Internal</span>
            </label>
            <textarea
              value={form.notesToSales}
              onChange={(e) => setForm((f) => ({ ...f, notesToSales: e.target.value }))}
              placeholder="Sales bullets…"
              rows={3}
              className="prod-form-notes-sales"
            />
          </div>
        </FormSection>

        <FormSection
          title="Pricing & photos"
          hint="Search by tag (accents optional). Drag onto featured slots or click to link."
        >
          <div className="tp-edit-pricing-row">
            <span className={`bdg ${pStatus === 'complete' ? 'bdg-g' : pStatus === 'incomplete' ? 'bdg-a' : 'bdg-r'}`}>
              {pStatus === 'complete' ? 'Pricing complete' : pStatus === 'incomplete' ? 'Pricing partial' : 'No pricing'}
            </span>
            <span className={`bdg ${photoStatus.complete ? 'bdg-g' : 'bdg-a'}`}>
              Photos {photoStatus.linked}/{photoStatus.needed} featured
            </span>
            {form.code && (
              <Link href={pricingUrlForProduct(form.code)} className="btn btn-s btn-sm">
                Edit pricing →
              </Link>
            )}
          </div>
          <PhotoLibraryPicker
            variant="inline"
            title="Photo library"
            photos={photos}
            folders={photoFolders}
            linkedPhotoIds={form.linkedPhotoIds}
            featuredPhotoIds={form.photoIds}
            maxFeatured={2}
            onChange={({ linkedPhotoIds, photoIds }) => {
              setForm((f) => ({ ...f, linkedPhotoIds, photoIds }));
            }}
          />
        </FormSection>

        {displayError && <p className="prod-form-save-error">{displayError}</p>}
        </fieldset>
      </div>

      <footer className="tp-edit-aside-ft">
        {!isNew && onDelete && (
          <button
            type="button"
            className="btn btn-s prod-form-delete"
            disabled={busy}
            onClick={() => {
              if (busy) return;
              void (async () => {
                const ok = await confirmDialog(
                  `Delete "${form.name}"? This cannot be undone.`,
                  { title: 'Delete product' },
                );
                if (!ok) return;
                onDelete(form.code);
                toast.success('Product deleted.');
              })();
            }}
          >
            Delete
          </button>
        )}
        <div className="tp-edit-aside-ft-actions">
          <button className="btn btn-s" type="button" onClick={requestClose} disabled={busy}>
            Cancel
          </button>
          <button
            className={`btn btn-s tp-save-btn${busy && saveKind === 'draft' ? ' is-saving' : ''}${cleanSaved && saveKind === 'draft' ? ' is-saved' : ''}`}
            type="button"
            onClick={() => void handleSave(true)}
            disabled={saveDisabled}
            aria-busy={busy && saveKind === 'draft'}
          >
            {busy && saveKind === 'draft' && <span className="tp-save-spin" aria-hidden="true" />}
            {draftLabel}
          </button>
          <button
            className={`btn btn-p tp-save-btn${busy && saveKind === 'activate' ? ' is-saving' : ''}${cleanSaved ? ' is-saved' : ''}`}
            type="button"
            onClick={() => void handleSave(false)}
            disabled={saveDisabled}
            aria-busy={busy && saveKind === 'activate'}
          >
            {busy && saveKind === 'activate' && <span className="tp-save-spin" aria-hidden="true" />}
            {activateLabel}
          </button>
        </div>
      </footer>
    </aside>
  );
}

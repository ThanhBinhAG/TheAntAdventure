'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Product } from '@/lib/types';
import type { GalleryPhoto } from '@/lib/tour-design-types';
import { EMPTY_GALLERY_PHOTO_FORM, type GalleryPhotoForm } from '@/lib/gallery-tags';
import { formatBytes, photoSizeLabel, photoThumbUrl, productPhotoSlotStatus } from '@/lib/gallery-helpers';
import GalleryTagSelector from '@/components/gallery/GalleryTagSelector';
import GalleryUploadZone from '@/components/gallery/GalleryUploadZone';
import GalleryTourPhotoStackEditor, { type TourPhotoDraft } from '@/components/gallery/GalleryTourPhotoStackEditor';
import GalleryLoosePhotoStackEditor, { type LoosePhotoDraft } from '@/components/gallery/GalleryLoosePhotoStackEditor';
import GalleryRemovePhotoAction from '@/components/gallery/GalleryRemovePhotoAction';

export type GalleryPhotoRecord = GalleryPhoto;

export type GalleryModalMode = 'addToTour' | 'addLoose' | 'edit';

export type TourPhotoBatchItem = {
  file: File;
  caption: string;
  previewSlot?: 1 | 2;
};

export type LoosePhotoBatchItem = {
  file: File;
  caption: string;
};

export type GalleryPhotoSavePayload = GalleryPhotoForm & {
  replaceImage?: boolean;
  tourBatch?: TourPhotoBatchItem[];
  looseBatch?: LoosePhotoBatchItem[];
};

interface Props {
  open: boolean;
  mode: GalleryModalMode;
  initial?: GalleryPhotoRecord | null;
  presetProduct?: string;
  defaultRegion?: string;
  products: Product[];
  existingPhotos?: GalleryPhotoRecord[];
  saving?: boolean;
  saveStatus?: string;
  onClose: () => void;
  onSave: (data: GalleryPhotoSavePayload, id?: string) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}

const REGION_OPTIONS = [
  { value: 'north', label: 'Northern Vietnam' },
  { value: 'central', label: 'Central Vietnam' },
  { value: 'south', label: 'Southern Vietnam' },
  { value: 'people', label: 'People & Culture' },
] as const;

function ModalSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="gallery-upload-section">
      <div className="gallery-upload-section-hd">
        <h3 className="gallery-upload-section-title">{title}</h3>
        {hint && <p className="gallery-upload-section-hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function GalleryPhotoModal({
  open,
  mode,
  initial,
  presetProduct = '',
  defaultRegion = 'north',
  products,
  existingPhotos = [],
  saving = false,
  saveStatus = '',
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [form, setForm] = useState<GalleryPhotoForm>({ ...EMPTY_GALLERY_PHOTO_FORM });
  const [customTag, setCustomTag] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [replaceImage, setReplaceImage] = useState(false);
  const [tourDrafts, setTourDrafts] = useState<TourPhotoDraft[]>([]);
  const [looseDrafts, setLooseDrafts] = useState<LoosePhotoDraft[]>([]);
  const [captionTouched, setCaptionTouched] = useState(false);
  const [fileTouched, setFileTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const selectedProduct = products.find((p) => p.code === form.product);

  const handleTourDraftsChange = useCallback((drafts: TourPhotoDraft[]) => {
    setTourDrafts(drafts);
  }, []);

  const handleLooseDraftsChange = useCallback((drafts: LoosePhotoDraft[]) => {
    setLooseDrafts(drafts);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setForm({
        caption: initial.caption || '',
        caption2: '',
        region: initial.region || 'north',
        product: initial.product || '',
        tags: Array.isArray(initial.tags) ? [...initial.tags] : [],
        file: null,
        file2: null,
      });
      setPreviewUrl(photoThumbUrl(initial) || initial.url || '');
      setReplaceImage(false);
      setTourDrafts([]);
    } else if (mode === 'addToTour') {
      const product = presetProduct || '';
      const p = products.find((x) => x.code === product);
      setForm({
        ...EMPTY_GALLERY_PHOTO_FORM,
        product,
        region: p?.region || 'north',
      });
      setTourDrafts([]);
    } else if (mode === 'addLoose') {
      setForm({ ...EMPTY_GALLERY_PHOTO_FORM, region: defaultRegion });
      setPreviewUrl('');
      setTourDrafts([]);
      setLooseDrafts([]);
    } else {
      setForm({ ...EMPTY_GALLERY_PHOTO_FORM, region: defaultRegion });
      setPreviewUrl('');
      setTourDrafts([]);
      setLooseDrafts([]);
    }
    setCustomTag('');
    setCaptionTouched(false);
    setFileTouched(false);
    setSubmitAttempted(false);
  }, [open, mode, initial, presetProduct, defaultRegion, products]);

  useEffect(() => {
    if (!form.file) {
      if (mode === 'edit' && initial && !replaceImage) {
        setPreviewUrl(photoThumbUrl(initial) || initial.url || '');
      } else if (mode === 'addLoose') {
        setPreviewUrl('');
      }
      return;
    }
    const url = URL.createObjectURL(form.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.file, mode, initial, replaceImage]);

  const slotStatus = useMemo(() => {
    if (!form.product) return null;
    return productPhotoSlotStatus(existingPhotos, form.product);
  }, [existingPhotos, form.product]);

  if (!open) return null;

  const isTour = mode === 'addToTour';
  const isLoose = mode === 'addLoose';
  const isEdit = mode === 'edit';

  const meta = {
    addToTour: {
      title: 'Add tour photos',
      subtitle: 'Upload multiple images — star any 2 for the preview pair on the tour card',
      icon: '🖼',
    },
    addLoose: {
      title: 'Add loose photos',
      subtitle: 'Add one by one — another upload box appears below after each image',
      icon: '📷',
    },
    edit: {
      title: 'Edit photo',
      subtitle: initial?.product ? `Tour: ${initial.product}` : 'Update caption, tags, or replace image',
      icon: '✎',
    },
  }[mode];

  function addCustomTag() {
    const t = customTag.trim();
    if (!t) return;
    if (!form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setCustomTag('');
  }

  function onFile1Change(file: File | null) {
    setForm((f) => ({ ...f, file }));
    setFileTouched(true);
    if (isEdit) setReplaceImage(Boolean(file));
  }

  const captionError =
    !isTour && !form.caption.trim() && (captionTouched || submitAttempted)
      ? 'Caption is required.'
      : '';
  const fileError =
    isLoose && looseDrafts.length === 0 && submitAttempted ? 'Add at least one image.' : '';
  const replaceFileError =
    isEdit && replaceImage && !form.file && (fileTouched || submitAttempted)
      ? 'Choose a replacement image or turn off replace.'
      : '';

  const canSaveTour = Boolean(
    form.product && tourDrafts.length > 0 && tourDrafts.every((d) => d.caption.trim())
  );
  const canSaveLoose = Boolean(
    looseDrafts.length > 0 && looseDrafts.every((d) => d.caption.trim())
  );

  function handleSave() {
    setSubmitAttempted(true);

    if (isTour) {
      if (!canSaveTour) return;
    } else if (isLoose) {
      if (!canSaveLoose) return;
    } else if (isEdit) {
      if (!form.caption.trim() || (replaceImage && !form.file)) return;
    }
    if (isTour) {
      void onSave({
        ...form,
        caption: '',
        caption2: '',
        tourBatch: tourDrafts.map((d) => ({
          file: d.file,
          caption: d.caption.trim(),
          previewSlot: d.previewSlot,
        })),
      });
      return;
    }

    if (isLoose) {
      void onSave({
        ...form,
        caption: '',
        caption2: '',
        looseBatch: looseDrafts.map((d) => ({
          file: d.file,
          caption: d.caption.trim(),
        })),
      });
      return;
    }

    void onSave(
      {
        ...form,
        caption: form.caption.trim(),
        caption2: form.caption2.trim(),
        replaceImage: isEdit ? replaceImage : undefined,
      },
      isEdit ? initial?.id : undefined
    );
  }

  const saveLabel = saving
    ? 'Saving…'
    : isEdit
      ? 'Save changes'
      : isTour
        ? `Save ${tourDrafts.length} photo${tourDrafts.length === 1 ? '' : 's'}`
        : isLoose
          ? `Save ${looseDrafts.length} photo${looseDrafts.length === 1 ? '' : 's'}`
          : 'Save photo';

  return (
    <div className="modal-overlay open" onClick={() => !saving && onClose()}>
      <div className="modal gallery-upload-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green gallery-upload-modal-hd">
          <div className="gallery-upload-modal-hd-text">
            <span className="gallery-upload-modal-icon">{meta.icon}</span>
            <div>
              <div className="gallery-upload-modal-title">{meta.title}</div>
              <div className="gallery-upload-modal-subtitle">{meta.subtitle}</div>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={saving}>
            ✕
          </button>
        </div>

        <div className="gallery-upload-modal-body">
          {saveStatus && (
            <div className="gallery-upload-status">
              <span className="gallery-upload-status-dot" />
              {saveStatus}
            </div>
          )}

          {isTour ? (
            <div className="gallery-upload-layout">
              <div className="gallery-upload-visual-col">
                <GalleryTourPhotoStackEditor disabled={saving} onChange={handleTourDraftsChange} />
              </div>

              <div className="gallery-upload-form-col">
                <ModalSection title="Tour" hint="All photos in this batch link to one catalogue product">
                  <div className="fg">
                    <label className="lbl">Linked tour *</label>
                    <select
                      value={form.product}
                      onChange={(e) => {
                        const code = e.target.value;
                        const p = products.find((x) => x.code === code);
                        setForm({ ...form, product: code, region: p?.region || form.region });
                      }}
                      disabled={saving || Boolean(presetProduct)}
                    >
                      <option value="">Select tour product…</option>
                      {products.map((p) => (
                        <option key={p.code} value={p.code}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {selectedProduct && <div className="gallery-upload-tour-code">{selectedProduct.code}</div>}
                    {slotStatus && (
                      <div className={`gallery-upload-slot-pill${slotStatus.complete ? ' complete' : ''}`}>
                        Card preview: {slotStatus.linked}/{slotStatus.needed} starred
                      </div>
                    )}
                  </div>
                  <div className="fg">
                    <label className="lbl">Region</label>
                    <select
                      value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                      disabled={saving}
                    >
                      {REGION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </ModalSection>

                <ModalSection title="Tags" hint="Shared across all photos in this batch">
                  <GalleryTagSelector
                    selected={form.tags}
                    onChange={(tags) => setForm({ ...form, tags })}
                    customTag={customTag}
                    onCustomTagChange={setCustomTag}
                    onAddCustomTag={addCustomTag}
                  />
                </ModalSection>
              </div>
            </div>
          ) : isLoose ? (
            <div className="gallery-upload-layout">
              <div className="gallery-upload-visual-col">
                <GalleryLoosePhotoStackEditor
                  disabled={saving}
                  showErrors={submitAttempted}
                  onChange={handleLooseDraftsChange}
                />
                {fileError && <p className="field-error">{fileError}</p>}
              </div>

              <div className="gallery-upload-form-col">
                <ModalSection title="Details" hint="Shared across all photos in this batch">
                  <div className="fg">
                    <label className="lbl">Region</label>
                    <select
                      value={form.region}
                      onChange={(e) => setForm({ ...form, region: e.target.value })}
                      disabled={saving}
                    >
                      {REGION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </ModalSection>

                <ModalSection title="Tags" hint="Shared across all photos in this batch">
                  <GalleryTagSelector
                    selected={form.tags}
                    onChange={(tags) => setForm({ ...form, tags })}
                    customTag={customTag}
                    onCustomTagChange={setCustomTag}
                    onAddCustomTag={addCustomTag}
                  />
                </ModalSection>
              </div>
            </div>
          ) : (
            <div className="gallery-upload-single">
              <div className="gallery-upload-single-visual">
                <GalleryUploadZone
                  label="Replace image"
                  sublabel="JPEG, PNG, or WebP · max 10 MB"
                  optional
                  previewUrl={previewUrl}
                  file={form.file}
                  disabled={saving}
                  onChange={onFile1Change}
                />
                {isEdit && initial && !form.file && (
                  <div className="gallery-upload-current-size">Stored size: {photoSizeLabel(initial)}</div>
                )}
                {form.file && (
                  <div className="gallery-upload-current-size">
                    {isEdit ? 'New file' : 'Selected'}: {formatBytes(form.file.size)}
                  </div>
                )}
                {(fileError || replaceFileError) && (
                  <p className="field-error">{fileError || replaceFileError}</p>
                )}
              </div>

              <div className="gallery-upload-single-form">
                <ModalSection title="Details">
                  <div className="fg-row">
                    <div className="fg">
                      <label className="lbl">Caption *</label>
                      <input
                        value={form.caption}
                        onChange={(e) => setForm({ ...form, caption: e.target.value })}
                        onBlur={() => setCaptionTouched(true)}
                        placeholder="Halong Bay at dawn…"
                        disabled={saving}
                        className={captionError ? 'input-error' : undefined}
                        aria-invalid={Boolean(captionError)}
                      />
                      {captionError && <p className="field-error">{captionError}</p>}
                    </div>
                    <div className="fg">
                      <label className="lbl">Region</label>
                      <select
                        value={form.region}
                        onChange={(e) => setForm({ ...form, region: e.target.value })}
                        disabled={saving}
                      >
                        {REGION_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </ModalSection>

                <ModalSection title="Tags">
                  <GalleryTagSelector
                    selected={form.tags}
                    onChange={(tags) => setForm({ ...form, tags })}
                    customTag={customTag}
                    onCustomTagChange={setCustomTag}
                    onAddCustomTag={addCustomTag}
                  />
                </ModalSection>
              </div>
            </div>
          )}
        </div>

        <div className="gallery-upload-modal-ft">
          {isEdit && initial && onDelete ? (
            <GalleryRemovePhotoAction
              resetKey={initial.id}
              buttonClassName="gallery-upload-delete-btn"
              disabled={saving}
              onConfirm={() => void onDelete(initial.id)}
            />
          ) : (
            <span />
          )}
          <div className="gallery-upload-modal-ft-actions">
            <button className="btn btn-s" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn btn-p"
              type="button"
              onClick={handleSave}
              disabled={saving || (isTour ? !canSaveTour : isLoose ? !canSaveLoose : false)}
            >
              {saveLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

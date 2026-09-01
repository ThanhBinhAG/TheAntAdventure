'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { EMPTY_GALLERY_PHOTO_FORM, PHOTO_LIBRARY_REGIONS } from '@/lib/gallery/gallery-tags';
import { formatBytes, photoSizeLabel, photoThumbUrl } from '@/lib/gallery/gallery-helpers';
import GalleryTagSelector from '@/components/gallery/GalleryTagSelector';
import GalleryUploadZone from '@/components/gallery/GalleryUploadZone';
import GalleryRemovePhotoAction from '@/components/gallery/GalleryRemovePhotoAction';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

export type GalleryPhotoRecord = GalleryPhoto;

export type GalleryModalMode = 'add' | 'edit';

export type GalleryPhotoSavePayload = {
  caption: string;
  region: string;
  tags: string[];
  file?: File | null;
  files?: File[];
  replaceImage?: boolean;
};

interface Props {
  open: boolean;
  mode: GalleryModalMode;
  initial?: GalleryPhotoRecord | null;
  defaultRegion?: string;
  saving?: boolean;
  saveStatus?: string;
  /** Percent `0..100` while chunking; null hides the bar. */
  uploadProgress?: number | null;
  onClose: () => void;
  onSave: (data: GalleryPhotoSavePayload, id?: string) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}

const REGION_OPTIONS = PHOTO_LIBRARY_REGIONS.filter((r) => r.id !== 'all');

function ModalSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="phlib-modal-section">
      <div className="phlib-modal-section-hd">
        <h3 className="phlib-modal-section-title">{title}</h3>
        {hint && <p className="phlib-modal-section-hint">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function initialForm(mode: GalleryModalMode, initial: GalleryPhotoRecord | null | undefined, defaultRegion: string) {
  if (mode === 'edit' && initial) {
    return {
      caption: initial.caption || '',
      region: initial.region || defaultRegion,
      tags: [...(initial.tags ?? [])],
    };
  }
  return {
    caption: EMPTY_GALLERY_PHOTO_FORM.caption,
    region: defaultRegion,
    tags: [],
  };
}

export default function GalleryPhotoModal({
  open,
  mode,
  initial,
  defaultRegion = 'north',
  saving = false,
  saveStatus = '',
  uploadProgress = null,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const formKey = `${open}-${mode}-${initial ? JSON.stringify(initial) : ''}-${defaultRegion}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const initialValues = initialForm(mode, initial, defaultRegion);
  const [caption, setCaption] = useState(initialValues.caption);
  const [region, setRegion] = useState(initialValues.region);
  const [tags, setTags] = useState<string[]>(initialValues.tags);
  const [customTag, setCustomTag] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const [replaceImage, setReplaceImage] = useState(false);
  const multiRef = useRef<HTMLInputElement>(null);

  if (formKey !== previousFormKey) {
    const next = initialForm(mode, initial, defaultRegion);
    setPreviousFormKey(formKey);
    setCaption(next.caption);
    setRegion(next.region);
    setTags(next.tags);
    setCustomTag('');
    setFile(null);
    setExtraFiles([]);
    setReplaceImage(false);
  }

  const previewUrl = useMemo(() => {
    if (file) return URL.createObjectURL(file);
    if (mode === 'edit' && initial) return photoThumbUrl(initial) || initial.url || '';
    return '';
  }, [file, mode, initial]);

  useEffect(() => {
    if (!file || !previewUrl.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [file, previewUrl]);

  const addCustomTag = useCallback(() => {
    const t = customTag.trim();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setCustomTag('');
  }, [customTag, tags]);

  const { tp, tpl, tc, language } = useLanguage();

  const REGION_I18N: Record<string, 'regionNorth' | 'regionCentral' | 'regionSouth' | 'regionPeople' | 'regionServices'> = {
    north: 'regionNorth',
    central: 'regionCentral',
    south: 'regionSouth',
    people: 'regionPeople',
    services: 'regionServices',
  };
  const baseline = useMemo(() => initialForm(mode, initial, defaultRegion), [formKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = useFormDirty(
    open,
    { ...baseline, hasFile: false, replaceImage: false },
    {
      caption,
      region,
      tags,
      hasFile: Boolean(file || extraFiles.length),
      replaceImage,
    },
    (v) => JSON.stringify(v),
    formKey,
  );
  const { requestClose } = useConfirmClose({ open, dirty, onClose, disabled: saving, language });

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (mode === 'add' && !file && !extraFiles.length) return;
    if (mode === 'edit' && replaceImage && !file) return;
    if (!caption.trim() && mode === 'edit') return;
    if (!caption.trim() && mode === 'add' && file && !extraFiles.length) return;

    const files = mode === 'add' ? [file, ...extraFiles].filter((f): f is File => Boolean(f)) : undefined;
    await onSave(
      {
        caption: caption.trim() || (files?.[0]?.name.replace(/\.[^.]+$/, '') ?? ''),
        region,
        tags,
        file: mode === 'edit' ? file : files?.[0] ?? null,
        files: mode === 'add' ? files : undefined,
        replaceImage: mode === 'edit' ? replaceImage : undefined,
      },
      mode === 'edit' ? initial?.id : undefined
    );
  }

  return (
    <div className="overlay open" onClick={() => void requestClose()}>
      <div className="modal phlib-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green phlib-modal-hd">
          <div>
            <div className="phlib-modal-title">
              {mode === 'edit' ? tp('gallery', 'editPhoto') : tp('gallery', 'uploadToLibrary')}
            </div>
            <div className="phlib-modal-sub">
              {mode === 'edit' ? initial?.id : tp('gallery', 'uploadSubtitle')}
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={() => void requestClose()} disabled={saving}>
            ✕
          </button>
        </div>

        <form className="phlib-modal-bd" onSubmit={handleSubmit}>
          <div className="phlib-modal-layout">
            <div className="phlib-modal-col-media">
              <ModalSection
                title={tp('gallery', 'sectionImage')}
                hint={mode === 'add' ? tp('gallery', 'sectionImageHintAdd') : undefined}
              >
                {mode === 'edit' && (
                  <label className="phlib-check-row">
                    <input
                      type="checkbox"
                      checked={replaceImage}
                      onChange={(e) => {
                        setReplaceImage(e.target.checked);
                        if (!e.target.checked) setFile(null);
                      }}
                    />
                    {tp('gallery', 'replaceImageFile')}
                  </label>
                )}
                {(mode === 'add' || replaceImage) && (
                  <GalleryUploadZone
                    label={mode === 'add' ? tp('gallery', 'dropPhotoHere') : tp('gallery', 'newImage')}
                    sublabel={tp('gallery', 'orClickToBrowse')}
                    previewUrl={previewUrl || undefined}
                    file={file}
                    disabled={saving}
                    onChange={setFile}
                  />
                )}
                {mode === 'edit' && !replaceImage && previewUrl && (
                  <div className="phlib-edit-preview" style={{ backgroundImage: `url(${previewUrl})` }} />
                )}
                {mode === 'add' && (
                  <div className="phlib-multi-row">
                    <button
                      type="button"
                      className="btn btn-sm btn-o"
                      disabled={saving}
                      onClick={() => multiRef.current?.click()}
                    >
                      {tp('gallery', 'addMoreFiles')}
                    </button>
                    <input
                      ref={multiRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      hidden
                      onChange={(e) => {
                        const list = [...(e.target.files ?? [])].filter((f) =>
                          /^image\/(jpeg|png|webp)$/.test(f.type)
                        );
                        setExtraFiles((prev) => [...prev, ...list]);
                        e.target.value = '';
                      }}
                    />
                    {extraFiles.length > 0 && (
                      <span className="phlib-multi-count">
                        {tpl('gallery', 'moreFilesCount', { count: extraFiles.length })}
                      </span>
                    )}
                  </div>
                )}
                {mode === 'edit' && initial?.displayBytes != null && (
                  <p className="phlib-size-hint">
                    {tpl('gallery', 'storedSize', {
                      label: photoSizeLabel(initial),
                      size: formatBytes(initial.displayBytes),
                    })}
                  </p>
                )}
              </ModalSection>
            </div>

            <div className="phlib-modal-col-meta">
              <ModalSection title={tp('gallery', 'sectionDetails')}>
                <div className="fg">
                  <label className="lbl">{tp('gallery', 'captionLabel')}</label>
                  <input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={tp('gallery', 'captionPlaceholder')}
                    disabled={saving}
                    required={mode === 'edit' || Boolean(file)}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('gallery', 'regionLabel')}</label>
                  <select value={region} onChange={(e) => setRegion(e.target.value)} disabled={saving}>
                    {REGION_OPTIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {tp('gallery', REGION_I18N[r.id] ?? 'regionNorth')}
                      </option>
                    ))}
                  </select>
                </div>
              </ModalSection>

              <ModalSection title={tp('gallery', 'sectionTags')}>
                <GalleryTagSelector
                  selected={tags}
                  onChange={setTags}
                  customTag={customTag}
                  onCustomTagChange={setCustomTag}
                  onAddCustomTag={addCustomTag}
                />
              </ModalSection>
            </div>
          </div>

          {saveStatus && <p className="phlib-save-status">{saveStatus}</p>}
          {saving && uploadProgress != null && (
            <div
              className="gallery-bulk-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={uploadProgress}
            >
              <div className="gallery-bulk-progress-bar" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

          <div className="phlib-modal-ft">
            {mode === 'edit' && onDelete && initial && (
              <GalleryRemovePhotoAction
                disabled={saving}
                onConfirm={() => onDelete(initial.id)}
                resetKey={initial.id}
              />
            )}
            <div className="phlib-modal-ft-right">
              <button type="button" className="btn btn-o" onClick={() => void requestClose()} disabled={saving}>
                {tc('cancel')}
              </button>
              <button type="submit" className="btn btn-g" disabled={saving}>
                {saving ? tp('gallery', 'saving') : mode === 'edit' ? tc('save') : tp('gallery', 'upload')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

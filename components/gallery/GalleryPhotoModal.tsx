'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { EMPTY_GALLERY_PHOTO_FORM, PHOTO_LIBRARY_REGIONS } from '@/lib/gallery/gallery-tags';
import { formatBytes, photoSizeLabel, photoThumbUrl } from '@/lib/gallery/gallery-helpers';
import GalleryTagSelector from '@/components/gallery/GalleryTagSelector';
import GalleryUploadZone from '@/components/gallery/GalleryUploadZone';
import GalleryRemovePhotoAction from '@/components/gallery/GalleryRemovePhotoAction';

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
    <div className="overlay open" onClick={onClose}>
      <div className="modal phlib-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green phlib-modal-hd">
          <div>
            <div className="phlib-modal-title">{mode === 'edit' ? 'Edit photo' : 'Upload to library'}</div>
            <div className="phlib-modal-sub">
              {mode === 'edit' ? initial?.id : 'Sharp compresses to WebP before storage'}
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={saving}>
            ✕
          </button>
        </div>

        <form className="phlib-modal-bd" onSubmit={handleSubmit}>
          <ModalSection title="Image" hint={mode === 'add' ? 'JPEG, PNG, or WebP · max 10 MB each' : undefined}>
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
                Replace image file
              </label>
            )}
            {(mode === 'add' || replaceImage) && (
              <GalleryUploadZone
                label={mode === 'add' ? 'Drop photo here' : 'New image'}
                sublabel="or click to browse"
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
                  Add more files
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
                  <span className="phlib-multi-count">+{extraFiles.length} more</span>
                )}
              </div>
            )}
            {mode === 'edit' && initial?.displayBytes != null && (
              <p className="phlib-size-hint">Stored size: {photoSizeLabel(initial)} ({formatBytes(initial.displayBytes)})</p>
            )}
          </ModalSection>

          <ModalSection title="Details">
            <div className="fg">
              <label className="lbl">Caption</label>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Short description"
                disabled={saving}
                required={mode === 'edit' || Boolean(file)}
              />
            </div>
            <div className="fg">
              <label className="lbl">Region</label>
              <select value={region} onChange={(e) => setRegion(e.target.value)} disabled={saving}>
                {REGION_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </ModalSection>

          <ModalSection title="Tags">
            <GalleryTagSelector
              selected={tags}
              onChange={setTags}
              customTag={customTag}
              onCustomTagChange={setCustomTag}
              onAddCustomTag={addCustomTag}
            />
          </ModalSection>

          {saveStatus && <p className="phlib-save-status">{saveStatus}</p>}

          <div className="phlib-modal-ft">
            {mode === 'edit' && onDelete && initial && (
              <GalleryRemovePhotoAction
                disabled={saving}
                onConfirm={() => onDelete(initial.id)}
                resetKey={initial.id}
              />
            )}
            <div className="phlib-modal-ft-right">
              <button type="button" className="btn btn-o" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-g" disabled={saving}>
                {saving ? 'Saving…' : mode === 'edit' ? 'Save' : 'Upload'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import { EMPTY_GALLERY_PHOTO_FORM, type GalleryPhotoForm } from '@/lib/gallery-tags';
import { productPhotoSlotStatus } from '@/lib/gallery-helpers';
import GalleryTagSelector from '@/components/gallery/GalleryTagSelector';

export type GalleryPhotoRecord = {
  id: string;
  caption: string;
  region: string;
  product?: string;
  tags?: string[];
  url?: string;
};

interface Props {
  open: boolean;
  mode: 'add' | 'edit';
  initial?: GalleryPhotoRecord | null;
  products: Product[];
  existingPhotos?: GalleryPhotoRecord[];
  onClose: () => void;
  onSave: (data: GalleryPhotoForm, id?: string) => void;
}

export default function GalleryPhotoModal({ open, mode, initial, products, existingPhotos = [], onClose, onSave }: Props) {
  const [form, setForm] = useState<GalleryPhotoForm>({ ...EMPTY_GALLERY_PHOTO_FORM });
  const [customTag, setCustomTag] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setForm({
        caption: initial.caption || '',
        url: initial.url || '',
        url2: '',
        caption2: '',
        region: initial.region || 'north',
        product: initial.product || '',
        tags: Array.isArray(initial.tags) ? [...initial.tags] : [],
      });
    } else {
      setForm({ ...EMPTY_GALLERY_PHOTO_FORM });
    }
    setCustomTag('');
  }, [open, mode, initial]);

  const slotStatus = useMemo(() => {
    if (!form.product) return null;
    return productPhotoSlotStatus(existingPhotos, form.product);
  }, [existingPhotos, form.product]);

  if (!open) return null;

  function addCustomTag() {
    const t = customTag.trim();
    if (!t) return;
    if (!form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setCustomTag('');
  }

  function handleSave() {
    if (!form.caption.trim()) return;
    onSave(
      {
        ...form,
        caption: form.caption.trim(),
        url: form.url.trim(),
        url2: form.url2.trim(),
        caption2: form.caption2.trim(),
      },
      mode === 'edit' ? initial?.id : undefined
    );
  }

  const showDualSlots = mode === 'add' && !!form.product;

  return (
    <div className="modal-overlay open" onClick={onClose}>
      <div className="modal gallery-photo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gallery-photo-modal-hd">
          <span style={{ fontSize: 15, fontWeight: 600 }}>{mode === 'edit' ? 'Edit Photo' : 'Add Photo to Gallery'}</span>
          <button type="button" className="gallery-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {form.url && (
          <div className="gallery-modal-preview" style={{ backgroundImage: `url(${form.url})` }} />
        )}

        <div className="fg">
          <label className="lbl">Region</label>
          <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
            <option value="north">Northern Vietnam</option>
            <option value="central">Central Vietnam</option>
            <option value="south">Southern Vietnam</option>
            <option value="people">People & Culture</option>
          </select>
        </div>
        <div className="fg">
          <label className="lbl">Linked Tour Product</label>
          <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
            <option value="">— Not linked —</option>
            {products.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
          {slotStatus && (
            <div style={{ fontSize: 11, marginTop: 4, color: slotStatus.complete ? 'var(--g)' : 'var(--amb)' }}>
              {slotStatus.linked}/{slotStatus.needed} photos linked for tour preview
            </div>
          )}
        </div>

        {showDualSlots ? (
          <>
            <div style={{ fontSize: 11, color: 'var(--m)', marginBottom: 8, lineHeight: 1.5 }}>
              Tour Design shows 2 stacked photos per experience. Add both slots here, or only one — the second will use an automatic placeholder.
            </div>
            <div className="fg">
              <label className="lbl">Photo 1 (top) — URL</label>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://... or leave blank for placeholder" />
            </div>
            <div className="fg">
              <label className="lbl">Photo 1 — Caption / Title *</label>
              <input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Halong Bay at dawn..." />
            </div>
            <div className="fg">
              <label className="lbl">Photo 2 (bottom) — URL (optional)</label>
              <input value={form.url2} onChange={(e) => setForm({ ...form, url2: e.target.value })} placeholder="https://... second image for tour preview" />
            </div>
            <div className="fg">
              <label className="lbl">Photo 2 — Caption (optional)</label>
              <input value={form.caption2} onChange={(e) => setForm({ ...form, caption2: e.target.value })} placeholder="Limestone karst from above..." />
            </div>
          </>
        ) : (
          <>
            <div className="fg">
              <label className="lbl">Photo URL or Paste Image Link</label>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://... or leave blank for placeholder" />
            </div>
            <div className="fg">
              <label className="lbl">Caption / Title *</label>
              <input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} placeholder="Halong Bay at dawn..." />
            </div>
          </>
        )}

        <div className="fg">
          <label className="lbl">Tags</label>
          <GalleryTagSelector
            selected={form.tags}
            onChange={(tags) => setForm({ ...form, tags })}
            customTag={customTag}
            onCustomTagChange={setCustomTag}
            onAddCustomTag={addCustomTag}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button className="btn btn-s" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-p" type="button" onClick={handleSave} disabled={!form.caption.trim()}>
            {mode === 'edit' ? 'Save Changes' : showDualSlots && form.url2 ? 'Save 2 Photos' : 'Save Photo'}
          </button>
        </div>
      </div>
    </div>
  );
}

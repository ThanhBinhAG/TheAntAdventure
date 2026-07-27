'use client';

import { useEffect, useMemo } from 'react';
import type { Product } from '@/lib/types';
import type { GalleryPhoto } from '@/lib/tour-design-types';
import {
  photoDisplayUrl,
  photoSizeLabel,
  photoThumbUrl,
  type ProductPhotoSlots,
} from '@/lib/gallery-helpers';
import StorageImage from '@/components/media/StorageImage';
import GalleryRemovePhotoAction from '@/components/gallery/GalleryRemovePhotoAction';

export type TourPhotoEntry = {
  photo: GalleryPhoto;
  role: 'Preview top' | 'Preview bottom' | 'Stored';
  previewSlot?: 1 | 2;
};

export function buildTourPhotoList(slots: ProductPhotoSlots): TourPhotoEntry[] {
  const out: TourPhotoEntry[] = [];
  if (slots.slot1) out.push({ photo: slots.slot1, role: 'Preview top', previewSlot: 1 });
  if (slots.slot2) out.push({ photo: slots.slot2, role: 'Preview bottom', previewSlot: 2 });
  for (const p of slots.pool) {
    if (!out.some((e) => e.photo.id === p.id)) {
      out.push({ photo: p, role: 'Stored' });
    }
  }
  return out;
}

interface Props {
  open: boolean;
  product: Product;
  entries: TourPhotoEntry[];
  activeId: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onEdit: (photo: GalleryPhoto) => void;
  onDelete: (id: string) => void;
  onSetPreview: (photoId: string, slot: 1 | 2) => void;
  onAddPhotos: () => void;
}

export default function GalleryTourPhotoViewer({
  open,
  product,
  entries,
  activeId,
  onClose,
  onSelect,
  onEdit,
  onDelete,
  onSetPreview,
  onAddPhotos,
}: Props) {
  const active = entries.find((e) => e.photo.id === activeId) ?? entries[0];
  const displayUrl = active ? photoDisplayUrl(active.photo) : undefined;

  const activeIndex = useMemo(
    () => entries.findIndex((e) => e.photo.id === (active?.photo.id ?? '')),
    [entries, active?.photo.id]
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        const next = entries[activeIndex + 1];
        if (next) onSelect(next.photo.id);
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        const prev = entries[activeIndex - 1];
        if (prev) onSelect(prev.photo.id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, entries, activeIndex, onClose, onSelect]);

  if (!open || !entries.length || !active) return null;

  function handleEdit() {
    onEdit(active.photo);
  }

  return (
    <div className="modal-overlay open gallery-tour-viewer" onClick={onClose}>
      <div className="gallery-tour-viewer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="gallery-tour-viewer-hd">
          <div>
            <div className="gallery-tour-viewer-title">{product.name}</div>
            <div className="gallery-tour-viewer-code">{product.code}</div>
          </div>
          <button type="button" className="gallery-tour-viewer-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="gallery-tour-viewer-body">
          <div className="gallery-tour-viewer-main">
            <div className="gallery-tour-viewer-stage">
              {displayUrl ? (
                <StorageImage
                  src={displayUrl}
                  alt={active.photo.caption || 'Tour photo'}
                  fill
                  sizes="(max-width: 900px) 92vw, 1200px"
                  className="gallery-img-contain"
                />
              ) : (
                <div className="gallery-tour-viewer-empty">No image file</div>
              )}
            </div>
            <div className="gallery-tour-viewer-meta">
              <div className="gallery-tour-viewer-caption">{active.photo.caption || 'Untitled'}</div>
              <div className="gallery-tour-viewer-meta-row">
                <span className={`gallery-tour-viewer-role${active.previewSlot ? ' starred' : ''}`}>
                  {active.previewSlot ? `★ ${active.role}` : active.role}
                </span>
                <span className="gallery-slot-size">{photoSizeLabel(active.photo)}</span>
                <span className="gallery-tour-viewer-id">{active.photo.id}</span>
              </div>
            </div>
            <div className="gallery-tour-viewer-actions">
              <button
                type="button"
                className={`gallery-star-btn${active.previewSlot === 1 ? ' on' : ''}`}
                onClick={() => onSetPreview(active.photo.id, 1)}
              >
                {active.previewSlot === 1 ? '★' : '☆'} Preview top
              </button>
              <button
                type="button"
                className={`gallery-star-btn${active.previewSlot === 2 ? ' on' : ''}`}
                onClick={() => onSetPreview(active.photo.id, 2)}
              >
                {active.previewSlot === 2 ? '★' : '☆'} Preview bottom
              </button>
              <button type="button" className="btn btn-s btn-sm" onClick={handleEdit}>
                Edit details
              </button>
              <GalleryRemovePhotoAction
                resetKey={active.photo.id}
                onConfirm={() => onDelete(active.photo.id)}
              />
            </div>
          </div>

          <aside className="gallery-tour-viewer-side">
            <div className="gallery-tour-viewer-side-hd">
              <span>Tour photos</span>
              <span className="gallery-tour-viewer-count">{entries.length}</span>
            </div>
            <div className="gallery-tour-viewer-strip">
              {entries.map((entry) => {
                const thumb = photoThumbUrl(entry.photo);
                const isActive = entry.photo.id === active.photo.id;
                return (
                  <button
                    key={entry.photo.id}
                    type="button"
                    className={`gallery-tour-viewer-thumb${isActive ? ' active' : ''}${entry.previewSlot ? ' starred' : ''}`}
                    onClick={() => onSelect(entry.photo.id)}
                  >
                    <div className="gallery-tour-viewer-thumb-img">
                      {thumb ? (
                        <StorageImage src={thumb} alt={entry.photo.caption} fill sizes="140px" className="gallery-img-cover" />
                      ) : (
                        <div className="gallery-placeholder">🏔</div>
                      )}
                    </div>
                    <div className="gallery-tour-viewer-thumb-meta">
                      <span className="gallery-tour-viewer-thumb-role">
                        {entry.previewSlot ? `★ ${entry.role}` : entry.role}
                      </span>
                      <span className="gallery-tour-viewer-thumb-cap">{entry.photo.caption || 'Untitled'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <button type="button" className="btn btn-p btn-sm gallery-tour-viewer-add" onClick={onAddPhotos}>
              + Add photos
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

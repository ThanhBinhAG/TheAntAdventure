'use client';

import { useEffect } from 'react';
import type { GalleryPhoto } from '@/lib/tour-design-types';
import { photoDisplayUrl, photoSizeLabel, photoThumbUrl } from '@/lib/gallery-helpers';
import StorageImage from '@/components/media/StorageImage';
import GalleryRemovePhotoAction from '@/components/gallery/GalleryRemovePhotoAction';

interface Props {
  open: boolean;
  photos: GalleryPhoto[];
  activeId: string;
  title?: string;
  onClose: () => void;
  onSelect: (id: string) => void;
  onEdit: (photo: GalleryPhoto) => void;
  onDelete: (id: string) => void;
}

export default function GalleryLoosePhotoViewer({
  open,
  photos,
  activeId,
  title = 'Loose photos',
  onClose,
  onSelect,
  onEdit,
  onDelete,
}: Props) {
  const active = photos.find((p) => p.id === activeId) ?? photos[0];
  const displayUrl = active ? photoDisplayUrl(active) : undefined;
  const activeIndex = photos.findIndex((p) => p.id === active?.id);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        const next = photos[activeIndex + 1];
        if (next) onSelect(next.id);
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        const prev = photos[activeIndex - 1];
        if (prev) onSelect(prev.id);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, photos, activeIndex, onClose, onSelect]);

  if (!open || !photos.length || !active) return null;

  return (
    <div className="modal-overlay open gallery-tour-viewer" onClick={onClose}>
      <div className="gallery-tour-viewer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="gallery-tour-viewer-hd">
          <div>
            <div className="gallery-tour-viewer-title">{title}</div>
            <div className="gallery-tour-viewer-code">{photos.length} photos</div>
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
                  alt={active.caption || 'Photo'}
                  fill
                  sizes="(max-width: 900px) 92vw, 1200px"
                  className="gallery-img-contain"
                />
              ) : (
                <div className="gallery-tour-viewer-empty">No image file</div>
              )}
            </div>
            <div className="gallery-tour-viewer-meta">
              <div className="gallery-tour-viewer-caption">{active.caption || 'Untitled'}</div>
              <div className="gallery-tour-viewer-meta-row">
                <span className="gallery-tour-viewer-role">{active.region}</span>
                <span className="gallery-slot-size">{photoSizeLabel(active)}</span>
                <span className="gallery-tour-viewer-id">{active.id}</span>
              </div>
            </div>
            <div className="gallery-tour-viewer-actions">
              <button type="button" className="btn btn-s btn-sm" onClick={() => onEdit(active)}>
                Edit details
              </button>
              <GalleryRemovePhotoAction
                resetKey={active.id}
                onConfirm={() => onDelete(active.id)}
              />
            </div>
          </div>

          <aside className="gallery-tour-viewer-side">
            <div className="gallery-tour-viewer-side-hd">
              <span>All photos</span>
              <span className="gallery-tour-viewer-count">{photos.length}</span>
            </div>
            <div className="gallery-tour-viewer-strip">
              {photos.map((photo) => {
                const thumb = photoThumbUrl(photo);
                const isActive = photo.id === active.id;
                return (
                  <button
                    key={photo.id}
                    type="button"
                    className={`gallery-tour-viewer-thumb${isActive ? ' active' : ''}`}
                    onClick={() => onSelect(photo.id)}
                  >
                    <div className="gallery-tour-viewer-thumb-img">
                      {thumb ? (
                        <StorageImage src={thumb} alt={photo.caption} fill sizes="140px" className="gallery-img-cover" />
                      ) : (
                        <div className="gallery-placeholder">🏔</div>
                      )}
                    </div>
                    <div className="gallery-tour-viewer-thumb-meta">
                      <span className="gallery-tour-viewer-thumb-cap">{photo.caption || 'Untitled'}</span>
                      <span className="gallery-slot-size">{photoSizeLabel(photo)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useDraggable } from '@dnd-kit/core';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { photoSizeLabel, photoThumbUrl } from '@/lib/gallery/gallery-helpers';
import StorageImage from '@/components/gallery/StorageImage';

const REGION_COLORS: Record<string, string> = {
  north: '#2E7D52',
  central: '#856404',
  south: '#1565C0',
  people: '#6B21A8',
  services: '#555',
};

export function DraggablePhotoCard({
  photo,
  selected,
  onToggleSelect,
  onOpenLightbox,
  onEdit,
}: {
  photo: GalleryPhoto;
  selected: boolean;
  onToggleSelect: () => void;
  onOpenLightbox: () => void;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `gallery-photo-${photo.id}`,
    data: { photoId: photo.id, type: 'gallery-photo' },
  });
  const thumb = photoThumbUrl(photo) || photo.url;

  return (
    <article
      ref={setNodeRef}
      className={`phlib-card${selected ? ' selected' : ''}${isDragging ? ' dragging' : ''}`}
      {...listeners}
      {...attributes}
    >
      <div className="phlib-card-media">
        <button type="button" className="phlib-card-img-btn" onClick={onOpenLightbox}>
          {thumb ? (
            <StorageImage src={thumb} alt={photo.caption} fill className="phlib-img" sizes="280px" />
          ) : (
            <span className="phlib-missing">No image</span>
          )}
        </button>
        <span
          className="phlib-region-badge"
          style={{ background: REGION_COLORS[photo.region] || '#555' }}
        >
          {photo.region}
        </span>
        <label className="phlib-select" onPointerDown={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={selected} onChange={onToggleSelect} />
        </label>
        <div className="phlib-card-actions" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" onClick={onEdit}>
            Edit
          </button>
        </div>
      </div>
      <div className="phlib-card-body">
        <div className="phlib-card-caption">{photo.caption || photo.id}</div>
        <div className="phlib-card-meta">
          <span>{photoSizeLabel(photo)}</span>
          {(photo.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="phlib-tag">
              {t}
            </span>
          ))}
        </div>
      </div>
    </article>
  );
}

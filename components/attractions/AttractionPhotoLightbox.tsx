'use client';

import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { photoDisplayUrl } from '@/lib/gallery/gallery-helpers';
import StorageImage from '@/components/gallery/StorageImage';

type Photo = GalleryPhoto;

type Props = {
  open: boolean;
  photos: Photo[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
};

export default function AttractionPhotoLightbox({ open, photos, index, onClose, onNavigate }: Props) {
  if (!open || !photos.length) return null;

  const photo = photos[index] ?? photos[0];
  const displayUrl = photo ? photoDisplayUrl(photo) : undefined;
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  return (
    <div className="modal-overlay open att-lightbox" onClick={onClose}>
      <div className="att-lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="att-lightbox-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {hasPrev && (
          <button type="button" className="att-lightbox-nav att-lightbox-prev" onClick={() => onNavigate(index - 1)}>
            ‹
          </button>
        )}
        {displayUrl ? (
          <StorageImage src={displayUrl} alt={photo.caption || 'Attraction photo'} width={960} height={640} className="att-lightbox-img" />
        ) : (
          <div className="att-lightbox-placeholder">No image</div>
        )}
        {hasNext && (
          <button type="button" className="att-lightbox-nav att-lightbox-next" onClick={() => onNavigate(index + 1)}>
            ›
          </button>
        )}
        <div className="att-lightbox-caption">
          {photo?.caption || ''} {photos.length > 1 ? `(${index + 1}/${photos.length})` : ''}
        </div>
      </div>
    </div>
  );
}

'use client';

import type { Attraction } from '@/lib/types';
import type { GalleryPhoto } from '@/lib/tour-design-types';
import { photoDisplayUrl, photoThumbUrl } from '@/lib/gallery-helpers';
import { getNonDuplicateAlert } from '@/lib/attractions-helpers';
import StorageImage from '@/components/media/StorageImage';

type Props = {
  attraction: Attraction;
  photos: GalleryPhoto[];
  onPhotoClick: (index: number) => void;
  onEdit: () => void;
  galleryHref: string;
};

export default function AttractionExpandPanel({ attraction, photos, onPhotoClick, onEdit, galleryHref }: Props) {
  const alert = getNonDuplicateAlert(attraction.alert, attraction.closed);

  return (
    <div className="att-expand">
      <div className="att-expand-left">
        <div className="att-expand-label">Description</div>
        <p className="att-expand-desc">{attraction.notes || 'No description yet.'}</p>
        <div className="att-expand-meta">
          {attraction.duration > 0 && (
            <span className="att-meta-pill">⏱ {attraction.duration} min visit</span>
          )}
          {attraction.book_req && <span className="att-meta-pill att-meta-warn">📅 Booking required</span>}
          {alert && <span className="att-meta-pill att-meta-alert">⚠ {alert}</span>}
          {attraction.seasonal && attraction.seasonal !== 'No seasonal closures' && (
            <span className="att-meta-pill">🗓 {attraction.seasonal}</span>
          )}
        </div>
        <div className="att-expand-actions">
          <a href={galleryHref} className="btn btn-s btn-sm">
            Open in Gallery
          </a>
        </div>
      </div>
      <div className="att-expand-right">
        {photos.length ? (
          <div className="att-photo-grid">
            {photos.map((photo, index) => {
              const thumb = photoThumbUrl(photo);
              return (
              <button
                key={photo.id}
                type="button"
                className="att-photo-thumb"
                onClick={() => onPhotoClick(index)}
                title={photo.caption || attraction.name}
              >
                {thumb ? (
                  <StorageImage src={thumb} alt={photo.caption || attraction.name} fill className="att-photo-thumb-img" />
                ) : null}
              </button>
            );
            })}
          </div>
        ) : (
          <div className="att-photo-empty">
            <div>No photos linked yet.</div>
            <button type="button" className="btn btn-s btn-sm" onClick={onEdit}>
              Edit to add from Gallery
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

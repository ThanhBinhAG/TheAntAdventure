'use client';

import { useMemo, useState } from 'react';
import type { Product } from '@/lib/types';
import type { GalleryPhoto } from '@/lib/tour-design-types';
import {
  formatBytes,
  photoSizeLabel,
  photoThumbUrl,
  productPhotoSlotStatus,
  type ProductPhotoSlots,
} from '@/lib/gallery-helpers';
import StorageImage from '@/components/media/StorageImage';
import GalleryTourPhotoViewer, { buildTourPhotoList } from '@/components/gallery/GalleryTourPhotoViewer';

interface Props {
  product: Product;
  slots: ProductPhotoSlots;
  highlighted?: boolean;
  defaultPoolOpen?: boolean;
  onAddPhotos: () => void;
  onSetPreview: (photoId: string, slot: 1 | 2) => void;
  onEdit: (photo: GalleryPhoto) => void;
  onDelete: (photoId: string) => void;
}

function ThumbButton({
  label,
  starred,
  photo,
  onClick,
}: {
  label: string;
  starred?: boolean;
  photo: GalleryPhoto | null;
  onClick: () => void;
}) {
  const thumb = photo ? photoThumbUrl(photo) : null;

  return (
    <div className="gallery-pair-slot">
      <div className="gallery-pair-slot-label">
        {label}
        {starred && <span className="gallery-pair-star-indicator">★</span>}
      </div>
      <button
        type="button"
        className={`gallery-pair-slot-img gallery-pair-thumb-btn${photo ? '' : ' empty'}`}
        onClick={onClick}
        title={photo ? 'View and manage' : 'Add photos'}
      >
        {thumb && photo ? (
          <StorageImage src={thumb} alt={photo.caption} fill sizes="(max-width: 768px) 90vw, 480px" className="gallery-img-cover" />
        ) : (
          <span className="gallery-slot-empty-inner">
            <span className="gallery-slot-empty-icon">+</span>
            <span>Add photo</span>
          </span>
        )}
      </button>
      {photo ? (
        <>
          <div className="gallery-pair-slot-caption" title={photo.caption}>
            {photo.caption || 'Untitled'}
          </div>
          <div className="gallery-slot-size">{photoSizeLabel(photo)}</div>
        </>
      ) : (
        <div className="gallery-slot-size muted">—</div>
      )}
    </div>
  );
}

export default function GalleryTourPairCard({
  product,
  slots,
  highlighted = false,
  onAddPhotos,
  onSetPreview,
  onEdit,
  onDelete,
}: Props) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPhotoId, setViewerPhotoId] = useState('');

  const entries = useMemo(() => buildTourPhotoList(slots), [slots]);
  const status = productPhotoSlotStatus(
    [slots.slot1, slots.slot2, ...slots.pool].filter(Boolean) as GalleryPhoto[],
    product.code
  );

  const storedCount = slots.pool.length;

  function openViewer(photoId?: string) {
    const id = photoId ?? entries[0]?.photo.id;
    if (!id && !entries.length) {
      onAddPhotos();
      return;
    }
    if (id) {
      setViewerPhotoId(id);
      setViewerOpen(true);
    }
  }

  function handleDelete(id: string) {
    const idx = entries.findIndex((e) => e.photo.id === id);
    onDelete(id);
    const remaining = entries.filter((e) => e.photo.id !== id);
    if (!remaining.length) {
      setViewerOpen(false);
      return;
    }
    const next = remaining[Math.min(idx, remaining.length - 1)];
    if (next) setViewerPhotoId(next.photo.id);
  }

  return (
    <>
      <div
        id={`gallery-tour-${product.code}`}
        className={`gallery-tour-card${highlighted ? ' highlighted' : ''}`}
      >
        <div className="gallery-tour-card-hd">
          <div className="gallery-tour-card-title">
            <span className="gallery-tour-code">{product.code}</span>
            <span className="gallery-tour-name">{product.name}</span>
          </div>
          <span className={`bdg ${status.complete ? 'bdg-g' : status.linked > 0 ? 'bdg-a' : 'bdg-s'}`}>
            ★ {status.linked}/{status.needed}
            {status.complete ? ' ✓' : ''}
          </span>
        </div>

        <div className="gallery-pair-slots">
          <ThumbButton
            label="Preview top"
            starred={Boolean(slots.slot1)}
            photo={slots.slot1}
            onClick={() => (slots.slot1 ? openViewer(slots.slot1.id) : onAddPhotos())}
          />
          <ThumbButton
            label="Preview bottom"
            starred={Boolean(slots.slot2)}
            photo={slots.slot2}
            onClick={() => (slots.slot2 ? openViewer(slots.slot2.id) : onAddPhotos())}
          />
        </div>

        <div className="gallery-tour-pair-total">
          Starred pair size:{' '}
          <strong>
            {slots.slot1 || slots.slot2
              ? formatBytes((slots.slot1?.displayBytes ?? 0) + (slots.slot2?.displayBytes ?? 0))
              : '—'}
          </strong>
        </div>

        {entries.length > 0 ? (
          <button type="button" className="gallery-tour-manage-btn" onClick={() => openViewer()}>
            Manage {entries.length} photo{entries.length === 1 ? '' : 's'}
            {storedCount > 0 ? ` · ${storedCount} stored` : ''}
          </button>
        ) : (
          <button type="button" className="btn btn-s btn-sm gallery-tour-add-btn" onClick={onAddPhotos}>
            + Add photos
          </button>
        )}
      </div>

      <GalleryTourPhotoViewer
        open={viewerOpen}
        product={product}
        entries={entries}
        activeId={viewerPhotoId}
        onClose={() => setViewerOpen(false)}
        onSelect={setViewerPhotoId}
        onEdit={(photo) => {
          setViewerOpen(false);
          onEdit(photo);
        }}
        onDelete={handleDelete}
        onSetPreview={onSetPreview}
        onAddPhotos={() => {
          setViewerOpen(false);
          onAddPhotos();
        }}
      />
    </>
  );
}

'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { PHOTO_LIBRARY_REGIONS } from '@/lib/gallery/gallery-tags';
import { photoThumbUrl } from '@/lib/gallery/gallery-helpers';
import { photoMatchesSearchQuery } from '@/lib/gallery/fold-search';
import { nextFeaturedAfterLink, nextSelectionAfterLinkToggle } from '@/lib/gallery/photo-link-selection';
import StorageImage from '@/components/gallery/StorageImage';
import EmptyState from '@/components/EmptyState';

type PhotoApply = { linkedPhotoIds: string[]; photoIds: string[] };

type Props = {
  /** Modal overlay (Apply/Cancel) or inline panel (live onChange). */
  variant?: 'modal' | 'inline';
  open?: boolean;
  title?: string;
  photos: GalleryPhoto[];
  linkedPhotoIds: string[];
  featuredPhotoIds: string[];
  maxFeatured?: number;
  onClose?: () => void;
  onApply?: (next: PhotoApply) => void;
  /** Live updates for inline variant. */
  onChange?: (next: PhotoApply) => void;
};

function SlotDrop({
  id,
  label,
  photo,
  onClear,
}: {
  id: string;
  label: string;
  photo: GalleryPhoto | null;
  onClear: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const thumb = photo ? photoThumbUrl(photo) || photo.url : null;
  return (
    <div ref={setNodeRef} className={`phlib-slot${isOver ? ' over' : ''}${photo ? ' filled' : ''}`}>
      <div className="phlib-slot-lbl">{label}</div>
      {thumb ? (
        <div className="phlib-slot-thumb">
          <StorageImage src={thumb} alt={photo?.caption || label} fill sizes="120px" className="phlib-img" />
          <button type="button" className="phlib-slot-clear" onClick={onClear} aria-label={`Clear ${label}`}>
            ✕
          </button>
        </div>
      ) : (
        <div className="phlib-slot-empty">Drop photo here</div>
      )}
    </div>
  );
}

function LinkedDrop({
  photos,
  onUnlink,
}: {
  photos: GalleryPhoto[];
  onUnlink: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'linked-pool' });
  return (
    <div ref={setNodeRef} className={`phlib-linked-drop${isOver ? ' over' : ''}`}>
      <div className="phlib-slot-lbl">Linked pool · drag photos here</div>
      {photos.length === 0 ? (
        <div className="phlib-linked-empty">No linked photos yet</div>
      ) : (
        <div className="phlib-linked-strip">
          {photos.map((p) => {
            const thumb = photoThumbUrl(p) || p.url;
            return (
              <div key={p.id} className="phlib-linked-chip" title={p.caption || p.id}>
                {thumb ? (
                  <StorageImage src={thumb} alt={p.caption || p.id} fill sizes="48px" className="phlib-img" />
                ) : null}
                <button type="button" className="phlib-linked-chip-x" onClick={() => onUnlink(p.id)} aria-label="Unlink">
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DraggablePhotoCard({
  photo,
  isLinked,
  isFeatured,
  onToggleLink,
  onToggleFeatured,
  featuredFull,
}: {
  photo: GalleryPhoto;
  isLinked: boolean;
  isFeatured: boolean;
  onToggleLink: () => void;
  onToggleFeatured: () => void;
  featuredFull: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `photo-${photo.id}`,
    data: { photoId: photo.id },
  });
  const thumb = photoThumbUrl(photo) || photo.url;

  return (
    <div
      ref={setNodeRef}
      className={`phlib-picker-card${isLinked ? ' linked' : ''}${isDragging ? ' dragging' : ''}`}
    >
      <button
        type="button"
        className="phlib-picker-thumb"
        onClick={onToggleLink}
        {...listeners}
        {...attributes}
      >
        {thumb ? (
          <StorageImage src={thumb} alt={photo.caption} fill className="phlib-img" sizes="160px" />
        ) : (
          <span className="phlib-missing">No image</span>
        )}
        {isLinked && <span className="phlib-check">✓</span>}
      </button>
      <div className="phlib-picker-meta">
        <div className="phlib-picker-caption" title={photo.caption}>
          {photo.caption || photo.id}
        </div>
        <button
          type="button"
          className={`phlib-feat-btn${isFeatured ? ' on' : ''}`}
          disabled={!isLinked && featuredFull}
          onClick={onToggleFeatured}
        >
          {isFeatured ? 'Featured' : 'Feature'}
        </button>
      </div>
    </div>
  );
}

export default function PhotoLibraryPicker({
  variant = 'modal',
  open = true,
  title = 'Choose from Photo Library',
  photos,
  linkedPhotoIds,
  featuredPhotoIds,
  maxFeatured = 2,
  onClose,
  onApply,
  onChange,
}: Props) {
  const isInline = variant === 'inline';
  const pickerKey = `${isInline ? 'inline' : open}-${linkedPhotoIds.join(',')}-${featuredPhotoIds.join(',')}`;
  const [previousPickerKey, setPreviousPickerKey] = useState(pickerKey);
  const [linked, setLinked] = useState<string[]>(linkedPhotoIds);
  const [featured, setFeatured] = useState<string[]>(featuredPhotoIds);
  const [region, setRegion] = useState('all');
  const [q, setQ] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  if (pickerKey !== previousPickerKey) {
    setPreviousPickerKey(pickerKey);
    setLinked([...linkedPhotoIds]);
    setFeatured([...featuredPhotoIds]);
    if (!isInline) {
      setRegion('all');
      setQ('');
    }
  }

  const emit = (nextLinked: string[], nextFeatured: string[]) => {
    const payload: PhotoApply = {
      linkedPhotoIds: nextLinked,
      photoIds: nextFeatured.filter((id) => nextLinked.includes(id)).slice(0, maxFeatured),
    };
    if (isInline) onChange?.(payload);
  };

  const setBoth = (nextLinked: string[], nextFeatured: string[]) => {
    const cleanedFeatured = nextFeatured.filter((id) => nextLinked.includes(id)).slice(0, maxFeatured);
    setLinked(nextLinked);
    setFeatured(cleanedFeatured);
    emit(nextLinked, cleanedFeatured);
  };

  const filtered = useMemo(() => {
    return photos.filter((p) => {
      if (region !== 'all' && p.region !== region) return false;
      return photoMatchesSearchQuery(p, q);
    });
  }, [photos, region, q]);

  const byId = useMemo(() => new Map(photos.map((p) => [p.id, p])), [photos]);

  const featuredSlots: (GalleryPhoto | null)[] = [
    featured[0] ? byId.get(featured[0]) ?? null : null,
    featured[1] ? byId.get(featured[1]) ?? null : null,
  ];

  const linkedPhotos = linked
    .map((id) => byId.get(id))
    .filter((p): p is GalleryPhoto => Boolean(p));

  if (!isInline && !open) return null;

  function toggleLink(id: string) {
    const next = nextSelectionAfterLinkToggle(linked, featured, id, maxFeatured);
    setBoth(next.linked, next.featured);
  }

  function toggleFeatured(id: string) {
    let nextLinked = linked;
    if (!linked.includes(id)) nextLinked = [...linked, id];
    if (featured.includes(id)) {
      setBoth(
        nextLinked,
        featured.filter((x) => x !== id)
      );
      return;
    }
    if (featured.length >= maxFeatured) return;
    setBoth(nextLinked, [...featured, id]);
  }

  function clearFeaturedAt(index: number) {
    const id = featured[index];
    if (!id) return;
    setBoth(
      linked,
      featured.filter((_, i) => i !== index)
    );
  }

  function unlink(id: string) {
    setBoth(
      linked.filter((x) => x !== id),
      featured.filter((x) => x !== id)
    );
  }

  function handleDragStart(e: DragStartEvent) {
    const photoId = e.active.data.current?.photoId as string | undefined;
    setActiveId(photoId ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const photoId = e.active.data.current?.photoId as string | undefined;
    const overId = e.over?.id;
    if (!photoId || !overId) return;

    if (overId === 'linked-pool') {
      if (linked.includes(photoId)) return;
      setBoth(
        [...linked, photoId],
        nextFeaturedAfterLink(featured, photoId, maxFeatured)
      );
      return;
    }
    if (overId === 'featured-0' || overId === 'featured-1') {
      const slot = overId === 'featured-0' ? 0 : 1;
      const nextLinked = linked.includes(photoId) ? linked : [...linked, photoId];
      const without = featured.filter((id) => id !== photoId);
      if (slot === 0) {
        setBoth(nextLinked, [photoId, ...without].slice(0, maxFeatured));
      } else {
        const first = without[0];
        setBoth(nextLinked, (first ? [first, photoId] : [photoId]).slice(0, maxFeatured));
      }
    }
  }

  const activePhoto = activeId ? byId.get(activeId) : null;
  const activeThumb = activePhoto ? photoThumbUrl(activePhoto) || activePhoto.url : null;

  const body = (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="phlib-picker-slots">
        <SlotDrop
          id="featured-0"
          label="Featured 1"
          photo={featuredSlots[0]}
          onClear={() => clearFeaturedAt(0)}
        />
        <SlotDrop
          id="featured-1"
          label="Featured 2"
          photo={featuredSlots[1]}
          onClear={() => clearFeaturedAt(1)}
        />
      </div>
      <LinkedDrop photos={linkedPhotos} onUnlink={unlink} />

      <div className="phlib-picker-toolbar">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Search tags… e.g. "Can Tho" or CanTho'
          className="phlib-search"
        />
        <div className="phlib-region-tabs">
          {PHOTO_LIBRARY_REGIONS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`phlib-region-tab${region === r.id ? ' on' : ''}`}
              onClick={() => setRegion(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="phlib-picker-count">
          {linked.length} linked · {featured.length}/{maxFeatured} featured · {filtered.length} shown
        </div>
      </div>

      <div className={`phlib-picker-grid${isInline ? ' phlib-picker-grid--inline' : ''}`}>
        {filtered.map((p) => (
          <DraggablePhotoCard
            key={p.id}
            photo={p}
            isLinked={linked.includes(p.id)}
            isFeatured={featured.includes(p.id)}
            onToggleLink={() => toggleLink(p.id)}
            onToggleFeatured={() => toggleFeatured(p.id)}
            featuredFull={featured.length >= maxFeatured}
          />
        ))}
        {!filtered.length && (
          <EmptyState
            className="crm-empty-state--flush crm-empty-state--inline"
            size="compact"
            variant="photos"
            title="No photos match this filter"
            description="Try another region or clear the search."
          />
        )}
      </div>

      <DragOverlay>
        {activeThumb ? (
          <div className="phlib-drag-overlay">
            <StorageImage src={activeThumb} alt="" fill sizes="80px" className="phlib-img" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );

  if (isInline) {
    return (
      <div className="phlib-picker-inline">
        {title && <div className="phlib-picker-inline-title">{title}</div>}
        {body}
      </div>
    );
  }

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="modal phlib-picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-hd modal-hd-green phlib-modal-hd">
          <div>
            <div className="phlib-modal-title">{title}</div>
            <div className="phlib-modal-sub">
              {linked.length} linked · {featured.length}/{maxFeatured} featured · drag onto slots
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        {body}
        <div className="phlib-modal-ft">
          <div />
          <div className="phlib-modal-ft-right">
            <button type="button" className="btn btn-o" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-g"
              onClick={() =>
                onApply?.({
                  linkedPhotoIds: linked,
                  photoIds: featured.filter((id) => linked.includes(id)).slice(0, maxFeatured),
                })
              }
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

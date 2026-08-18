'use client';

import { useMemo, useState } from 'react';
import { useEnsureGalleryTablesLoaded } from '@/hooks/useEnsureGalleryTablesLoaded';
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
import {
  childFolders,
  countPhotosInFolder,
  ensureUnsortedFolder,
  folderBreadcrumb,
  UNSORTED_FOLDER_ID,
  type PhotoFolder,
} from '@/lib/gallery/photo-folders';
import StorageImage from '@/components/gallery/StorageImage';
import GalleryFolderGrid from '@/components/gallery/GalleryFolderGrid';
import EmptyState from '@/components/EmptyState';

type PhotoApply = { linkedPhotoIds: string[]; photoIds: string[] };

type Props = {
  /** Modal overlay (Apply/Cancel) or inline panel (live onChange). */
  variant?: 'modal' | 'inline';
  /** Multi = product library slots; single = pick one photo (e.g. company logo). */
  mode?: 'multi' | 'single';
  open?: boolean;
  title?: string;
  photos: GalleryPhoto[];
  folders?: PhotoFolder[];
  linkedPhotoIds: string[];
  featuredPhotoIds: string[];
  maxFeatured?: number;
  onClose?: () => void;
  onApply?: (next: PhotoApply) => void;
  /** Live updates for inline variant. */
  onChange?: (next: PhotoApply) => void;
  /** Fired when user picks a photo in single mode (click). */
  onPick?: (photo: GalleryPhoto) => void;
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
  mode = 'multi',
  open = true,
  title = 'Choose from Photo Library',
  photos,
  folders: foldersProp,
  linkedPhotoIds,
  featuredPhotoIds,
  maxFeatured = 2,
  onClose,
  onApply,
  onChange,
  onPick,
}: Props) {
  const isInline = variant === 'inline';
  const isSingle = mode === 'single';
  const galleryLoadEnabled = isInline || open;
  const { loading: galleryLoading } = useEnsureGalleryTablesLoaded(galleryLoadEnabled);
  const folders = useMemo(
    () => ensureUnsortedFolder(foldersProp ?? []),
    [foldersProp]
  );
  const pickerKey = `${isInline ? 'inline' : open}-${linkedPhotoIds.join(',')}-${featuredPhotoIds.join(',')}`;
  const [previousPickerKey, setPreviousPickerKey] = useState(pickerKey);
  const [linked, setLinked] = useState<string[]>(linkedPhotoIds);
  const [featured, setFeatured] = useState<string[]>(featuredPhotoIds);
  const [region, setRegion] = useState('all');
  const [q, setQ] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);

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
      setFolderId(null);
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

  const breadcrumb = useMemo(() => folderBreadcrumb(folders, folderId), [folders, folderId]);
  const subfolders = useMemo(() => childFolders(folders, folderId), [folders, folderId]);
  const rootFolders = useMemo(() => childFolders(folders, null), [folders]);
  const atRoot = folderId === null;

  const photoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of folders) {
      counts[f.id] = countPhotosInFolder(photos, f.id);
    }
    return counts;
  }, [folders, photos]);

  const filtered = useMemo(() => {
    if (atRoot) return [];
    return photos.filter((p) => {
      if (folderId && (p.folderId || UNSORTED_FOLDER_ID) !== folderId) return false;
      if (region !== 'all' && p.region !== region) return false;
      return photoMatchesSearchQuery(p, q);
    });
  }, [photos, region, q, folderId, atRoot]);

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

  const folderBar = (
    <>
      <div className="phlib-picker-folder-bar">
        <nav className="phlib-breadcrumb" aria-label="Folder">
          <button type="button" className="phlib-breadcrumb-item" onClick={() => setFolderId(null)}>
            All folders
          </button>
          {breadcrumb.map((f) => (
            <span key={f.id} className="phlib-breadcrumb-seg">
              <span className="phlib-breadcrumb-sep" aria-hidden>
                /
              </span>
              <button type="button" className="phlib-breadcrumb-item" onClick={() => setFolderId(f.id)}>
                {f.name}
              </button>
            </span>
          ))}
        </nav>
      </div>

      {atRoot ? (
        <div className="phlib-picker-root">
          <p className="phlib-picker-hint">
            {galleryLoading && (foldersProp?.length ?? 0) === 0
              ? 'Đang tải thư mục…'
              : `${rootFolders.length} folder${rootFolders.length === 1 ? '' : 's'} · open one to browse photos`}
          </p>
          {galleryLoading && (foldersProp?.length ?? 0) === 0 ? (
            <p className="phlib-picker-hint" aria-busy="true">
              Đang tải thư viện ảnh…
            </p>
          ) : rootFolders.length ? (
            <GalleryFolderGrid
              folders={rootFolders}
              photoCounts={photoCounts}
              onOpen={(id) => setFolderId(id)}
            />
          ) : (
            <EmptyState
              className="crm-empty-state--flush crm-empty-state--inline"
              size="compact"
              variant="photos"
              title="No folders yet"
              description="Create folders in the Photo Gallery first."
            />
          )}
        </div>
      ) : (
        <>
          {subfolders.length > 0 && (
            <div className="phlib-picker-subfolders">
              <p className="phlib-picker-hint">Subfolders</p>
              <GalleryFolderGrid
                folders={subfolders}
                photoCounts={photoCounts}
                onOpen={(id) => setFolderId(id)}
              />
            </div>
          )}
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
              {isSingle
                ? `${filtered.length} shown · click a photo to select`
                : `${linked.length} linked · ${featured.length}/${maxFeatured} featured · ${filtered.length} shown`}
            </div>
          </div>
          <div className={`phlib-picker-grid${isInline ? ' phlib-picker-grid--inline' : ''}`}>
            {filtered.map((p) =>
              isSingle ? (
                <button
                  key={p.id}
                  type="button"
                  className="phlib-picker-card phlib-picker-card--pick"
                  onClick={() => onPick?.(p)}
                >
                  <span className="phlib-picker-thumb">
                    {photoThumbUrl(p) || p.url ? (
                      <StorageImage
                        src={photoThumbUrl(p) || p.url}
                        alt={p.caption}
                        fill
                        className="phlib-img"
                        sizes="160px"
                      />
                    ) : (
                      <span className="phlib-missing">No image</span>
                    )}
                  </span>
                  <span className="phlib-picker-meta">
                    <span className="phlib-picker-caption" title={p.caption}>
                      {p.caption || p.id}
                    </span>
                  </span>
                </button>
              ) : (
                <DraggablePhotoCard
                  key={p.id}
                  photo={p}
                  isLinked={linked.includes(p.id)}
                  isFeatured={featured.includes(p.id)}
                  onToggleLink={() => toggleLink(p.id)}
                  onToggleFeatured={() => toggleFeatured(p.id)}
                  featuredFull={featured.length >= maxFeatured}
                />
              )
            )}
            {!filtered.length && (
              <EmptyState
                className="crm-empty-state--flush crm-empty-state--inline"
                size="compact"
                variant="photos"
                title="No photos in this folder"
                description="Try another folder or clear the search."
              />
            )}
          </div>
        </>
      )}
    </>
  );

  const body = isSingle ? (
    <div className="phlib-picker-single">{folderBar}</div>
  ) : (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="phlib-picker-body">
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
        {folderBar}
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
              {isSingle
                ? atRoot
                  ? 'Open a folder, then click a photo'
                  : 'Click a photo to select'
                : `${linked.length} linked · ${featured.length}/${maxFeatured} featured · drag onto slots`}
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        {body}
        {!isSingle && (
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
        )}
      </div>
    </div>
  );
}

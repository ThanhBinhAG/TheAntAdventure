'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/hooks/useStore';
import {
  ensureTablesLoaded,
  persistRouteCacheFromStore,
  pushTablesToSupabase,
} from '@/lib/db/hydrate';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { PHOTO_LIBRARY_REGIONS } from '@/lib/gallery/gallery-tags';
import {
  formatBytes,
  photoDisplayUrl,
  photoThumbUrl,
} from '@/lib/gallery/gallery-helpers';
import { photoMatchesSearchQuery, matchesFoldedQuery } from '@/lib/gallery/fold-search';
import { deletePhotoViaApi, uploadPhotoViaApi } from '@/lib/gallery/photo-api';
import {
  canDeleteFolder,
  childFolders,
  countPhotosInFolder,
  createFolder,
  ensureUnsortedFolder,
  folderBreadcrumb,
  folderById,
  renameFolder,
  UNSORTED_FOLDER_ID,
  type PhotoFolder,
} from '@/lib/gallery/photo-folders';
import StorageImage from '@/components/gallery/StorageImage';
import { toast } from '@/lib/toast';
import { usePagePermission } from '@/hooks/usePagePermission';
import GalleryPhotoModal, {
  type GalleryModalMode,
  type GalleryPhotoRecord,
  type GalleryPhotoSavePayload,
} from '@/components/gallery/GalleryPhotoModal';
import GalleryFolderBreadcrumb from '@/components/gallery/GalleryFolderBreadcrumb';
import GalleryFolderGrid from '@/components/gallery/GalleryFolderGrid';
import GalleryMovePhotosModal from '@/components/gallery/GalleryMovePhotosModal';
import GalleryFolderNameModal from '@/components/gallery/GalleryFolderNameModal';
import GalleryFolderInfoModal from '@/components/gallery/GalleryFolderInfoModal';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { confirmDialog } from '@/lib/confirm';
import { DraggablePhotoCard } from '@/components/gallery/GalleryDraggablePhotoCard';

/** One Sharp/upload at a time to avoid RAM spikes on heavy originals. */
const GALLERY_UPLOAD_CONCURRENCY = 1;
const GALLERY_DELETE_CONCURRENCY = 3;

function syncGalleryRouteCache() {
  persistRouteCacheFromStore('gallery');
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]!, index);
    }
  });
  await Promise.all(workers);
}

function allocatePhotoIds(existing: GalleryPhoto[], count: number): string[] {
  let max = existing.reduce((n, p) => {
    const num = parseInt(p.id.replace(/^PH-/, ''), 10);
    return Number.isFinite(num) ? Math.max(n, num) : n;
  }, 0);
  return Array.from({ length: count }, () => {
    max += 1;
    return `PH-${String(max).padStart(3, '0')}`;
  });
}


export default function GalleryWorkspace() {
  const { canWrite } = usePagePermission('gallery');
  const searchParams = useSearchParams();
  const photoFilter = searchParams.get('photo') || '';
  const attractionFilter = searchParams.get('attraction') || '';

  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const rawFolders = useStore((s) => s.photoFolders) as PhotoFolder[];
  const attractions = useStore((s) => s.attractions);

  const folders = useMemo(() => ensureUnsortedFolder(rawFolders), [rawFolders]);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [region, setRegion] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<GalleryModalMode>('add');
  const [editing, setEditing] = useState<GalleryPhotoRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<GalleryPhoto | null>(null);
  const [dismissedPhotoFilter, setDismissedPhotoFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [dragPhotoId, setDragPhotoId] = useState<string | null>(null);
  const [folderNameModal, setFolderNameModal] = useState<
    null | { mode: 'create' } | { mode: 'rename'; folder: PhotoFolder }
  >(null);
  const [infoFolder, setInfoFolder] = useState<PhotoFolder | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    if (rawFolders.length === 0 && folders.some((f) => f.id === UNSORTED_FOLDER_ID)) {
      useStore.setState({ photoFolders: folders });
    }
  }, [rawFolders.length, folders]);

  /** Attractions are not in gallery boot — load only when filtering by attraction. */
  useEffect(() => {
    if (!attractionFilter) return;
    void ensureTablesLoaded(['attractions']);
  }, [attractionFilter]);

  const filteredPhotoLightbox =
    photoFilter && dismissedPhotoFilter !== photoFilter
      ? photos.find((photo) => photo.id === photoFilter) ?? null
      : null;
  const activeLightbox = filteredPhotoLightbox ?? lightbox;

  const breadcrumb = useMemo(
    () => folderBreadcrumb(folders, currentFolderId),
    [folders, currentFolderId]
  );
  const currentFolder = folderById(folders, currentFolderId);
  const childFolderList = useMemo(
    () => childFolders(folders, currentFolderId),
    [folders, currentFolderId]
  );

  const photoCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of folders) {
      counts[f.id] = countPhotosInFolder(photos, f.id);
    }
    return counts;
  }, [folders, photos]);

  /** Folders visible in the current level, filtered by live search at root / nested. */
  const visibleFolders = useMemo(() => {
    const base = childFolderList;
    const query = q.trim();
    if (!query) return base;
    return base.filter((f) => {
      if (matchesFoldedQuery(f.name, query) || matchesFoldedQuery(f.id, query)) return true;
      return photos.some(
        (p) =>
          (p.folderId || UNSORTED_FOLDER_ID) === f.id && photoMatchesSearchQuery(p, query)
      );
    });
  }, [childFolderList, photos, q]);

  const folderPhotos = useMemo(() => {
    if (!currentFolderId) return [] as GalleryPhoto[];
    return photos.filter((p) => (p.folderId || UNSORTED_FOLDER_ID) === currentFolderId);
  }, [photos, currentFolderId]);

  const filtered = useMemo(() => {
    let list = folderPhotos;
    if (attractionFilter) {
      const att = attractions.find((a) => a.id === attractionFilter);
      const ids = new Set([...(att?.linkedPhotoIds ?? []), ...(att?.photoIds ?? [])]);
      if (ids.size) list = list.filter((p) => ids.has(p.id));
    }
    return list.filter((p) => {
      if (region !== 'all' && p.region !== region) return false;
      return photoMatchesSearchQuery(p, q);
    });
  }, [folderPhotos, region, q, attractionFilter, attractions]);

  const infoPathLabel = useMemo(() => {
    if (!infoFolder) return '';
    const trail = folderBreadcrumb(folders, infoFolder.id);
    return ['Library', ...trail.map((f) => f.name)].join(' / ');
  }, [folders, infoFolder]);

  const { pageSize, setPageSize } = usePageSize();
  const pagination = usePagination(filtered, pageSize, [region, q, attractionFilter, pageSize, currentFolderId]);
  const { paginatedItems } = pagination;

  function openFolder(id: string) {
    setCurrentFolderId(id);
    setSelected(new Set());
    setRegion('all');
    setQ('');
    setError(null);
  }

  function goRoot() {
    setCurrentFolderId(null);
    setSelected(new Set());
    setRegion('all');
    setQ('');
    setError(null);
  }

  async function persistFolders(next: PhotoFolder[], previous: PhotoFolder[]) {
    useStore.setState({ photoFolders: next });
    syncGalleryRouteCache();
    void withoutAutoSyncAsync(async () => {
      const result = await pushTablesToSupabase(['photo_folders'], false);
      if (!result.ok) {
        useStore.setState({ photoFolders: previous });
        syncGalleryRouteCache();
        toast.error(result.error ?? 'Failed to save folders');
      }
    });
  }

  async function handleNewFolder() {
    setFolderNameModal({ mode: 'create' });
  }

  async function submitFolderName(name: string) {
    if (!folderNameModal) return;
    setError(null);
    const previous = folders;
    try {
      if (folderNameModal.mode === 'create') {
        const { folders: next } = createFolder(folders, name, currentFolderId);
        await persistFolders(next, previous);
        toast.success('Folder created.');
      } else {
        await persistFolders(renameFolder(folders, folderNameModal.folder.id, name), previous);
        toast.success('Folder renamed.');
      }
      setFolderNameModal(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save folder');
      toast.error(e instanceof Error ? e.message : 'Could not save folder');
    }
  }

  async function handleRenameFolder(folder: PhotoFolder) {
    setFolderNameModal({ mode: 'rename', folder });
  }

  async function handleDeleteFolder(folder: PhotoFolder) {
    const check = canDeleteFolder(folders, folder.id, photos);
    if (!check.ok) {
      toast.error(check.reason ?? 'Cannot delete folder');
      return;
    }
    const ok = await confirmDialog(`Delete folder “${folder.name}”?`, { title: 'Delete folder' });
    if (!ok) return;
    const previous = folders;
    try {
      await persistFolders(folders.filter((f) => f.id !== folder.id), previous);
      if (currentFolderId === folder.id) goRoot();
      toast.success('Folder deleted.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete folder');
    }
  }

  function openAdd() {
    if (!currentFolderId) {
      toast.error('Open a folder first, then upload photos into it.');
      return;
    }
    setModalMode('add');
    setEditing(null);
    setSaveStatus('');
    setUploadProgress(null);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(p: GalleryPhoto) {
    setModalMode('edit');
    setEditing(p);
    setSaveStatus('');
    setUploadProgress(null);
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(data: GalleryPhotoSavePayload, id?: string) {
    setSaving(true);
    setError(null);
    setUploadProgress(null);
    try {
      if (modalMode === 'add') {
        const files = data.files?.length ? data.files : data.file ? [data.file] : [];
        if (!files.length) throw new Error('Add at least one image.');
        const folderId = currentFolderId || UNSORTED_FOLDER_ID;
        const current = useStore.getState().photos as GalleryPhoto[];
        const photoIds = allocatePhotoIds(current, files.length);
        const completed: GalleryPhoto[] = [];
        const failures: string[] = [];
        let finished = 0;

        await mapWithConcurrency(files, GALLERY_UPLOAD_CONCURRENCY, async (file, i) => {
          const caption =
            files.length === 1
              ? data.caption || file.name.replace(/\.[^.]+$/, '')
              : i === 0 && data.caption
                ? data.caption
                : file.name.replace(/\.[^.]+$/, '');
          try {
            const record = await uploadPhotoViaApi(file, {
              photoId: photoIds[i]!,
              caption,
              region: data.region,
              tags: data.tags,
              folderId,
              onStatus: (status) => {
                setSaveStatus(
                  files.length > 1
                    ? `${status} (${finished + 1}/${files.length})…`
                    : status
                );
              },
              onProgress: ({ ratio }) => {
                setUploadProgress(Math.round(ratio * 100));
              },
            });
            completed.push(record);
          } catch (err) {
            const msg =
              err instanceof Error && err.message.trim()
                ? err.message
                : typeof err === 'string' && err.trim()
                  ? err
                  : 'Upload failed';
            failures.push(`${file.name}: ${msg}`);
          } finally {
            finished += 1;
            setUploadProgress(null);
            setSaveStatus(`Uploaded ${finished} of ${files.length}…`);
          }
        });

        if (completed.length) {
          await withoutAutoSyncAsync(async () => {
            useStore.setState({ photos: [...current, ...completed] });
          });
          toast.success(`Uploaded ${completed.length}/${files.length} image(s).`);
        }
        if (failures.length) {
          toast.error(`Failed ${failures.length} file(s). First error: ${failures[0]}`);
        }
        if (!completed.length) {
          throw new Error(failures[0] ?? 'Upload failed');
        }
        syncGalleryRouteCache();
      } else if (id && editing) {
        let record: GalleryPhoto = {
          ...editing,
          caption: data.caption,
          region: data.region,
          tags: data.tags,
        };
        if (data.replaceImage && data.file) {
          setSaveStatus('Re-uploading image…');
          record = await uploadPhotoViaApi(data.file, {
            photoId: id,
            caption: data.caption,
            region: data.region,
            tags: data.tags,
            folderId: editing.folderId || currentFolderId || UNSORTED_FOLDER_ID,
            onStatus: setSaveStatus,
            onProgress: ({ ratio }) => {
              setUploadProgress(Math.round(ratio * 100));
            },
          });
          await withoutAutoSyncAsync(async () => {
            const next = (useStore.getState().photos as GalleryPhoto[]).map((p) =>
              p.id === id ? record : p
            );
            useStore.setState({ photos: next });
          });
        } else {
          setSaveStatus('Saving metadata…');
          await withoutAutoSyncAsync(async () => {
            const next = (useStore.getState().photos as GalleryPhoto[]).map((p) =>
              p.id === id ? record : p
            );
            useStore.setState({ photos: next });
            const result = await pushTablesToSupabase(['photos'], false);
            if (!result.ok) throw new Error(result.error ?? 'Failed to save metadata');
          });
        }
        syncGalleryRouteCache();
      }
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSaveStatus('');
      setUploadProgress(null);
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  }

  async function handleDelete(id: string) {
    const photo = photos.find((p) => p.id === id);
    if (!photo) return;
    setSaving(true);
    setError(null);
    try {
      setSaveStatus('Deleting…');
      await deletePhotoViaApi(id, photo.storagePath);
      await withoutAutoSyncAsync(async () => {
        useStore.setState({
          photos: (useStore.getState().photos as GalleryPhoto[]).filter((p) => p.id !== id),
        });
      });
      setModalOpen(false);
      setDismissedPhotoFilter(photoFilter);
      setLightbox(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      syncGalleryRouteCache();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
      setSaveStatus('');
    }
  }

  async function handleBulkDelete() {
    if (!selected.size) return;
    const ok = await confirmDialog(`Delete ${selected.size} photo(s) from the library?`, {
      title: 'Delete photos',
    });
    if (!ok) return;
    setSaving(true);
    setError(null);
    try {
      const remove = new Set(selected);
      const toDelete = [...remove]
        .map((id) => photos.find((p) => p.id === id))
        .filter((p): p is GalleryPhoto => Boolean(p));

      await mapWithConcurrency(toDelete, GALLERY_DELETE_CONCURRENCY, async (photo) => {
        await deletePhotoViaApi(photo.id, photo.storagePath);
      });

      await withoutAutoSyncAsync(async () => {
        useStore.setState({
          photos: (useStore.getState().photos as GalleryPhoto[]).filter((p) => !remove.has(p.id)),
        });
      });
      setSelected(new Set());
      toast.success('Photos deleted.');
      syncGalleryRouteCache();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk delete failed');
      toast.error(e instanceof Error ? e.message : 'Bulk delete failed');
    } finally {
      setSaving(false);
    }
  }

  async function movePhotosToFolder(photoIds: string[], folderId: string) {
    if (!photoIds.length) return;
    setSaving(true);
    setError(null);
    try {
      const idSet = new Set(photoIds);
      await withoutAutoSyncAsync(async () => {
        useStore.setState({
          photos: (useStore.getState().photos as GalleryPhoto[]).map((p) =>
            idSet.has(p.id) ? { ...p, folderId } : p
          ),
        });
        const result = await pushTablesToSupabase(['photos'], false);
        if (!result.ok) throw new Error(result.error ?? 'Failed to move photos');
      });
      setSelected(new Set());
      setMoveOpen(false);
      toast.success(`Moved ${photoIds.length} photo(s).`);
      syncGalleryRouteCache();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Move failed');
      toast.error(e instanceof Error ? e.message : 'Move failed');
    } finally {
      setSaving(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelected(new Set(filtered.map((p) => p.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const lightboxIndex = useMemo(() => {
    if (!activeLightbox) return -1;
    return filtered.findIndex((p) => p.id === activeLightbox.id);
  }, [activeLightbox, filtered]);

  function showLightboxAt(index: number) {
    const p = filtered[index];
    if (p) {
      setDismissedPhotoFilter(null);
      setLightbox(p);
    }
  }

  useEffect(() => {
    if (!activeLightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDismissedPhotoFilter(photoFilter);
        setLightbox(null);
      }
      if (e.key === 'ArrowLeft' && lightboxIndex > 0) showLightboxAt(lightboxIndex - 1);
      if (e.key === 'ArrowRight' && lightboxIndex >= 0 && lightboxIndex < filtered.length - 1) {
        showLightboxAt(lightboxIndex + 1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- navigate within filtered list
  }, [activeLightbox, lightboxIndex, filtered]);

  function handleDragStart(e: DragStartEvent) {
    const photoId = e.active.data.current?.photoId as string | undefined;
    setDragPhotoId(photoId ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setDragPhotoId(null);
    const photoId = e.active.data.current?.photoId as string | undefined;
    const overId = e.over?.id;
    if (!photoId || typeof overId !== 'string' || !overId.startsWith('folder-drop-')) return;
    const folderId = overId.replace('folder-drop-', '');
    if (!folderId || folderId === currentFolderId) return;
    const ids = selected.has(photoId) && selected.size > 1 ? [...selected] : [photoId];
    await movePhotosToFolder(ids, folderId);
  }

  const dragPhoto = dragPhotoId ? photos.find((p) => p.id === dragPhotoId) : null;
  const dragThumb = dragPhoto ? photoThumbUrl(dragPhoto) || dragPhoto.url : null;

  const atRoot = currentFolderId === null;
  const title = atRoot ? 'Photo Library' : currentFolder?.name || 'Folder';
  const subtitle = atRoot
    ? 'Folders for tours & attractions'
    : 'Upload here, then Move or Delete selected photos';
  const totalPhotos = photos.length;
  const totalFolders = folders.length;
  const unsortedCount = photoCounts[UNSORTED_FOLDER_ID] ?? 0;

  return (
    <div className="phlib">
      <div className="phlib-hero">
        <div className="phlib-hero-text">
          <h1 className="phlib-title">{title}</h1>
          <p className="phlib-sub">{subtitle}</p>
        </div>
        <div className="phlib-hero-stats" aria-label="Library summary">
          <span className="phlib-stat">
            <strong>{totalFolders}</strong> folders
          </span>
          <span className="phlib-stat">
            <strong>{totalPhotos}</strong> photos
          </span>
          {atRoot && (
            <span className="phlib-stat phlib-stat-muted">
              <strong>{unsortedCount}</strong> unsorted
            </span>
          )}
          {!atRoot && (
            <span className="phlib-stat phlib-stat-muted">
              <strong>{folderPhotos.length}</strong> in this folder
            </span>
          )}
        </div>
        <div className="phlib-hero-actions">
          <button
            type="button"
            className="btn btn-o"
            disabled={saving || !canWrite}
            onClick={handleNewFolder}
            title={!canWrite ? 'You need write permission for Gallery to create a folder' : undefined}
          >
            New folder
          </button>
          {!atRoot && filtered.length > 0 && (
            <button type="button" className="btn btn-o" disabled={saving} onClick={selectAllFiltered}>
              Select all ({filtered.length})
            </button>
          )}
          {selected.size > 0 && (
            <>
              <button type="button" className="btn btn-o" disabled={saving} onClick={clearSelection}>
                Clear selection
              </button>
              <button type="button" className="btn btn-o" disabled={saving} onClick={() => setMoveOpen(true)}>
                Move to…
              </button>
              <button type="button" className="btn btn-s" disabled={saving || !canWrite} onClick={handleBulkDelete}>
                Delete {selected.size}
              </button>
            </>
          )}
          {!atRoot && (
            <button
              type="button"
              className="btn btn-g"
              onClick={openAdd}
              disabled={saving || !canWrite}
              title={!canWrite ? 'You need write permission for Gallery to upload photos' : undefined}
            >
              Upload photos
            </button>
          )}
        </div>
      </div>

      <GalleryFolderBreadcrumb
        trail={breadcrumb}
        onGoRoot={goRoot}
        onGoFolder={(id) => openFolder(id)}
      />

      <div className="phlib-toolbar">
        <input
          className="phlib-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            atRoot
              ? 'Search folders or photos…'
              : 'Search tags… e.g. "Can Tho" or CanTho'
          }
        />
        {!atRoot && (
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
        )}
        <span className="phlib-count">
          {atRoot
            ? `${visibleFolders.length} folder${visibleFolders.length === 1 ? '' : 's'}`
            : `${selected.size > 0 ? `${selected.size} selected · ` : ''}${filtered.length} photos`}
        </span>
      </div>

      {error && <div className="phlib-error">{error}</div>}
      {!atRoot && attractionFilter && (
        <div className="phlib-filter-note">
          Filtered to attraction <code>{attractionFilter}</code>
        </div>
      )}

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {visibleFolders.length > 0 && (
          <GalleryFolderGrid
            folders={visibleFolders}
            photoCounts={photoCounts}
            onOpen={openFolder}
            onRename={canWrite ? handleRenameFolder : undefined}
            onDelete={canWrite ? handleDeleteFolder : undefined}
            onInfo={setInfoFolder}
            acceptPhotoDrop={canWrite}
          />
        )}

        {atRoot && visibleFolders.length === 0 && (
          <EmptyState
            className="crm-empty-state--flush"
            variant="photos"
            title={q.trim() ? 'No folders match your search' : 'No folders yet'}
            description={
              q.trim()
                ? 'Try another name or clear the search to see all folders.'
                : 'Create a folder to start organizing your photo library.'
            }
            action={
              <>
                {q.trim() && (
                  <button type="button" className="btn btn-s btn-sm" onClick={() => setQ('')}>
                    Clear search
                  </button>
                )}
                {!q.trim() && (
                  <button
                    type="button"
                    className="btn btn-g btn-sm"
                    onClick={handleNewFolder}
                    disabled={!canWrite}
                    title={!canWrite ? 'You need write permission for Gallery to create a folder' : undefined}
                  >
                    New folder
                  </button>
                )}
              </>
            }
          />
        )}

        {!atRoot && (
          <>
            <div className="phlib-grid">
              {paginatedItems.map((p) => (
                <DraggablePhotoCard
                  key={p.id}
                  photo={p}
                  selected={selected.has(p.id)}
                  onToggleSelect={() => toggleSelect(p.id)}
                  onOpenLightbox={() => {
                    setDismissedPhotoFilter(null);
                    setLightbox(p);
                  }}
                  onEdit={() => openEdit(p)}
                />
              ))}
            </div>

            {!filtered.length && (
              <EmptyState
                className="crm-empty-state--flush"
                variant="photos"
                title={
                  region !== 'all' || q.trim() || attractionFilter
                    ? 'No photos match your filters'
                    : 'This folder is empty'
                }
                description={
                  region !== 'all' || q.trim() || attractionFilter
                    ? 'Try another region or search, or clear filters.'
                    : 'Upload photos here, or move photos from Unsorted with Move to…'
                }
                action={
                  <>
                    {(region !== 'all' || q.trim()) && (
                      <button
                        type="button"
                        className="btn btn-s btn-sm"
                        onClick={() => {
                          setRegion('all');
                          setQ('');
                        }}
                      >
                        Clear filters
                      </button>
                    )}
                    <button type="button" className="btn btn-g btn-sm" onClick={openAdd}>
                      Upload photos
                    </button>
                  </>
                }
              />
            )}

            {filtered.length > 0 && <PaginationBar {...pagination} onPageSizeChange={setPageSize} />}
          </>
        )}

        <DragOverlay>
          {dragThumb ? (
            <div className="phlib-drag-overlay">
              <StorageImage src={dragThumb} alt="" fill sizes="80px" className="phlib-img" />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <GalleryPhotoModal
        open={modalOpen}
        mode={modalMode}
        initial={editing}
        saving={saving}
        saveStatus={saveStatus}
        uploadProgress={uploadProgress}
        onClose={() => !saving && setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <GalleryMovePhotosModal
        open={moveOpen}
        folders={folders}
        photoCount={selected.size}
        currentFolderId={currentFolderId}
        saving={saving}
        onClose={() => !saving && setMoveOpen(false)}
        onConfirm={(folderId) => movePhotosToFolder([...selected], folderId)}
      />

      <GalleryFolderNameModal
        open={Boolean(folderNameModal)}
        title={folderNameModal?.mode === 'rename' ? 'Rename folder' : 'New folder'}
        initialName={folderNameModal?.mode === 'rename' ? folderNameModal.folder.name : ''}
        saving={saving}
        onClose={() => !saving && setFolderNameModal(null)}
        onSubmit={submitFolderName}
      />

      <GalleryFolderInfoModal
        open={Boolean(infoFolder)}
        folder={infoFolder}
        pathLabel={infoPathLabel}
        photoCount={infoFolder ? photoCounts[infoFolder.id] ?? 0 : 0}
        onClose={() => setInfoFolder(null)}
      />

      {activeLightbox && (
        <div
          className="phlib-viewer-overlay"
          onClick={() => {
            setDismissedPhotoFilter(photoFilter);
            setLightbox(null);
          }}
          role="dialog"
          aria-modal="true"
        >
          <div className="phlib-viewer" onClick={(e) => e.stopPropagation()}>
            <header className="phlib-viewer-bar">
              <div className="phlib-viewer-bar-text">
                <strong className="phlib-viewer-caption">
                  {activeLightbox.caption || activeLightbox.id}
                </strong>
                <span className="phlib-viewer-id">{activeLightbox.id}</span>
                {activeLightbox.displayBytes != null && (
                  <span className="phlib-viewer-size">{formatBytes(activeLightbox.displayBytes)}</span>
                )}
                {lightboxIndex >= 0 && (
                  <span className="phlib-viewer-pos">
                    {lightboxIndex + 1} / {filtered.length}
                  </span>
                )}
              </div>
              <div className="phlib-viewer-bar-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-o"
                  onClick={() => {
                    openEdit(activeLightbox);
                    setDismissedPhotoFilter(photoFilter);
                    setLightbox(null);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-s"
                  onClick={async () => {
                    const ok = await confirmDialog(
                      `Delete photo “${activeLightbox.caption || activeLightbox.id}”?`,
                      { title: 'Delete photo' }
                    );
                    if (!ok) return;
                    await handleDelete(activeLightbox.id);
                  }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="phlib-viewer-close"
                  aria-label="Close"
                  onClick={() => {
                    setDismissedPhotoFilter(photoFilter);
                    setLightbox(null);
                  }}
                >
                  ✕
                </button>
              </div>
            </header>

            <div className="phlib-viewer-stage">
              {lightboxIndex > 0 && (
                <button
                  type="button"
                  className="phlib-viewer-nav phlib-viewer-prev"
                  aria-label="Previous photo"
                  onClick={() => showLightboxAt(lightboxIndex - 1)}
                >
                  ‹
                </button>
              )}
              {photoDisplayUrl(activeLightbox) || activeLightbox.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoDisplayUrl(activeLightbox) || activeLightbox.url}
                  alt={activeLightbox.caption}
                  className="phlib-viewer-img"
                />
              ) : (
                <div className="phlib-viewer-missing">No image URL</div>
              )}
              {lightboxIndex >= 0 && lightboxIndex < filtered.length - 1 && (
                <button
                  type="button"
                  className="phlib-viewer-nav phlib-viewer-next"
                  aria-label="Next photo"
                  onClick={() => showLightboxAt(lightboxIndex + 1)}
                >
                  ›
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

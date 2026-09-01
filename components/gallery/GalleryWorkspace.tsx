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
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import { useGalleryPage } from '@/hooks/useGalleryPage';
import { useUpdatePhoto } from '@/hooks/useUpdatePhoto';
import { useDeletePhoto } from '@/hooks/useDeletePhoto';
import { usePhotoFolderMutations } from '@/hooks/usePhotoFolderMutations';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { PHOTO_LIBRARY_REGIONS } from '@/lib/gallery/gallery-tags';
import {
  formatBytes,
  photoDisplayUrl,
  photoThumbUrl,
} from '@/lib/gallery/gallery-helpers';
import { photoMatchesSearchQuery, matchesFoldedQuery } from '@/lib/gallery/fold-search';
import { uploadPhotoViaApi } from '@/lib/gallery/photo-api';
import {
  canDeleteFolder,
  childFolders,
  countPhotosInFolder,
  ensureUnsortedFolder,
  folderBreadcrumb,
  folderById,
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
import { getBffArray } from '@/lib/bff/client';
import type { Attraction } from '@/lib/types';
import { useLanguage } from '@/hooks/useLanguage';

/** One Sharp/upload at a time to avoid RAM spikes on heavy originals. */
const GALLERY_UPLOAD_CONCURRENCY = 1;
const GALLERY_DELETE_CONCURRENCY = 3;

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
  const { tp, tpl, tc } = useLanguage();
  const { canWrite } = usePagePermission('gallery');
  const { loading: libraryLoading, error: libraryError } = useGalleryPage();
  const { patchPhoto } = useUpdatePhoto();
  const { deletePhoto } = useDeletePhoto();
  const { createFolder, renameFolder, deleteFolder } = usePhotoFolderMutations();
  const searchParams = useSearchParams();
  const photoFilter = searchParams.get('photo') || '';
  const attractionFilter = searchParams.get('attraction') || '';

  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const rawFolders = useStore((s) => s.photoFolders) as PhotoFolder[];
  const attractions = useStore((s) => s.attractions);
  const setAttractions = useStore((s) => s.setAttractions);

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
  const displayError = error ?? libraryError;
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

  /** Attractions are not in gallery boot — fetch their BFF data only for this filter. */
  useEffect(() => {
    if (!attractionFilter) return;
    let active = true;
    void getBffArray<Attraction>('/api/attractions/all', tp('gallery', 'errorLoadAttractions'))
      .then((rows) => {
        if (active) setAttractions(rows);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : tp('gallery', 'errorLoadAttractions'));
      });
    return () => {
      active = false;
    };
  }, [attractionFilter, setAttractions, tp]);

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
    return [tp('gallery', 'libraryBreadcrumb'), ...trail.map((f) => f.name)].join(' / ');
  }, [folders, infoFolder, tp]);

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

  async function submitFolderName(name: string) {
    if (!folderNameModal) return;
    setError(null);
    try {
      if (folderNameModal.mode === 'create') {
        await createFolder({ name, parentId: currentFolderId });
        toast.success(tp('gallery', 'toastFolderCreated'));
      } else {
        await renameFolder(folderNameModal.folder.id, { name });
        toast.success(tp('gallery', 'toastFolderRenamed'));
      }
      setFolderNameModal(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : tp('gallery', 'errorSaveFolder');
      setError(msg);
      toast.error(msg);
    }
  }

  async function handleRenameFolder(folder: PhotoFolder) {
    setFolderNameModal({ mode: 'rename', folder });
  }

  async function handleNewFolder() {
    setFolderNameModal({ mode: 'create' });
  }

  async function handleDeleteFolder(folder: PhotoFolder) {
    const check = canDeleteFolder(folders, folder.id, photos);
    if (!check.ok) {
      toast.error(check.reason ?? tp('gallery', 'errorCannotDeleteFolder'));
      return;
    }
    const ok = await confirmDialog(tpl('gallery', 'confirmDeleteFolder', { name: folder.name }), {
      title: tp('gallery', 'confirmDeleteFolderTitle'),
    });
    if (!ok) return;
    try {
      await deleteFolder(folder.id);
      if (currentFolderId === folder.id) goRoot();
      toast.success(tp('gallery', 'toastFolderDeleted'));
    } catch (e) {
      setError(e instanceof Error ? e.message : tp('gallery', 'errorDeleteFolder'));
    }
  }

  function openAdd() {
    if (!currentFolderId) {
      toast.error(tp('gallery', 'errorOpenFolderFirst'));
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
        if (!files.length) throw new Error(tp('gallery', 'errorAddAtLeastOneImage'));
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
                    ? tpl('gallery', 'uploadStatusMulti', { status, current: finished + 1, total: files.length })
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
                  : tp('gallery', 'uploadFailed');
            failures.push(`${file.name}: ${msg}`);
          } finally {
            finished += 1;
            setUploadProgress(null);
            setSaveStatus(tpl('gallery', 'uploadProgress', { finished, total: files.length }));
          }
        });

        if (completed.length) {
          await withoutAutoSyncAsync(async () => {
            useStore.setState({ photos: [...current, ...completed] });
          });
          toast.success(tpl('gallery', 'toastUploaded', { completed: completed.length, total: files.length }));
        }
        if (failures.length) {
          toast.error(tpl('gallery', 'toastUploadFailed', { count: failures.length, error: failures[0] }));
        }
        if (!completed.length) {
          throw new Error(failures[0] ?? tp('gallery', 'uploadFailed'));
        }
      } else if (id && editing) {
        let record: GalleryPhoto = {
          ...editing,
          caption: data.caption,
          region: data.region,
          tags: data.tags,
        };
        if (data.replaceImage && data.file) {
          setSaveStatus(tp('gallery', 'statusReuploading'));
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
          setSaveStatus(tp('gallery', 'statusSavingMetadata'));
          const result = await patchPhoto(id, {
            caption: data.caption,
            region: data.region,
            tags: data.tags,
          });
          if (!result.ok) throw new Error(result.message);
        }
      }
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : tp('gallery', 'errorSaveFailed'));
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
      setSaveStatus(tp('gallery', 'statusDeleting'));
      await deletePhoto(photo);
      setModalOpen(false);
      setDismissedPhotoFilter(photoFilter);
      setLightbox(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : tp('gallery', 'errorDeleteFailed'));
    } finally {
      setSaving(false);
      setSaveStatus('');
    }
  }

  async function handleBulkDelete() {
    if (!selected.size) return;
    const ok = await confirmDialog(tpl('gallery', 'confirmBulkDeletePhotos', { count: selected.size }), {
      title: tp('gallery', 'confirmBulkDeletePhotosTitle'),
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
        await deletePhoto(photo);
      });

      setSelected(new Set());
      toast.success(tp('gallery', 'toastPhotosDeleted'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : tp('gallery', 'errorBulkDeleteFailed');
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function movePhotosToFolder(photoIds: string[], folderId: string) {
    if (!photoIds.length) return;
    setSaving(true);
    setError(null);
    try {
      for (const photoId of photoIds) {
        const result = await patchPhoto(photoId, { folderId });
        if (!result.ok) throw new Error(result.message);
      }
      setSelected(new Set());
      setMoveOpen(false);
      toast.success(tpl('gallery', 'toastMovedPhotos', { count: photoIds.length }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : tp('gallery', 'errorMoveFailed');
      setError(msg);
      toast.error(msg);
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

  const GALLERY_REGION_KEY: Record<string, 'regionAll' | 'regionNorth' | 'regionCentral' | 'regionSouth' | 'regionPeople' | 'regionServices'> = {
    all: 'regionAll',
    north: 'regionNorth',
    central: 'regionCentral',
    south: 'regionSouth',
    people: 'regionPeople',
    services: 'regionServices',
  };

  const atRoot = currentFolderId === null;
  const title = atRoot ? tp('gallery', 'photoLibrary') : currentFolder?.name || tp('gallery', 'folderFallbackTitle');
  const subtitle = atRoot ? tp('gallery', 'heroSubtitleRoot') : tp('gallery', 'heroSubtitleFolder');
  const totalPhotos = photos.length;
  const totalFolders = folders.length;
  const unsortedCount = photoCounts[UNSORTED_FOLDER_ID] ?? 0;

  return (
    <div className="phlib">
      {libraryLoading && (
        <div className="crm-page-hydrate-error" role="status" style={{ padding: '0.75rem 1rem' }}>
          {tp('gallery', 'loadingLibrary')}
        </div>
      )}
      <div className="phlib-hero">
        <div className="phlib-hero-text">
          <h1 className="phlib-title">{title}</h1>
          <p className="phlib-sub">{subtitle}</p>
        </div>
        <div className="phlib-hero-stats" aria-label={tp('gallery', 'librarySummaryAria')}>
          <span className="phlib-stat">
            <strong>{totalFolders}</strong> {tp('gallery', 'statFolders')}
          </span>
          <span className="phlib-stat">
            <strong>{totalPhotos}</strong> {tp('gallery', 'statPhotos')}
          </span>
          {atRoot && (
            <span className="phlib-stat phlib-stat-muted">
              <strong>{unsortedCount}</strong> {tp('gallery', 'statUnsorted')}
            </span>
          )}
          {!atRoot && (
            <span className="phlib-stat phlib-stat-muted">
              <strong>{folderPhotos.length}</strong> {tp('gallery', 'statInThisFolder')}
            </span>
          )}
        </div>
        <div className="phlib-hero-actions">
          <button
            type="button"
            className="btn btn-o"
            disabled={saving || !canWrite}
            onClick={handleNewFolder}
            title={!canWrite ? tp('gallery', 'permCreateFolderTitle') : undefined}
          >
            {tp('gallery', 'newFolder')}
          </button>
          {!atRoot && filtered.length > 0 && (
            <button type="button" className="btn btn-o" disabled={saving} onClick={selectAllFiltered}>
              {tpl('gallery', 'selectAll', { count: filtered.length })}
            </button>
          )}
          {selected.size > 0 && (
            <>
              <button type="button" className="btn btn-o" disabled={saving} onClick={clearSelection}>
                {tp('gallery', 'clearSelection')}
              </button>
              <button type="button" className="btn btn-o" disabled={saving} onClick={() => setMoveOpen(true)}>
                {tp('gallery', 'moveTo')}
              </button>
              <button type="button" className="btn btn-s" disabled={saving || !canWrite} onClick={handleBulkDelete}>
                {tpl('gallery', 'deleteCount', { count: selected.size })}
              </button>
            </>
          )}
          {!atRoot && (
            <button
              type="button"
              className="btn btn-g"
              onClick={openAdd}
              disabled={saving || !canWrite}
              title={!canWrite ? tp('gallery', 'permUploadTitle') : undefined}
            >
              {tp('gallery', 'uploadPhotos')}
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
            atRoot ? tp('gallery', 'searchFoldersOrPhotos') : tp('gallery', 'searchTagsPlaceholder')
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
                {tp('gallery', GALLERY_REGION_KEY[r.id] ?? 'regionAll')}
              </button>
            ))}
          </div>
        )}
        <span className="phlib-count">
          {atRoot
            ? visibleFolders.length === 1
              ? tpl('gallery', 'countFoldersOne', { count: visibleFolders.length })
              : tpl('gallery', 'countFoldersMany', { count: visibleFolders.length })
            : tpl('gallery', 'countSelectedPhotos', { selected: selected.size, count: filtered.length })}
        </span>
      </div>

      {displayError && <div className="phlib-error">{displayError}</div>}
      {!atRoot && attractionFilter && (
        <div className="phlib-filter-note">
          {tp('gallery', 'filteredToAttraction')} <code>{attractionFilter}</code>
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
            title={q.trim() ? tp('gallery', 'noFoldersMatchSearch') : tp('gallery', 'noFoldersYet')}
            description={
              q.trim() ? tp('gallery', 'noFoldersMatchSearchDesc') : tp('gallery', 'noFoldersYetDesc')
            }
            action={
              <>
                {q.trim() && (
                  <button type="button" className="btn btn-s btn-sm" onClick={() => setQ('')}>
                    {tc('clearSearch')}
                  </button>
                )}
                {!q.trim() && (
                  <button
                    type="button"
                    className="btn btn-g btn-sm"
                    onClick={handleNewFolder}
                    disabled={!canWrite}
                    title={!canWrite ? tp('gallery', 'permCreateFolderTitle') : undefined}
                  >
                    {tp('gallery', 'newFolder')}
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
                    ? tp('gallery', 'noPhotosMatchFilters')
                    : tp('gallery', 'folderEmpty')
                }
                description={
                  region !== 'all' || q.trim() || attractionFilter
                    ? tp('gallery', 'noPhotosMatchFiltersDesc')
                    : tp('gallery', 'folderEmptyDesc')
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
                        {tc('clearFilters')}
                      </button>
                    )}
                    <button type="button" className="btn btn-g btn-sm" onClick={openAdd}>
                      {tp('gallery', 'uploadPhotos')}
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
        title={folderNameModal?.mode === 'rename' ? tp('gallery', 'renameFolder') : tp('gallery', 'newFolder')}
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
                    {tpl('gallery', 'lightboxPosition', {
                      current: lightboxIndex + 1,
                      total: filtered.length,
                    })}
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
                  {tp('gallery', 'lightboxEdit')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-s"
                  onClick={async () => {
                    const ok = await confirmDialog(
                      tpl('gallery', 'confirmDeletePhoto', {
                        label: activeLightbox.caption || activeLightbox.id,
                      }),
                      { title: tp('gallery', 'confirmDeletePhotoTitle') }
                    );
                    if (!ok) return;
                    await handleDelete(activeLightbox.id);
                  }}
                >
                  {tp('gallery', 'lightboxDelete')}
                </button>
                <button
                  type="button"
                  className="phlib-viewer-close"
                  aria-label={tp('gallery', 'closeAria')}
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
                  aria-label={tp('gallery', 'previousPhotoAria')}
                  onClick={() => showLightboxAt(lightboxIndex - 1)}
                >
                  ‹
                </button>
              )}
              {photoDisplayUrl(activeLightbox) || activeLightbox.url ? (
                <StorageImage
                  src={photoDisplayUrl(activeLightbox) || activeLightbox.url}
                  alt={activeLightbox.caption}
                  className="phlib-viewer-img"
                  width={1200}
                  height={800}
                  holdUntilLoaded={false}
                  unoptimized
                />
              ) : (
                <div className="phlib-viewer-missing">{tp('gallery', 'noImageUrl')}</div>
              )}
              {lightboxIndex >= 0 && lightboxIndex < filtered.length - 1 && (
                <button
                  type="button"
                  className="phlib-viewer-nav phlib-viewer-next"
                  aria-label={tp('gallery', 'nextPhotoAria')}
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

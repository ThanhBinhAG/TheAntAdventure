'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/hooks/useStore';
import { pushTablesToSupabase } from '@/lib/db/hydrate';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { PHOTO_LIBRARY_REGIONS } from '@/lib/gallery/gallery-tags';
import {
  formatBytes,
  nextPhotoId,
  photoDisplayUrl,
  photoSizeLabel,
  photoThumbUrl,
} from '@/lib/gallery/gallery-helpers';
import { photoMatchesSearchQuery } from '@/lib/gallery/fold-search';
import { deletePhotoViaApi, uploadPhotoViaApi } from '@/lib/gallery/photo-api';
import StorageImage from '@/components/gallery/StorageImage';
import GalleryPhotoModal, {
  type GalleryModalMode,
  type GalleryPhotoRecord,
  type GalleryPhotoSavePayload,
} from '@/components/gallery/GalleryPhotoModal';
import PaginationBar from '@/components/PaginationBar';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';

const REGION_COLORS: Record<string, string> = {
  north: '#2E7D52',
  central: '#856404',
  south: '#1565C0',
  people: '#6B21A8',
  services: '#555',
};

export default function Gallery() {
  const searchParams = useSearchParams();
  const photoFilter = searchParams.get('photo') || '';
  const attractionFilter = searchParams.get('attraction') || '';

  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const attractions = useStore((s) => s.attractions);

  const [region, setRegion] = useState('all');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<GalleryModalMode>('add');
  const [editing, setEditing] = useState<GalleryPhotoRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [lightbox, setLightbox] = useState<GalleryPhoto | null>(null);
  const [dismissedPhotoFilter, setDismissedPhotoFilter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filteredPhotoLightbox =
    photoFilter && dismissedPhotoFilter !== photoFilter
      ? photos.find((photo) => photo.id === photoFilter) ?? null
      : null;
  const activeLightbox = filteredPhotoLightbox ?? lightbox;

  const filtered = useMemo(() => {
    let list = photos;
    if (attractionFilter) {
      const att = attractions.find((a) => a.id === attractionFilter);
      const ids = new Set([...(att?.linkedPhotoIds ?? []), ...(att?.photoIds ?? [])]);
      if (ids.size) list = list.filter((p) => ids.has(p.id));
    }
    return list.filter((p) => {
      if (region !== 'all' && p.region !== region) return false;
      return photoMatchesSearchQuery(p, q);
    });
  }, [photos, region, q, attractionFilter, attractions]);

  const { pageSize, setPageSize } = usePageSize();
  const pagination = usePagination(filtered, pageSize, [region, q, attractionFilter, pageSize]);
  const { paginatedItems } = pagination;

  function openAdd() {
    setModalMode('add');
    setEditing(null);
    setSaveStatus('');
    setError(null);
    setModalOpen(true);
  }

  function openEdit(p: GalleryPhoto) {
    setModalMode('edit');
    setEditing(p);
    setSaveStatus('');
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(data: GalleryPhotoSavePayload, id?: string) {
    setSaving(true);
    setError(null);
    try {
      if (modalMode === 'add') {
        const files = data.files?.length ? data.files : data.file ? [data.file] : [];
        if (!files.length) throw new Error('Add at least one image.');
        let current = useStore.getState().photos as GalleryPhoto[];
        for (let i = 0; i < files.length; i++) {
          const file = files[i]!;
          setSaveStatus(`Uploading ${i + 1} of ${files.length}…`);
          const photoId = nextPhotoId(current);
          const caption =
            files.length === 1
              ? data.caption || file.name.replace(/\.[^.]+$/, '')
              : i === 0 && data.caption
                ? data.caption
                : file.name.replace(/\.[^.]+$/, '');
          const record = await uploadPhotoViaApi(file, {
            photoId,
            caption,
            region: data.region,
            tags: data.tags,
          });
          current = [...current, record];
          useStore.setState({ photos: current });
        }
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
          });
        } else {
          setSaveStatus('Saving metadata…');
          const next = (useStore.getState().photos as GalleryPhoto[]).map((p) =>
            p.id === id ? record : p
          );
          useStore.setState({ photos: next });
          const result = await pushTablesToSupabase(['photos'], false);
          if (!result.ok) throw new Error(result.error ?? 'Failed to save metadata');
        }
        if (data.replaceImage && data.file) {
          const next = (useStore.getState().photos as GalleryPhoto[]).map((p) =>
            p.id === id ? record : p
          );
          useStore.setState({ photos: next });
        }
      }
      setModalOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setSaveStatus('');
    } finally {
      setSaving(false);
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
      useStore.setState({
        photos: (useStore.getState().photos as GalleryPhoto[]).filter((p) => p.id !== id),
        attractions: useStore.getState().attractions.map((a) => ({
          ...a,
          photoIds: (a.photoIds ?? []).filter((x) => x !== id),
          linkedPhotoIds: (a.linkedPhotoIds ?? []).filter((x) => x !== id),
        })),
        products: useStore.getState().products.map((p) => ({
          ...p,
          photoIds: (p.photoIds ?? []).filter((x) => x !== id),
          linkedPhotoIds: (p.linkedPhotoIds ?? []).filter((x) => x !== id),
        })),
      });
      await pushTablesToSupabase(['attractions', 'products'], false);
      setModalOpen(false);
      setDismissedPhotoFilter(photoFilter);
      setLightbox(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
      setSaveStatus('');
    }
  }

  async function handleBulkDelete() {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} photo(s) from the library?`)) return;
    setSaving(true);
    setError(null);
    try {
      for (const id of selected) {
        const photo = photos.find((p) => p.id === id);
        if (!photo) continue;
        await deletePhotoViaApi(id, photo.storagePath);
      }
      const remove = selected;
      useStore.setState({
        photos: (useStore.getState().photos as GalleryPhoto[]).filter((p) => !remove.has(p.id)),
        attractions: useStore.getState().attractions.map((a) => ({
          ...a,
          photoIds: (a.photoIds ?? []).filter((x) => !remove.has(x)),
          linkedPhotoIds: (a.linkedPhotoIds ?? []).filter((x) => !remove.has(x)),
        })),
        products: useStore.getState().products.map((p) => ({
          ...p,
          photoIds: (p.photoIds ?? []).filter((x) => !remove.has(x)),
          linkedPhotoIds: (p.linkedPhotoIds ?? []).filter((x) => !remove.has(x)),
        })),
      });
      await pushTablesToSupabase(['attractions', 'products'], false);
      setSelected(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Bulk delete failed');
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

  return (
    <div className="phlib">
      <div className="phlib-hero">
        <div>
          <h1 className="phlib-title">Photo Library</h1>
          <p className="phlib-sub">
            Upload once, then attach photos to tours and attractions from the picker.
          </p>
        </div>
        <div className="phlib-hero-actions">
          {filtered.length > 0 && (
            <button type="button" className="btn btn-o" disabled={saving} onClick={selectAllFiltered}>
              Select all ({filtered.length})
            </button>
          )}
          {selected.size > 0 && (
            <>
              <button type="button" className="btn btn-o" disabled={saving} onClick={clearSelection}>
                Clear selection
              </button>
              <button type="button" className="btn btn-s" disabled={saving} onClick={handleBulkDelete}>
                Delete {selected.size}
              </button>
            </>
          )}
          <button type="button" className="btn btn-g" onClick={openAdd} disabled={saving}>
            Upload photos
          </button>
        </div>
      </div>

      <div className="phlib-toolbar">
        <input
          className="phlib-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Search tags… e.g. "Can Tho" or CanTho'
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
        <span className="phlib-count">
          {selected.size > 0 ? `${selected.size} selected · ` : ''}
          {filtered.length} photos
        </span>
      </div>

      {error && <div className="phlib-error">{error}</div>}
      {attractionFilter && (
        <div className="phlib-filter-note">
          Filtered to attraction <code>{attractionFilter}</code>
        </div>
      )}

      <div className="phlib-grid">
        {paginatedItems.map((p) => {
          const thumb = photoThumbUrl(p) || p.url;
          const isSel = selected.has(p.id);
          return (
            <article key={p.id} className={`phlib-card${isSel ? ' selected' : ''}`}>
              <div className="phlib-card-media">
                <button
                  type="button"
                  className="phlib-card-img-btn"
                  onClick={() => {
                    setDismissedPhotoFilter(null);
                    setLightbox(p);
                  }}
                >
                  {thumb ? (
                    <StorageImage src={thumb} alt={p.caption} fill className="phlib-img" sizes="280px" />
                  ) : (
                    <span className="phlib-missing">No image</span>
                  )}
                </button>
                <span
                  className="phlib-region-badge"
                  style={{ background: REGION_COLORS[p.region] || '#555' }}
                >
                  {p.region}
                </span>
                <label className="phlib-select">
                  <input type="checkbox" checked={isSel} onChange={() => toggleSelect(p.id)} />
                </label>
                <div className="phlib-card-actions">
                  <button type="button" onClick={() => openEdit(p)}>
                    Edit
                  </button>
                </div>
              </div>
              <div className="phlib-card-body">
                <div className="phlib-card-caption">{p.caption || p.id}</div>
                <div className="phlib-card-meta">
                  <span>{photoSizeLabel(p)}</span>
                  {(p.tags ?? []).slice(0, 3).map((t) => (
                    <span key={t} className="phlib-tag">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {!filtered.length && (
        <div className="phlib-empty-state">
          <p>No photos yet.</p>
          <button type="button" className="btn btn-g" onClick={openAdd}>
            Upload your first photo
          </button>
        </div>
      )}

      {filtered.length > 0 && <PaginationBar {...pagination} onPageSizeChange={setPageSize} />}

      <GalleryPhotoModal
        open={modalOpen}
        mode={modalMode}
        initial={editing}
        saving={saving}
        saveStatus={saveStatus}
        onClose={() => !saving && setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
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
                <strong className="phlib-viewer-caption">{activeLightbox.caption || activeLightbox.id}</strong>
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
              {(photoDisplayUrl(activeLightbox) || activeLightbox.url) ? (
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

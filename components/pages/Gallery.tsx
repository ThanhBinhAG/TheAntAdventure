'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/hooks/useStore';
import { GALLERY_TAG_TAXONOMY } from '@/lib/gallery-tags';
import {
  photoThumbUrl,
  photosForProductSlots,
  productPhotoSlotStatus,
} from '@/lib/gallery-helpers';
import { linkPhotoToAttractionWithFeatured, unlinkPhotoFromAttraction } from '@/lib/attractions-helpers';
import { groupProductsByRegion, productRegionLabel } from '@/lib/gallery-bulk-upload';
import { pushTablesToSupabase } from '@/lib/db/hydrate';
import { createClient } from '@/lib/supabase/client';
import { deleteGalleryPhotoFiles, uploadGalleryPhoto } from '@/lib/storage/upload-gallery-photo';
import type { GalleryPhotoOwner } from '@/lib/storage/photo-paths';
import StorageImage from '@/components/media/StorageImage';
import GalleryPhotoModal, {
  type GalleryModalMode,
  type GalleryPhotoRecord,
  type GalleryPhotoSavePayload,
} from '@/components/gallery/GalleryPhotoModal';
import GalleryTourPairCard from '@/components/gallery/GalleryTourPairCard';
import GalleryLoosePhotoViewer from '@/components/gallery/GalleryLoosePhotoViewer';
import GalleryBulkUploadModal, { type BulkUploadItem } from '@/components/gallery/GalleryBulkUploadModal';

const REGION_TABS = [
  { id: 'all', label: 'All' },
  { id: 'north', label: 'Northern Vietnam' },
  { id: 'central', label: 'Central Vietnam' },
  { id: 'south', label: 'Southern Vietnam' },
  { id: 'people', label: 'People & Culture' },
  { id: 'services', label: 'Services' },
] as const;

const REGION_COLORS: Record<string, string> = {
  north: '#2E7D52',
  central: '#856404',
  south: '#1565C0',
  people: '#6B21A8',
  services: '#555',
};

type MainTab = 'tour' | 'loose';

function nextPhotoId(photos: GalleryPhotoRecord[]) {
  const max = photos.reduce((n, p) => {
    const num = parseInt(p.id.replace(/^PH-/, ''), 10);
    return Number.isFinite(num) ? Math.max(n, num) : n;
  }, 0);
  return `PH-${String(max + 1).padStart(3, '0')}`;
}

function removePhotoFromAttractions(photoId: string) {
  const attractions = useStore.getState().attractions;
  const next = attractions.map((a) => {
    const inLinked = a.linkedPhotoIds?.includes(photoId);
    const inFeatured = a.photoIds?.includes(photoId);
    if (!inLinked && !inFeatured) return a;
    return {
      ...a,
      linkedPhotoIds: (a.linkedPhotoIds ?? []).filter((id) => id !== photoId),
      photoIds: (a.photoIds ?? []).filter((id) => id !== photoId),
    };
  });
  useStore.setState({ attractions: next });
}

function clearSlotFromOthers(photos: GalleryPhotoRecord[], productCode: string, slot: 1 | 2, exceptId?: string) {
  return photos.map((p) => {
    if (p.product === productCode && p.slot === slot && p.id !== exceptId) {
      const { slot: _s, ...rest } = p;
      return rest as GalleryPhotoRecord;
    }
    return p;
  });
}

async function syncPhotosToSupabase(productCodes?: Iterable<string>) {
  const codes = [...new Set([...productCodes ?? []].filter(Boolean))];
  if (codes.length) {
    const productsResult = await pushTablesToSupabase(['products'], false);
    if (!productsResult.ok) {
      throw new Error(productsResult.error ?? 'Không lưu được products lên Supabase');
    }
  }
  const photosResult = await pushTablesToSupabase(['photos'], false);
  if (!photosResult.ok) {
    throw new Error(photosResult.error ?? 'Không lưu được metadata ảnh lên Supabase');
  }
}

export default function Gallery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productFilter = searchParams.get('product') || '';
  const attractionFilter = searchParams.get('attraction') || '';
  const photoFilter = searchParams.get('photo') || '';
  const tabParam = searchParams.get('tab') || '';
  const searchQuery = searchParams.get('search') || '';
  const photos = useStore((s) => s.photos) as GalleryPhotoRecord[];
  const attractions = useStore((s) => s.attractions);
  const products = useStore((s) => s.products);
  const linkedProduct = productFilter ? products.find((p) => p.code === productFilter) : null;
  const linkedAttraction = attractionFilter ? attractions.find((a) => a.id === attractionFilter) : null;
  const attractionPoolIds = linkedAttraction?.linkedPhotoIds?.length
    ? linkedAttraction.linkedPhotoIds
    : (linkedAttraction?.photoIds ?? []);
  const productSlotStatus = productFilter ? productPhotoSlotStatus(photos, productFilter) : null;
  const highlightRef = useRef<string | null>(productFilter || null);
  const photoOpenedRef = useRef<string | null>(null);

  function setPhotos(next: GalleryPhotoRecord[]) {
    useStore.setState({ photos: next });
  }

  const [mainTab, setMainTab] = useState<MainTab>(
    attractionFilter || tabParam === 'loose' ? 'loose' : productFilter ? 'tour' : 'tour'
  );
  const [regionTab, setRegionTab] = useState<string>('all');
  const [search, setSearch] = useState(searchQuery);
  const [gfRegion, setGfRegion] = useState('');
  const [gfTourtype, setGfTourtype] = useState('');
  const [gfSeason, setGfSeason] = useState('');
  const [gfOther, setGfOther] = useState('');
  const [tourFilter, setTourFilter] = useState<'all' | 'incomplete' | 'complete'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<GalleryModalMode>('addToTour');
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhotoRecord | null>(null);
  const [presetProduct, setPresetProduct] = useState('');

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, label: '' });

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const [looseViewerOpen, setLooseViewerOpen] = useState(false);
  const [looseViewerId, setLooseViewerId] = useState('');
  const [linkBrowseMode, setLinkBrowseMode] = useState(false);

  useEffect(() => {
    if (!productFilter) return;
    setMainTab('tour');
    highlightRef.current = productFilter;
    const el = document.getElementById(`gallery-tour-${productFilter}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 200);
    }
  }, [productFilter, photos.length]);

  useEffect(() => {
    if (!attractionFilter && tabParam !== 'loose') return;
    setMainTab('loose');
    setLinkBrowseMode(false);
    if (attractionFilter) {
      setSearch('');
      setGfRegion('');
      setGfTourtype('');
      setGfSeason('');
      setGfOther('');
    }
  }, [attractionFilter, tabParam]);

  useEffect(() => {
    if (!photoFilter) {
      photoOpenedRef.current = null;
      return;
    }
    if (photoOpenedRef.current === photoFilter) return;
    const photo = photos.find((p) => p.id === photoFilter);
    if (!photo) return;
    photoOpenedRef.current = photoFilter;
    setMainTab('loose');
    setLinkBrowseMode(false);
    setModalMode('edit');
    setEditingPhoto(photo);
    setModalOpen(true);
  }, [photoFilter, photos]);

  const loosePhotos = useMemo(() => {
    const q = search.toLowerCase();
    return photos.filter((p) => {
      if (p.product) return false;
      if (regionTab !== 'all' && p.region !== regionTab) return false;
      if (q && !p.caption.toLowerCase().includes(q) && !(p.tags || []).some((t) => t.toLowerCase().includes(q))) return false;
      const tags = Array.isArray(p.tags) ? p.tags : [];
      if (gfRegion && !tags.includes(gfRegion)) return false;
      if (gfTourtype && !tags.includes(gfTourtype)) return false;
      if (gfSeason && !tags.includes(gfSeason)) return false;
      if (gfOther && !tags.includes(gfOther)) return false;
      return true;
    });
  }, [photos, regionTab, search, gfRegion, gfTourtype, gfSeason, gfOther]);

  const attractionLoosePhotos = useMemo(() => {
    if (!attractionFilter) return loosePhotos;
    const poolSet = new Set(attractionPoolIds);
    return photos.filter((p) => !p.product && poolSet.has(p.id));
  }, [photos, loosePhotos, attractionFilter, attractionPoolIds]);

  const displayLoosePhotos = attractionFilter && !linkBrowseMode ? attractionLoosePhotos : loosePhotos;

  const tourProducts = useMemo(() => {
    const q = search.toLowerCase();
    let list = products.filter((p) => {
      if (regionTab !== 'all' && p.region !== regionTab) return false;
      if (productFilter && p.code !== productFilter) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.code.toLowerCase().includes(q)) return false;
      return true;
    });

    if (tourFilter !== 'all') {
      list = list.filter((p) => {
        const st = productPhotoSlotStatus(photos, p.code);
        return tourFilter === 'complete' ? st.complete : !st.complete;
      });
    }

    return list;
  }, [products, regionTab, search, productFilter, tourFilter, photos]);

  const tourGroups = useMemo(() => groupProductsByRegion(tourProducts), [tourProducts]);

  const filterCount = [gfRegion, gfTourtype, gfSeason, gfOther].filter(Boolean).length;

  function clearFilters() {
    setSearch('');
    setGfRegion('');
    setGfTourtype('');
    setGfSeason('');
    setGfOther('');
    setTourFilter('all');
    if (productFilter || attractionFilter) router.push('/gallery');
  }

  function openModal(mode: GalleryModalMode, opts?: { product?: string; photo?: GalleryPhotoRecord }) {
    setModalMode(mode);
    setEditingPhoto(opts?.photo ?? null);
    setPresetProduct(opts?.product ?? '');
    setModalOpen(true);
  }

  function ownerForNewUpload(productCode?: string): GalleryPhotoOwner {
    if (productCode) return { kind: 'tour', tourCode: productCode };
    if (attractionFilter) return { kind: 'attraction', attractionId: attractionFilter };
    return { kind: 'loose' };
  }

  function ownerForExistingPhoto(photo?: Pick<GalleryPhotoRecord, 'product'> | null): GalleryPhotoOwner {
    if (photo?.product) return { kind: 'tour', tourCode: photo.product };
    if (attractionFilter) return { kind: 'attraction', attractionId: attractionFilter };
    return { kind: 'loose' };
  }

  async function uploadRecord(photoId: string, file: File, owner: GalleryPhotoOwner) {
    const supabase = createClient();
    return uploadGalleryPhoto(supabase, photoId, file, owner);
  }

  function buildPhotoRecord(
    id: string,
    upload: Awaited<ReturnType<typeof uploadRecord>>,
    base: { caption: string; region: string; product?: string; tags: string[]; slot?: 1 | 2 }
  ): GalleryPhotoRecord {
    return {
      id,
      caption: base.caption,
      region: base.region,
      product: base.product,
      slot: base.slot,
      tags: base.tags,
      url: upload.url,
      thumbUrl: upload.thumbUrl,
      storagePath: upload.storagePath,
      displayBytes: upload.displayBytes,
    };
  }

  async function savePhoto(data: GalleryPhotoSavePayload, id?: string) {
    setSaving(true);
    setSaveStatus('');
    try {
      if (id) {
        const existing = photos.find((p) => p.id === id);
        if (!existing) return;
        let url = existing.url;
        let thumbUrl = existing.thumbUrl;
        let storagePath = existing.storagePath;
        let displayBytes = existing.displayBytes;
        if (data.replaceImage && data.file) {
          setSaveStatus('Compressing and uploading…');
          const owner = ownerForExistingPhoto({ product: data.product || existing.product });
          await deleteGalleryPhotoFiles(createClient(), id, owner);
          const uploaded = await uploadRecord(id, data.file, owner);
          url = uploaded.url;
          thumbUrl = uploaded.thumbUrl;
          storagePath = uploaded.storagePath;
          displayBytes = uploaded.displayBytes;
        }
        let next = photos.map((p) =>
          p.id === id
            ? {
                ...p,
                caption: data.caption,
                url,
                thumbUrl,
                storagePath,
                displayBytes,
                region: data.region,
                product: data.product || undefined,
                slot: data.product ? p.slot : undefined,
                tags: data.tags,
              }
            : p
        );
        if (!data.product && existing.product) {
          next = next.map((p) => (p.id === id ? { ...p, product: undefined, slot: undefined } : p));
        }
        setPhotos(next);
        setSaveStatus('Saving metadata to Supabase…');
        await syncPhotosToSupabase(data.product ? [data.product] : undefined);
      } else if (data.tourBatch?.length) {
        const base = {
          region: data.region,
          product: data.product || undefined,
          tags: data.tags,
        };
        let next = [...photos];

        for (let i = 0; i < data.tourBatch.length; i++) {
          const item = data.tourBatch[i];
          setSaveStatus(`Compressing and uploading photo ${i + 1} of ${data.tourBatch.length}…`);
          const photoId = nextPhotoId(next);
          const uploaded = await uploadRecord(photoId, item.file, ownerForNewUpload(data.product));
          if (item.previewSlot && data.product) {
            next = clearSlotFromOthers(next, data.product, item.previewSlot, photoId);
          }
          const record = buildPhotoRecord(photoId, uploaded, {
            ...base,
            caption: item.caption,
            slot: item.previewSlot,
          });
          next = [...next, record];
        }
        setPhotos(next);
        setSaveStatus('Saving metadata to Supabase…');
        await syncPhotosToSupabase(data.product ? [data.product] : undefined);
      } else if (data.looseBatch?.length) {
        const base = {
          region: data.region,
          tags: data.tags,
        };
        let next = [...photos];

        for (let i = 0; i < data.looseBatch.length; i++) {
          const item = data.looseBatch[i]!;
          setSaveStatus(`Compressing and uploading photo ${i + 1} of ${data.looseBatch.length}…`);
          const photoId = nextPhotoId(next);
          const uploaded = await uploadRecord(photoId, item.file, ownerForNewUpload(undefined));
          const record = buildPhotoRecord(photoId, uploaded, {
            ...base,
            caption: item.caption,
          });
          next = [...next, record];
          if (attractionFilter) {
            linkPhotoToAttractionWithFeatured(attractionFilter, photoId);
          }
        }
        setPhotos(next);
        setSaveStatus('Saving metadata to Supabase…');
        await syncPhotosToSupabase();
        if (attractionFilter) {
          const attractionsResult = await pushTablesToSupabase(['attractions'], false);
          if (!attractionsResult.ok) {
            throw new Error(attractionsResult.error ?? 'Không lưu được liên kết attraction lên Supabase');
          }
        }
      } else if (data.file) {
        const base = {
          region: data.region,
          product: data.product || undefined,
          tags: data.tags,
        };
        const photoId = nextPhotoId(photos);
        setSaveStatus('Compressing and uploading…');
        const uploaded = await uploadRecord(photoId, data.file, ownerForNewUpload(data.product));
        const record = buildPhotoRecord(photoId, uploaded, {
          ...base,
          caption: data.caption,
        });
        setPhotos([...photos, record]);
        if (attractionFilter && !data.product) {
          linkPhotoToAttractionWithFeatured(attractionFilter, photoId);
        }
        setSaveStatus('Saving metadata to Supabase…');
        await syncPhotosToSupabase(data.product ? [data.product] : undefined);
        if (attractionFilter && !data.product) {
          const attractionsResult = await pushTablesToSupabase(['attractions'], false);
          if (!attractionsResult.ok) {
            throw new Error(attractionsResult.error ?? 'Không lưu được liên kết attraction lên Supabase');
          }
        }
      } else {
        throw new Error('Add at least one image.');
      }
      setSaveStatus('');
      setModalOpen(false);
      setEditingPhoto(null);
      setPresetProduct('');
    } catch (err) {
      setSaveStatus(err instanceof Error ? err.message : 'Upload failed');
      return;
    } finally {
      setSaving(false);
    }
  }

  async function assignSlot(photoId: string, slot: 1 | 2) {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo?.product) return;
    let next = clearSlotFromOthers(photos, photo.product, slot, photoId);
    next = next.map((p) => (p.id === photoId ? { ...p, slot } : p));
    setPhotos(next);
    try {
      await syncPhotosToSupabase([photo.product]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save slot assignment');
    }
  }

  async function deletePhoto(id: string) {
    const photo = photos.find((p) => p.id === id);
    try {
      await deleteGalleryPhotoFiles(createClient(), id, ownerForExistingPhoto(photo));
    } catch {
      // best-effort
    }
    removePhotoFromAttractions(id);
    setPhotos(photos.filter((p) => p.id !== id));
    try {
      await pushTablesToSupabase(['photos'], false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove photo from database');
    }
  }

  async function handleBulkUpload(items: BulkUploadItem[], overwriteSlots: boolean) {
    setBulkUploading(true);
    setBulkProgress({ done: 0, total: items.length, label: 'Starting…' });
    let next = [...photos];

    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setBulkProgress({ done: i, total: items.length, label: `Uploading ${item.file.name}` });

        if (item.slot && overwriteSlots) {
          const existing = next.find((p) => p.product === item.productCode && p.slot === item.slot);
          if (existing) {
            try {
              await deleteGalleryPhotoFiles(createClient(), existing.id, ownerForExistingPhoto(existing));
            } catch {
              /* ignore */
            }
            removePhotoFromAttractions(existing.id);
            next = next.filter((p) => p.id !== existing.id);
          }
        }

        const photoId = nextPhotoId(next);
        const uploaded = await uploadRecord(photoId, item.file, ownerForNewUpload(item.productCode));
        if (item.slot) {
          next = clearSlotFromOthers(next, item.productCode, item.slot, photoId);
        }
        const record = buildPhotoRecord(photoId, uploaded, {
          caption: item.caption,
          region: item.region,
          product: item.productCode,
          tags: [],
          slot: item.slot ?? undefined,
        });
        next = [...next, record];
        setPhotos(next);
      }
      setBulkProgress({ done: items.length, total: items.length, label: 'Saving to Supabase…' });
      await syncPhotosToSupabase(items.map((item) => item.productCode));
      setBulkProgress({ done: items.length, total: items.length, label: 'Done' });
      setBulkOpen(false);
    } catch (err) {
      setBulkProgress({
        done: 0,
        total: items.length,
        label: err instanceof Error ? err.message : 'Upload failed',
      });
    } finally {
      setBulkUploading(false);
    }
  }

  return (
    <div className="gallery-page">
      <div className="gallery-main-tabs">
        <button
          type="button"
          className={`gallery-main-tab${mainTab === 'tour' ? ' on' : ''}`}
          onClick={() => setMainTab('tour')}
        >
          Tour Photos
        </button>
        <button
          type="button"
          className={`gallery-main-tab${mainTab === 'loose' ? ' on' : ''}`}
          onClick={() => setMainTab('loose')}
        >
          Ảnh lẻ ({photos.filter((p) => !p.product).length})
        </button>
      </div>

      <div className="tabs">
        {REGION_TABS.map((t) => (
          <div
            key={t.id}
            className={`tab${regionTab === t.id ? ' on' : ''}`}
            onClick={() => setRegionTab(t.id)}
            role="button"
            tabIndex={0}
          >
            {t.label}
          </div>
        ))}
      </div>

      {attractionFilter && mainTab === 'loose' && (
        <div className="gallery-product-banner">
          <span>
            {linkBrowseMode ? (
              <>
                Browse loose photos to link to: <b>{linkedAttraction?.name || attractionFilter}</b>
              </>
            ) : (
              <>
                Photos linked to: <b>{linkedAttraction?.name || attractionFilter}</b>
                <span style={{ marginLeft: 10, fontSize: 11.5, color: 'var(--m)' }}>
                  {attractionPoolIds.length} in pool
                  {linkedAttraction?.photoIds?.length
                    ? ` · ${linkedAttraction.photoIds.length}/4 featured`
                    : ''}
                </span>
              </>
            )}
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn-s btn-sm"
              type="button"
              onClick={() => setLinkBrowseMode((v) => !v)}
            >
              {linkBrowseMode ? 'Show linked pool' : 'Browse all to link'}
            </button>
            <button className="btn btn-s btn-sm" type="button" onClick={() => router.push('/gallery')}>
              ✕ Clear attraction filter
            </button>
          </div>
        </div>
      )}

      {productFilter && mainTab === 'tour' && (
        <div className="gallery-product-banner">
          <span>
            Showing tour: <b>{linkedProduct?.name || productFilter}</b>
            {productSlotStatus && (
              <span style={{ marginLeft: 10, fontSize: 11.5, color: productSlotStatus.complete ? 'var(--g)' : 'var(--amb)' }}>
                {productSlotStatus.complete
                  ? `${productSlotStatus.linked}/${productSlotStatus.needed} preview pair complete`
                  : `${productSlotStatus.linked}/${productSlotStatus.needed} — add slot ${productSlotStatus.linked + 1} for full preview`}
              </span>
            )}
          </span>
          <button className="btn btn-s btn-sm" type="button" onClick={() => router.push('/gallery')}>
            ✕ Clear tour filter
          </button>
        </div>
      )}

      <div className="gallery-filter-bar">
        <input
          type="text"
          placeholder={mainTab === 'tour' ? 'Search tours…' : 'Search by title or tag…'}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {mainTab === 'tour' ? (
          <select value={tourFilter} onChange={(e) => setTourFilter(e.target.value as typeof tourFilter)}>
            <option value="all">All tours</option>
            <option value="incomplete">Missing photos</option>
            <option value="complete">Pair complete</option>
          </select>
        ) : (
          <>
            <select value={gfRegion} onChange={(e) => setGfRegion(e.target.value)}>
              <option value="">All Regions</option>
              {GALLERY_TAG_TAXONOMY.REGION.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={gfTourtype} onChange={(e) => setGfTourtype(e.target.value)}>
              <option value="">All Tour Types</option>
              {GALLERY_TAG_TAXONOMY['TOUR TYPE'].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={gfSeason} onChange={(e) => setGfSeason(e.target.value)}>
              <option value="">All Seasons</option>
              {GALLERY_TAG_TAXONOMY.SEASON.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={gfOther} onChange={(e) => setGfOther(e.target.value)}>
              <option value="">All Other</option>
              {GALLERY_TAG_TAXONOMY.OTHER.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </>
        )}
        <button className="btn btn-s btn-sm" type="button" onClick={clearFilters}>
          ✕ Clear
        </button>
        {filterCount > 0 && mainTab === 'loose' && (
          <span className="gallery-filter-count">
            {filterCount} filter{filterCount > 1 ? 's' : ''} active
          </span>
        )}
        <div style={{ flex: 1 }} />
        {mainTab === 'tour' ? (
          <>
            <button className="btn btn-s btn-sm" type="button" onClick={() => setBulkOpen(true)}>
              Upload folder
            </button>
            <button className="btn btn-p btn-sm" type="button" onClick={() => openModal('addToTour')}>
              + Add tour photos
            </button>
          </>
        ) : (
          <>
            <span className="bdg bdg-g">{displayLoosePhotos.length} photos</span>
            <button className="btn btn-p btn-sm" type="button" onClick={() => openModal('addLoose')}>
              + Add photo
            </button>
          </>
        )}
      </div>

      {mainTab === 'tour' ? (
        !tourProducts.length ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--m)' }}>
            <div style={{ fontSize: 13, marginBottom: 10 }}>No tours match your filters.</div>
            <button className="btn btn-s btn-sm" type="button" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div>
            {[...tourGroups.entries()].map(([region, list]) => (
              <div key={region} className="gallery-region-group">
                <div className="gallery-region-group-hd">{productRegionLabel(region)}</div>
                <div className="gallery-tour-grid">
                  {list.map((product) => (
                    <GalleryTourPairCard
                      key={product.code}
                      product={product}
                      slots={photosForProductSlots(photos, product.code)}
                      highlighted={highlightRef.current === product.code}
                      onAddPhotos={() => openModal('addToTour', { product: product.code })}
                      onSetPreview={assignSlot}
                      onEdit={(photo) => openModal('edit', { photo })}
                      onDelete={(id) => void deletePhoto(id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : !displayLoosePhotos.length ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--m)' }}>
          <div style={{ fontSize: 13, marginBottom: 10 }}>
            {attractionFilter && !linkBrowseMode
              ? 'No photos linked to this attraction yet.'
              : 'No loose photos match your filters.'}
          </div>
          {attractionFilter && !linkBrowseMode ? (
            <button className="btn btn-p btn-sm" type="button" onClick={() => openModal('addLoose')}>
              + Add photo
            </button>
          ) : (
            <button className="btn btn-s btn-sm" type="button" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="gallery-grid">
          {displayLoosePhotos.map((p) => {
            const col = REGION_COLORS[p.region] || '#2E7D52';
            const tags = Array.isArray(p.tags) ? p.tags : [];
            const visibleTags = tags.slice(0, 3);
            const extraCount = tags.length - 3;
            const thumb = photoThumbUrl(p);
            const isLinked = attractionFilter ? attractionPoolIds.includes(p.id) : false;
            const isFeatured = attractionFilter ? linkedAttraction?.photoIds?.includes(p.id) : false;

            return (
              <div key={p.id} className={`gallery-card${isLinked ? ' gallery-card-linked' : ''}`}>
                <button
                  type="button"
                  className="gallery-card-img gallery-card-img-btn"
                  onClick={() => {
                    setLooseViewerId(p.id);
                    setLooseViewerOpen(true);
                  }}
                >
                  {thumb ? (
                    <StorageImage src={thumb} alt={p.caption} fill sizes="(max-width: 768px) 50vw, 280px" className="gallery-img-cover" />
                  ) : (
                    <div
                      className="gallery-placeholder"
                      style={{ background: `linear-gradient(135deg,${col}dd,${col}88)`, height: '100%' }}
                    >
                      <div style={{ fontSize: 32 }}>🏔</div>
                      <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500 }}>No image — upload again</div>
                    </div>
                  )}
                </button>
                <div className="gallery-card-body">
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>{p.caption}</div>
                  {attractionFilter && isFeatured && (
                    <span className="gallery-tag gallery-tag-featured">Featured</span>
                  )}
                  {tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {visibleTags.map((t) => (
                        <span key={t} className="gallery-tag">
                          {t}
                        </span>
                      ))}
                      {extraCount > 0 && <span className="gallery-tag gallery-tag-more">+{extraCount} more</span>}
                    </div>
                  )}
                  {attractionFilter && (
                    <div className="gallery-card-actions">
                      <button
                        type="button"
                        className="btn btn-s btn-sm gallery-card-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal('edit', { photo: p });
                        }}
                      >
                        Edit photo
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm gallery-link-btn${isLinked ? ' btn-s' : ' btn-p'}`}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (isLinked) {
                            unlinkPhotoFromAttraction(attractionFilter, p.id);
                          } else {
                            linkPhotoToAttractionWithFeatured(attractionFilter, p.id);
                          }
                          try {
                            const result = await pushTablesToSupabase(['attractions'], false);
                            if (!result.ok) {
                              alert(result.error ?? 'Failed to save attraction links');
                            }
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Failed to save attraction links');
                          }
                        }}
                      >
                        {isLinked ? 'Unlink' : 'Link to attraction'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <GalleryPhotoModal
        open={modalOpen}
        mode={modalMode}
        initial={editingPhoto}
        presetProduct={presetProduct}
        products={products}
        existingPhotos={photos}
        saving={saving}
        saveStatus={saveStatus}
        onClose={() => {
          if (saving) return;
          setModalOpen(false);
          setEditingPhoto(null);
          setPresetProduct('');
          setSaveStatus('');
        }}
        onSave={savePhoto}
        onDelete={async (id) => {
          await deletePhoto(id);
          setModalOpen(false);
          setEditingPhoto(null);
        }}
      />

      <GalleryLoosePhotoViewer
        open={looseViewerOpen}
        photos={displayLoosePhotos}
        activeId={looseViewerId}
        onClose={() => setLooseViewerOpen(false)}
        onSelect={setLooseViewerId}
        onEdit={(photo) => {
          setLooseViewerOpen(false);
          openModal('edit', { photo });
        }}
        onDelete={(id) => {
          void deletePhoto(id);
          const remaining = displayLoosePhotos.filter((p) => p.id !== id);
          if (!remaining.length) setLooseViewerOpen(false);
          else setLooseViewerId(remaining[0]!.id);
        }}
      />

      <GalleryBulkUploadModal
        open={bulkOpen}
        products={products}
        existingPhotos={photos}
        uploading={bulkUploading}
        progress={bulkProgress}
        onClose={() => {
          if (bulkUploading) return;
          setBulkOpen(false);
        }}
        onUpload={handleBulkUpload}
      />
    </div>
  );
}

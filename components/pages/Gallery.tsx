'use client';

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useStore } from '@/hooks/useStore';
import { GALLERY_TAG_TAXONOMY } from '@/lib/gallery-tags';
import type { GalleryPhotoForm } from '@/lib/gallery-tags';
import { productPhotoSlotIndex, productPhotoSlotStatus } from '@/lib/gallery-helpers';
import GalleryPhotoModal, { type GalleryPhotoRecord } from '@/components/gallery/GalleryPhotoModal';

const REGION_TABS = [
  { id: 'all', label: 'All Photos' },
  { id: 'north', label: 'Northern Vietnam' },
  { id: 'central', label: 'Central Vietnam' },
  { id: 'south', label: 'Southern Vietnam' },
  { id: 'people', label: 'People & Culture' },
] as const;

const REGION_COLORS: Record<string, string> = {
  north: '#2E7D52',
  central: '#856404',
  south: '#1565C0',
  people: '#6B21A8',
};

function nextPhotoId(photos: GalleryPhotoRecord[]) {
  const max = photos.reduce((n, p) => {
    const num = parseInt(p.id.replace(/^PH-/, ''), 10);
    return Number.isFinite(num) ? Math.max(n, num) : n;
  }, 0);
  return `PH-${String(max + 1).padStart(3, '0')}`;
}

export default function Gallery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productFilter = searchParams.get('product') || '';
  const photos = useStore((s) => s.photos) as GalleryPhotoRecord[];
  const products = useStore((s) => s.products);
  const linkedProduct = productFilter ? products.find((p) => p.code === productFilter) : null;
  const productSlotStatus = productFilter ? productPhotoSlotStatus(photos, productFilter) : null;

  function setPhotos(next: GalleryPhotoRecord[]) {
    useStore.setState({ photos: next });
  }

  const [regionTab, setRegionTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [gfRegion, setGfRegion] = useState('');
  const [gfTourtype, setGfTourtype] = useState('');
  const [gfSeason, setGfSeason] = useState('');
  const [gfOther, setGfOther] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhotoRecord | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return photos.filter((p) => {
      if (productFilter && p.product !== productFilter) return false;
      if (regionTab !== 'all' && p.region !== regionTab) return false;
      if (q && !p.caption.toLowerCase().includes(q) && !(p.tags || []).some((t) => t.toLowerCase().includes(q))) return false;
      const tags = Array.isArray(p.tags) ? p.tags : [];
      if (gfRegion && !tags.includes(gfRegion)) return false;
      if (gfTourtype && !tags.includes(gfTourtype)) return false;
      if (gfSeason && !tags.includes(gfSeason)) return false;
      if (gfOther && !tags.includes(gfOther)) return false;
      return true;
    });
  }, [photos, regionTab, search, gfRegion, gfTourtype, gfSeason, gfOther, productFilter]);

  const filterCount = [gfRegion, gfTourtype, gfSeason, gfOther].filter(Boolean).length;

  function clearFilters() {
    setSearch('');
    setGfRegion('');
    setGfTourtype('');
    setGfSeason('');
    setGfOther('');
    if (productFilter) router.push('/gallery');
  }

  function openAdd() {
    setModalMode('add');
    setEditingPhoto(null);
    setModalOpen(true);
  }

  function openEdit(photo: GalleryPhotoRecord) {
    setModalMode('edit');
    setEditingPhoto(photo);
    setModalOpen(true);
  }

  function savePhoto(data: GalleryPhotoForm, id?: string) {
    if (id) {
      setPhotos(photos.map((p) => (p.id === id ? { ...p, caption: data.caption, url: data.url, region: data.region, product: data.product, tags: data.tags } : p)));
    } else {
      const base = {
        region: data.region,
        product: data.product,
        tags: data.tags,
      };
      const first: GalleryPhotoRecord = {
        id: nextPhotoId(photos),
        caption: data.caption,
        url: data.url,
        ...base,
      };
      const next = [...photos, first];
      if (data.product && data.url2) {
        const second: GalleryPhotoRecord = {
          id: nextPhotoId(next),
          caption: data.caption2 || `${data.caption} (2)`,
          url: data.url2,
          ...base,
        };
        setPhotos([...next, second]);
      } else {
        setPhotos(next);
      }
    }
    setModalOpen(false);
    setEditingPhoto(null);
  }

  function deletePhoto(id: string) {
    if (confirm('Remove this photo?')) setPhotos(photos.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="tabs">
        {REGION_TABS.map((t) => (
          <div key={t.id} className={`tab${regionTab === t.id ? ' on' : ''}`} onClick={() => setRegionTab(t.id)} role="button" tabIndex={0}>
            {t.label}
          </div>
        ))}
      </div>

      {productFilter && (
        <div className="gallery-product-banner">
          <span>
            Showing photos for: <b>{linkedProduct?.name || productFilter}</b>
            {productSlotStatus && (
              <span style={{ marginLeft: 10, fontSize: 11.5, color: productSlotStatus.complete ? 'var(--g)' : 'var(--amb)' }}>
                {productSlotStatus.complete
                  ? `${productSlotStatus.linked}/${productSlotStatus.needed} photos linked — tour preview complete`
                  : `${productSlotStatus.linked}/${productSlotStatus.needed} linked — add photo ${productSlotStatus.linked + 1} for full tour preview control`}
              </span>
            )}
          </span>
          <button className="btn btn-s btn-sm" type="button" onClick={() => router.push('/gallery')}>
            ✕ Clear product filter
          </button>
        </div>
      )}

      <div className="gallery-filter-bar">
        <input type="text" placeholder="Search by title or tag…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
        <button className="btn btn-s btn-sm" type="button" onClick={clearFilters}>
          ✕ Clear
        </button>
        {filterCount > 0 && <span className="gallery-filter-count">{filterCount} filter{filterCount > 1 ? 's' : ''} active</span>}
        <div style={{ flex: 1 }} />
        <span className="bdg bdg-g">{filtered.length} photos</span>
        <button className="btn btn-p btn-sm" type="button" onClick={openAdd}>
          + Add Photo
        </button>
      </div>

      {!filtered.length ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--m)' }}>
          <div style={{ fontSize: 13, marginBottom: 10 }}>No photos match your current filters.</div>
          <button className="btn btn-s btn-sm" type="button" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="gallery-grid">
          {filtered.map((p) => {
            const col = REGION_COLORS[p.region] || '#2E7D52';
            const tags = Array.isArray(p.tags) ? p.tags : [];
            const visibleTags = tags.slice(0, 3);
            const extraCount = tags.length - 3;
            const slot = p.product ? productPhotoSlotIndex(photos, p.id, p.product) : null;

            return (
              <div key={p.id} className="gallery-card">
                <div
                  className="gallery-card-img"
                  style={
                    p.url
                      ? { background: `url(${p.url}) center/cover no-repeat` }
                      : { background: `linear-gradient(135deg,${col}dd,${col}88)` }
                  }
                >
                  {slot !== null && (
                    <span className="gallery-slot-badge">Slot {slot}</span>
                  )}
                  {!p.url && (
                    <div className="gallery-placeholder">
                      <div style={{ fontSize: 32 }}>🏔</div>
                      <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500 }}>No image yet</div>
                    </div>
                  )}
                  <div className="gallery-card-actions">
                    <button type="button" className="gallery-edit-btn" title="Edit photo" onClick={() => openEdit(p)}>
                      ✎
                    </button>
                    <button type="button" className="gallery-del-btn" title="Delete photo" onClick={() => deletePhoto(p.id)}>
                      ✕
                    </button>
                  </div>
                </div>
                <div className="gallery-card-body">
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>{p.caption}</div>
                  {p.product && (
                    <div style={{ fontSize: 10, color: 'var(--m)', marginBottom: 4, fontFamily: 'monospace' }}>{p.product}</div>
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
        products={products}
        existingPhotos={photos}
        onClose={() => {
          setModalOpen(false);
          setEditingPhoto(null);
        }}
        onSave={savePhoto}
      />
    </div>
  );
}

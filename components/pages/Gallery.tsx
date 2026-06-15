'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/hooks/useStore';

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

type Photo = { id: string; caption: string; region: string; product?: string; tags?: string[]; url?: string };

export default function Gallery() {
  const photos = useStore((s) => s.photos) as Photo[];
  const products = useStore((s) => s.products);

  function setPhotos(next: Photo[]) {
    useStore.setState({ photos: next });
  }

  const [regionTab, setRegionTab] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [gfRegion, setGfRegion] = useState('');
  const [gfTourtype, setGfTourtype] = useState('');
  const [gfSeason, setGfSeason] = useState('');
  const [gfOther, setGfOther] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ caption: '', url: '', region: 'north', product: '', tags: [] as string[] });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return photos.filter((p) => {
      if (regionTab !== 'all' && p.region !== regionTab) return false;
      if (q && !p.caption.toLowerCase().includes(q)) return false;
      const tags = Array.isArray(p.tags) ? p.tags : [];
      if (gfRegion && !tags.includes(gfRegion)) return false;
      if (gfTourtype && !tags.includes(gfTourtype)) return false;
      if (gfSeason && !tags.includes(gfSeason)) return false;
      if (gfOther && !tags.includes(gfOther)) return false;
      return true;
    });
  }, [photos, regionTab, search, gfRegion, gfTourtype, gfSeason, gfOther]);

  const filterCount = [gfRegion, gfTourtype, gfSeason, gfOther].filter(Boolean).length;

  function clearFilters() {
    setSearch('');
    setGfRegion('');
    setGfTourtype('');
    setGfSeason('');
    setGfOther('');
  }

  function savePhoto() {
    if (!form.caption.trim()) return;
    const photo: Photo = {
      id: `PH-${String(photos.length + 1).padStart(3, '0')}`,
      caption: form.caption.trim(),
      url: form.url.trim(),
      region: form.region,
      product: form.product,
      tags: form.tags,
    };
    setPhotos([...photos, photo]);
    setShowAdd(false);
    setForm({ caption: '', url: '', region: 'north', product: '', tags: [] });
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

      <div className="gallery-filter-bar">
        <input type="text" placeholder="Search by title…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={gfRegion} onChange={(e) => setGfRegion(e.target.value)}>
          <option value="">All Regions</option>
          <option>Hanoi</option>
          <option>Ha Long Bay</option>
          <option>Hoi An</option>
          <option>Sapa</option>
        </select>
        <select value={gfTourtype} onChange={(e) => setGfTourtype(e.target.value)}>
          <option value="">All Tour Types</option>
          <option>Cultural</option>
          <option>Adventure</option>
          <option>Culinary</option>
          <option>Luxury</option>
        </select>
        <select value={gfSeason} onChange={(e) => setGfSeason(e.target.value)}>
          <option value="">All Seasons</option>
          <option>Dry Season (Nov–Apr)</option>
          <option>Peak Season</option>
        </select>
        <select value={gfOther} onChange={(e) => setGfOther(e.target.value)}>
          <option value="">All Other</option>
          <option>Marketing Use OK</option>
          <option>Drone Shot</option>
        </select>
        <button className="btn btn-s btn-sm" type="button" onClick={clearFilters}>
          ✕ Clear
        </button>
        {filterCount > 0 && <span className="gallery-filter-count">{filterCount} filter{filterCount > 1 ? 's' : ''} active</span>}
        <div style={{ flex: 1 }} />
        <span className="bdg bdg-g">{filtered.length} photos</span>
        <button className="btn btn-p btn-sm" type="button" onClick={() => setShowAdd(true)}>
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
                  {!p.url && (
                    <div className="gallery-placeholder">
                      <div style={{ fontSize: 32 }}>🏔</div>
                      <div style={{ fontSize: 11, marginTop: 4, fontWeight: 500 }}>No image yet</div>
                    </div>
                  )}
                  <div className="gallery-region-badge">{p.region.toUpperCase()}</div>
                  <button type="button" className="gallery-del-btn" onClick={() => deletePhoto(p.id)}>
                    ✕
                  </button>
                </div>
                <div className="gallery-card-body">
                  <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>{p.caption}</div>
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

      {showAdd && (
        <div className="modal-overlay open" onClick={() => setShowAdd(false)}>
          <div className="modal" style={{ width: 500 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Add Photo to Gallery</span>
              <button type="button" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }} onClick={() => setShowAdd(false)}>
                ×
              </button>
            </div>
            <div className="fg">
              <label className="lbl">Photo URL</label>
              <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="fg">
              <label className="lbl">Caption / Title *</label>
              <input value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
            </div>
            <div className="fg">
              <label className="lbl">Region</label>
              <select value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })}>
                <option value="north">Northern Vietnam</option>
                <option value="central">Central Vietnam</option>
                <option value="south">Southern Vietnam</option>
                <option value="people">People & Culture</option>
              </select>
            </div>
            <div className="fg">
              <label className="lbl">Linked Tour Product</label>
              <select value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })}>
                <option value="">— Not linked —</option>
                {products.slice(0, 50).map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button className="btn btn-s" type="button" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="btn btn-p" type="button" onClick={savePhoto}>
                Save Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

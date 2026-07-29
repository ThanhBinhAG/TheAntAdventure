'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import { nextAttractionId, photosForAttraction } from '@/lib/attractions/attractions-helpers';
import type { Attraction } from '@/lib/types';
import AttractionEditModal, { type AttractionFormData } from '@/components/attractions/AttractionEditModal';
import AttractionPhotoLightbox from '@/components/attractions/AttractionPhotoLightbox';
import AttractionRegionColumn from '@/components/attractions/AttractionRegionColumn';
import AttractionTable from '@/components/attractions/AttractionTable';

import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
type ViewMode = 'grid' | 'columns';

export default function Attractions() {
  const attractions = useStore((s) => s.attractions);
  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const addAttraction = useStore((s) => s.addAttraction);
  const updateAttraction = useStore((s) => s.updateAttraction);
  const deleteAttraction = useStore((s) => s.deleteAttraction);

  const [region, setRegion] = useState('');
  const [typeF, setTypeF] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Attraction | null>(null);
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [addRegionPref, setAddRegionPref] = useState<Attraction['region'] | null>(null);
  const [lightbox, setLightbox] = useState<{ attractionId: string; index: number } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return attractions.filter((a) => {
      if (region && a.region !== region) return false;
      if (typeF && a.type !== typeF) return false;
      if (
        q &&
        !a.name.toLowerCase().includes(q) &&
        !a.dest.toLowerCase().includes(q) &&
        !a.notes.toLowerCase().includes(q) &&
        !a.phone.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [attractions, region, typeF, search]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const closedToday = filtered.filter((a) => a.closed.toUpperCase().includes(today.toUpperCase().slice(0, 3)));
  const regions = region ? [region] : (['north', 'central', 'south'] as const);

  const lightboxPhotos = useMemo(() => {
    if (!lightbox) return [];
    const attraction = attractions.find((a) => a.id === lightbox.attractionId);
    if (!attraction) return [];
    return photosForAttraction(photos, attraction);
  }, [lightbox, attractions, photos]);

  const addRegion = (editTarget?.region || addRegionPref || (region as Attraction['region']) || 'north') as Attraction['region'];

  function closeForm() {
    setFormMode(null);
    setEditTarget(null);
    setAddRegionPref(null);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function openAdd(pref?: Attraction['region']) {
    setEditTarget(null);
    setAddRegionPref(pref || (region as Attraction['region']) || null);
    setFormMode('add');
  }

  function openEdit(attraction: Attraction) {
    setEditTarget(attraction);
    setAddRegionPref(null);
    setFormMode('edit');
  }

  function handleDelete(id: string) {
    deleteAttraction(id);
    if (expandedId === id) setExpandedId(null);
    closeForm();
  }

  function handleSave(form: AttractionFormData) {
    const payload: Attraction = {
      id: form.id,
      region: form.region,
      type: form.type,
      name: form.name.trim(),
      dest: form.dest.trim(),
      hours: form.hours.trim(),
      closed: form.closed.trim() || 'None',
      admission: form.admission.trim(),
      duration: form.duration,
      best_time: form.best_time.trim(),
      crowd: form.crowd.trim(),
      book_req: form.book_req,
      seasonal: form.seasonal.trim(),
      notes: form.notes.trim(),
      alert: form.alert.trim(),
      phone: form.phone.trim(),
      photoIds: [...form.photoIds],
      linkedPhotoIds: [...form.linkedPhotoIds],
    };

    if (formMode === 'edit') {
      updateAttraction(payload.id, payload);
    } else {
      addAttraction(payload);
      setRegion('');
      setSearch('');
      setExpandedId(payload.id);
    }
    closeForm();
  }

  return (
    <div className="att-page">
      <div className="att-toolbar">
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">All Regions</option>
          <option value="north">🏔 Northern Vietnam</option>
          <option value="central">🏯 Central Vietnam</option>
          <option value="south">🌿 Southern Vietnam</option>
        </select>
        <select value={typeF} onChange={(e) => setTypeF(e.target.value)}>
          <option value="">All Types</option>
          <option value="museum">🏛 Museum</option>
          <option value="heritage">🏯 Heritage Site</option>
          <option value="temple">🛕 Temple / Pagoda</option>
          <option value="landmark">📍 Landmark</option>
          <option value="nature">🌿 Nature Site</option>
        </select>
        <input
          className="att-search"
          placeholder="Search attractions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className="btn btn-p btn-sm" onClick={() => openAdd()}>
          + Add Attraction
        </button>
        <div className="att-view-toggle">
          <button
            type="button"
            className={`att-view-btn${viewMode === 'grid' ? ' on' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            ⊞ Grid
          </button>
          <button
            type="button"
            className={`att-view-btn${viewMode === 'columns' ? ' on' : ''}`}
            onClick={() => setViewMode('columns')}
          >
            ☰ Columns
          </button>
        </div>
        <div style={{ flex: 1 }} />
        {closedToday.length > 0 && (
          <div className="att-alert-bar">
            ⚠ Today is {today}. Closed: {closedToday.map((a) => a.name).join(', ')}
          </div>
        )}
      </div>

      <div
        id="att-grid"
        className={
          viewMode === 'grid'
            ? `att-columns${region ? ' att-columns-single' : ''}`
            : 'att-table-layout'
        }
      >
        {regions.map((r) => {
          const regionAttractions = filtered.filter((a) => a.region === r);
          const hasActiveFilters = Boolean(region || typeF || search);
          const shared = {
            region: r,
            attractions: regionAttractions,
            photos,
            expandedId,
            todayLabel: today,
            emptyHint: hasActiveFilters
              ? 'No attractions match your filters in this region.'
              : 'No attractions in this region yet.',
            onToggle: toggleExpand,
            onEdit: openEdit,
            onAdd: () => openAdd(r as Attraction['region']),
            onPhotoClick: (attractionId: string, index: number) =>
              setLightbox({ attractionId, index }),
          };

          return viewMode === 'grid' ? (
            <AttractionRegionColumn key={r} {...shared} />
          ) : (
            <AttractionTable key={r} {...shared} />
          );
        })}
      </div>

      <AttractionEditModal
        open={formMode !== null}
        mode={formMode === 'edit' ? 'edit' : 'add'}
        attraction={editTarget}
        attractions={attractions}
        photos={photos}
        defaultRegion={addRegion}
        nextId={formMode === 'add' ? nextAttractionId(attractions, addRegion) : undefined}
        onClose={closeForm}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      <AttractionPhotoLightbox
        open={Boolean(lightbox)}
        photos={lightboxPhotos}
        index={lightbox?.index ?? 0}
        onClose={() => setLightbox(null)}
        onNavigate={(index) => lightbox && setLightbox({ ...lightbox, index })}
      />
    </div>
  );
}

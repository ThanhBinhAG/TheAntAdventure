'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/hooks/useStore';
import type { Attraction } from '@/lib/types';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import {
  galleryUrlForAttraction,
  nextAttractionId,
  photosLinkedToAttraction,
} from '@/lib/attractions/attractions-helpers';
import { photoThumbUrl } from '@/lib/gallery/gallery-helpers';
import { toCrmPhotoAssetUrl } from '@/lib/gallery/storage-image-src';
import { saveNewLoosePhoto, saveNewLoosePhotosBatch } from '@/lib/gallery/gallery-loose-save';
import { deletePhotoViaApi } from '@/lib/gallery/photo-api';
import GalleryPhotoModal, { type GalleryPhotoSavePayload } from '@/components/gallery/GalleryPhotoModal';
import { toast } from '@/lib/toast';
import { confirmDialog } from '@/lib/confirm';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

export type AttractionFormData = {
  id: string;
  region: Attraction['region'];
  type: string;
  name: string;
  dest: string;
  hours: string;
  closed: string;
  admission: string;
  duration: number;
  best_time: string;
  crowd: string;
  book_req: boolean;
  seasonal: string;
  notes: string;
  alert: string;
  phone: string;
  photoIds: string[];
  linkedPhotoIds: string[];
};

const EMPTY: AttractionFormData = {
  id: '',
  region: 'north',
  type: 'museum',
  name: '',
  dest: '',
  hours: '',
  closed: '',
  admission: '',
  duration: 60,
  best_time: '',
  crowd: '',
  book_req: false,
  seasonal: '',
  notes: '',
  alert: '',
  phone: '',
  photoIds: [],
  linkedPhotoIds: [],
};

type Props = {
  open: boolean;
  mode: 'add' | 'edit';
  attraction?: Attraction | null;
  attractions: Attraction[];
  photos: GalleryPhoto[];
  defaultRegion?: Attraction['region'];
  onClose: () => void;
  onSave: (data: AttractionFormData) => void;
  onDelete?: (id: string) => void;
  nextId?: string;
};

function initialForm(
  mode: Props['mode'],
  attraction: Props['attraction'],
  attractions: Attraction[],
  defaultRegion: Attraction['region'],
  nextId?: string
): AttractionFormData {
  if (mode === 'edit' && attraction) {
    const linked = attraction.linkedPhotoIds?.length
      ? attraction.linkedPhotoIds
      : (attraction.photoIds ?? []);
    return {
      id: attraction.id,
      region: attraction.region,
      type: attraction.type,
      name: attraction.name,
      dest: attraction.dest,
      hours: attraction.hours,
      closed: attraction.closed,
      admission: attraction.admission,
      duration: attraction.duration,
      best_time: attraction.best_time,
      crowd: attraction.crowd,
      book_req: attraction.book_req,
      seasonal: attraction.seasonal,
      notes: attraction.notes,
      alert: attraction.alert,
      phone: attraction.phone,
      photoIds: [...(attraction.photoIds ?? [])],
      linkedPhotoIds: [...linked],
    };
  }
  return {
    ...EMPTY,
    id: nextId || nextAttractionId(attractions, defaultRegion),
    region: defaultRegion,
  };
}

export default function AttractionEditModal({
  open,
  mode,
  attraction,
  attractions,
  photos,
  defaultRegion = 'north',
  onClose,
  onSave,
  onDelete,
  nextId,
}: Props) {
  const storePhotos = useStore((s) => s.photos) as GalleryPhoto[];
  const formKey = `${open}-${mode}-${attraction ? JSON.stringify(attraction) : `${nextId}-${defaultRegion}-${attractions.map((item) => item.id).join(',')}`}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [form, setForm] = useState<AttractionFormData>(() =>
    initialForm(mode, attraction, attractions, defaultRegion, nextId)
  );
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [quickAddStatus, setQuickAddStatus] = useState('');
  const [quickRemoveMode, setQuickRemoveMode] = useState(false);
  const [selectedRemoveIds, setSelectedRemoveIds] = useState<string[]>([]);
  const [removingPhotoId, setRemovingPhotoId] = useState('');

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    setForm(initialForm(mode, attraction, attractions, defaultRegion, nextId));
  }

  const { tp, tpl, language } = useLanguage();
  const baselineForm = useMemo(
    () => initialForm(mode, attraction, attractions, defaultRegion, nextId),
    [formKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dirty = useFormDirty(open, baselineForm, form, undefined, formKey);
  const { requestClose } = useConfirmClose({ open, dirty, onClose, language });

  const allPhotos = storePhotos.length ? storePhotos : photos;

  const pickablePhotos = useMemo(() => {
    if (!form.linkedPhotoIds.length) return [];
    return photosLinkedToAttraction(allPhotos, {
      linkedPhotoIds: form.linkedPhotoIds,
      photoIds: form.photoIds,
    });
  }, [allPhotos, form.linkedPhotoIds, form.photoIds]);

  const galleryHref =
    form.id && mode === 'edit' ? galleryUrlForAttraction(form.id, form.name) : '';

  if (!open) return null;

  function setRegion(region: Attraction['region']) {
    setForm((f) => ({
      ...f,
      region,
      id: mode === 'add' ? nextAttractionId(attractions, region) : f.id,
    }));
  }

  function toggleFeatured(photoId: string) {
    setForm((f) => {
      const has = f.photoIds.includes(photoId);
      if (has) return { ...f, photoIds: f.photoIds.filter((id) => id !== photoId) };
      if (f.photoIds.length >= 4) return f;
      return { ...f, photoIds: [...f.photoIds, photoId] };
    });
  }

  function syncFormFromStore(attractionId: string) {
    const latest = useStore.getState().attractions.find((a) => a.id === attractionId);
    if (!latest) return;
    const linked = latest.linkedPhotoIds?.length ? latest.linkedPhotoIds : (latest.photoIds ?? []);
    setForm((f) => ({
      ...f,
      linkedPhotoIds: [...linked],
      photoIds: [...(latest.photoIds ?? [])],
    }));
  }

  async function handleQuickAddSave(data: GalleryPhotoSavePayload) {
    if (mode !== 'edit' || !form.id) return;
    setQuickAddSaving(true);
    setQuickAddStatus('');
    try {
      if (data.files?.length && data.files.length > 1) {
        await saveNewLoosePhotosBatch(
          data.files.map((file) => ({
            file,
            caption: data.caption || file.name.replace(/\.[^.]+$/, ''),
          })),
          data,
          {
            attractionId: form.id,
            defaultRegion: form.region,
            onStatus: setQuickAddStatus,
          }
        );
      } else {
        await saveNewLoosePhoto(
          {
            caption: data.caption,
            region: data.region,
            tags: data.tags,
            file: data.file ?? data.files?.[0] ?? null,
          },
          {
            attractionId: form.id,
            defaultRegion: form.region,
            onStatus: setQuickAddStatus,
          }
        );
      }
      syncFormFromStore(form.id);
      setQuickAddOpen(false);
      setQuickAddStatus('');
    } catch (err) {
      setQuickAddStatus(err instanceof Error ? err.message : tp('attractions', 'toastUploadFail'));
    } finally {
      setQuickAddSaving(false);
    }
  }

  async function handleQuickRemoveMany(photoIds: string[]) {
    if (!form.id || mode !== 'edit') return;
    const ids = [...new Set(photoIds)].filter((id) => allPhotos.some((p) => p.id === id));
    if (!ids.length) return;
    setRemovingPhotoId(ids[0] ?? 'batch');
    setQuickAddStatus('');
    try {
      for (const id of ids) {
        try {
          const photo = allPhotos.find((p) => p.id === id);
          await deletePhotoViaApi(id, photo?.storagePath);
        } catch {
          // best-effort storage cleanup; keep deleting metadata
        }
      }

      const removingSet = new Set(ids);
      const state = useStore.getState();
      useStore.setState({
        photos: (state.photos as GalleryPhoto[]).filter((p) => !removingSet.has(p.id)),
        attractions: state.attractions.map((a) => {
          const linked = (a.linkedPhotoIds ?? []).filter((id) => !removingSet.has(id));
          const featured = (a.photoIds ?? []).filter((id) => !removingSet.has(id));
          if (linked.length === (a.linkedPhotoIds ?? []).length && featured.length === (a.photoIds ?? []).length) {
            return a;
          }
          return { ...a, linkedPhotoIds: linked, photoIds: featured };
        }),
      });
      syncFormFromStore(form.id);
      setSelectedRemoveIds([]);
      setQuickRemoveMode(false);

    } catch (err) {
      setQuickAddStatus(err instanceof Error ? err.message : tp('attractions', 'toastRemoveSyncFail'));
    } finally {
      setRemovingPhotoId('');
    }
  }

  function handleSave() {
    if (!form.name.trim()) {
      toast.warning(tp('attractions', 'toastNameRequired'));
      return;
    }
    if (!form.dest.trim()) {
      toast.warning(tp('attractions', 'toastDestRequired'));
      return;
    }
    if (!form.id.trim()) {
      toast.warning(tp('attractions', 'toastIdMissing'));
      return;
    }
    const duplicate = attractions.some((a) => a.id === form.id && a.id !== attraction?.id);
    if (duplicate) {
      toast.warning(tpl('attractions', 'toastDuplicateId', { id: form.id }));
      return;
    }
    const linked = form.linkedPhotoIds ?? [];
    const featured = form.photoIds.filter((id) => linked.includes(id)).slice(0, 4);
    onSave({ ...form, photoIds: featured });
  }

  async function handleDelete() {
    if (!attraction || !onDelete) return;
    const ok = await confirmDialog(
      tpl('attractions', 'deleteConfirm', { name: attraction.name }),
      { title: tp('attractions', 'deleteTitle') },
    );
    if (!ok) return;
    onDelete(attraction.id);
    onClose();
    toast.success(tp('attractions', 'toastDeleted'));
  }

  return (
    <>
      <div className="overlay open prod-form-overlay" onClick={() => void requestClose()}>
        <div className="modal att-edit-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-hd">
            <span className="modal-title">
              {mode === 'edit' ? tp('attractions', 'modalEditTitle') : tp('attractions', 'modalAddTitle')}
            </span>
            <button
              type="button"
              className="modal-x att-edit-close-btn"
              onClick={() => void requestClose()}
              aria-label={tp('attractions', 'closeModal')}
            >
              ✕
            </button>
          </div>
          <div className="modal-body att-edit-body">
            <div className="att-edit-grid">
              <div className="fg">
                <label className="lbl">{tp('attractions', 'lblId')}</label>
                <input value={form.id} readOnly className="att-id-readonly" />
              </div>
              <div className="fg">
                <label className="lbl">{tp('attractions', 'lblRegion')}</label>
                <select
                  value={form.region}
                  onChange={(e) => setRegion(e.target.value as Attraction['region'])}
                >
                  <option value="north">{tp('attractions', 'regionNorth')}</option>
                  <option value="central">{tp('attractions', 'regionCentral')}</option>
                  <option value="south">{tp('attractions', 'regionSouth')}</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">{tp('attractions', 'lblType')}</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="museum">{tp('attractions', 'typeMuseum')}</option>
                  <option value="heritage">{tp('attractions', 'typeHeritage')}</option>
                  <option value="temple">{tp('attractions', 'typeTemple')}</option>
                  <option value="landmark">{tp('attractions', 'typeLandmark')}</option>
                  <option value="nature">{tp('attractions', 'typeNature')}</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl">{tp('attractions', 'lblDestination')}</label>
                <input
                  value={form.dest}
                  placeholder={tp('attractions', 'placeholderDest')}
                  onChange={(e) => setForm({ ...form, dest: e.target.value })}
                />
              </div>
              <div className="fg att-edit-span2">
                <label className="lbl">{tp('attractions', 'lblName')}</label>
                <input
                  value={form.name}
                  placeholder={tp('attractions', 'placeholderName')}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="fg">
                <label className="lbl">{tp('attractions', 'lblPhone')}</label>
                <input
                  value={form.phone}
                  placeholder={tp('attractions', 'placeholderPhone')}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="fg">
                <label className="lbl">{tp('attractions', 'lblAdmission')}</label>
                <input value={form.admission} onChange={(e) => setForm({ ...form, admission: e.target.value })} />
              </div>
              <div className="fg att-edit-span2">
                <label className="lbl">{tp('attractions', 'lblHours')}</label>
                <input
                  value={form.hours}
                  placeholder={tp('attractions', 'placeholderHours')}
                  onChange={(e) => setForm({ ...form, hours: e.target.value })}
                />
              </div>
              <div className="fg att-edit-span2">
                <label className="lbl">{tp('attractions', 'lblClosed')}</label>
                <input
                  value={form.closed}
                  placeholder={tp('attractions', 'placeholderClosed')}
                  onChange={(e) => setForm({ ...form, closed: e.target.value })}
                />
              </div>
              <div className="fg">
                <label className="lbl">{tp('attractions', 'lblDuration')}</label>
                <input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })} />
              </div>
              <div className="fg">
                <label className="lbl">{tp('attractions', 'lblBestTime')}</label>
                <input value={form.best_time} onChange={(e) => setForm({ ...form, best_time: e.target.value })} />
              </div>
              <div className="fg att-edit-span2">
                <label className="lbl">{tp('attractions', 'lblCrowdTips')}</label>
                <input value={form.crowd} onChange={(e) => setForm({ ...form, crowd: e.target.value })} />
              </div>
              <div className="fg att-edit-span2">
                <label className="lbl">{tp('attractions', 'lblSeasonal')}</label>
                <input value={form.seasonal} onChange={(e) => setForm({ ...form, seasonal: e.target.value })} />
              </div>
              <div className="fg att-edit-span2">
                <label className="lbl">{tp('attractions', 'lblAlert')}</label>
                <input value={form.alert} onChange={(e) => setForm({ ...form, alert: e.target.value })} />
              </div>
              <div className="fg att-edit-span2">
                <label className="lbl att-edit-checkbox-label">
                  <input
                    type="checkbox"
                    className="att-edit-checkbox-input"
                    checked={form.book_req}
                    onChange={(e) => setForm({ ...form, book_req: e.target.checked })}
                  />
                  <span>{tp('attractions', 'lblBookingRequired')}</span>
                </label>
              </div>
              <div className="fg att-edit-span2">
                <label className="lbl">{tp('attractions', 'lblDescription')}</label>
                <textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div className={`att-edit-photos${quickRemoveMode ? ' remove-mode' : ''}`}>
              <div className="att-edit-photos-hd">
                <div className="att-expand-label">{tp('attractions', 'photosTitle')}</div>
                <div className="att-edit-photos-actions">
                  {pickablePhotos.length > 0 && (
                    <span className="att-edit-photos-count">
                      {tpl('attractions', 'photosLinkedFeatured', {
                        linked: form.linkedPhotoIds.length,
                        featured: form.photoIds.length,
                      })}
                    </span>
                  )}
                  {mode === 'edit' && (
                    <button
                      type="button"
                      className="btn btn-s btn-sm"
                      onClick={() => setQuickAddOpen(true)}
                      disabled={Boolean(removingPhotoId)}
                    >
                      {tp('attractions', 'quickAddPhoto')}
                    </button>
                  )}
                  {mode === 'edit' && pickablePhotos.length > 0 && (
                    <button
                      type="button"
                      className={`btn btn-sm ${quickRemoveMode ? 'btn-danger att-remove-toggle-on' : 'btn-s'}`}
                      disabled={Boolean(removingPhotoId)}
                      onClick={() => {
                        setQuickRemoveMode((v) => !v);
                        setSelectedRemoveIds([]);
                      }}
                    >
                      {quickRemoveMode ? tp('attractions', 'cancelRemove') : tp('attractions', 'quickRemove')}
                    </button>
                  )}
                  {quickRemoveMode && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={!selectedRemoveIds.length || Boolean(removingPhotoId)}
                      onClick={() => void handleQuickRemoveMany(selectedRemoveIds)}
                    >
                      {tpl('attractions', 'deleteSelected', { count: selectedRemoveIds.length })}
                    </button>
                  )}
                </div>
              </div>
              {!pickablePhotos.length ? (
                <div className="att-photo-empty att-photo-empty-rich">
                  <div className="att-photo-empty-icon">🖼</div>
                  <p>
                    {mode === 'add'
                      ? tp('attractions', 'photosEmptyAdd')
                      : tp('attractions', 'photosEmptyNoLinked')}
                  </p>
                  <div className="att-edit-empty-actions">
                    {mode === 'edit' && (
                      <button type="button" className="btn btn-p btn-sm" onClick={() => setQuickAddOpen(true)}>
                        {tp('attractions', 'quickAddPhoto')}
                      </button>
                    )}
                    {galleryHref && (
                      <a href={galleryHref} className="btn btn-s btn-sm">
                        {tp('attractions', 'openGallery')}
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <p className={`att-edit-photos-hint${quickRemoveMode ? ' remove-mode' : ''}`}>
                    {quickRemoveMode
                      ? tp('attractions', 'photosHintRemove')
                      : tp('attractions', 'photosHintFeatured')}
                  </p>
                  <div className="att-edit-photo-picks">
                    {pickablePhotos.map((p) => {
                      const featured = form.photoIds.includes(p.id);
                      const selectedForRemove = selectedRemoveIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          className={`att-edit-photo-pick-wrap${featured ? ' featured' : ''}${quickRemoveMode && selectedForRemove ? ' remove-selected' : ''}`}
                        >
                          <button
                            type="button"
                            className={`att-edit-photo-pick${featured ? ' selected' : ' pool-only'}${quickRemoveMode ? ' remove-mode' : ''}${quickRemoveMode && selectedForRemove ? ' remove-selected' : ''}`}
                            onClick={() => {
                              if (quickRemoveMode) {
                                setSelectedRemoveIds((prev) =>
                                  prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                                );
                                return;
                              }
                              toggleFeatured(p.id);
                            }}
                            title={p.caption || p.id}
                          >
                            <span
                              className="att-edit-photo-preview"
                              style={photoThumbUrl(p) ? { backgroundImage: `url(${toCrmPhotoAssetUrl(photoThumbUrl(p)!)})` } : undefined}
                            />
                            <span className="att-edit-photo-cap">{p.caption || p.id}</span>
                            <span className="att-edit-photo-status">
                              {quickRemoveMode
                                ? (selectedForRemove
                                    ? tp('attractions', 'photoSelectedDelete')
                                    : tp('attractions', 'photoClickSelect'))
                                : (featured
                                    ? tp('attractions', 'photoFeatured')
                                    : tp('attractions', 'photoNotShown'))}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="att-edit-gallery-links">
                    {galleryHref && (
                      <a href={galleryHref} className="att-edit-gallery-link">
                        {tp('attractions', 'manageGalleryLink')}
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="modal-ft att-edit-ft">
            {mode === 'edit' && onDelete && (
              <button type="button" className="btn btn-danger btn-sm att-edit-delete" onClick={handleDelete}>
                {tp('attractions', 'delete')}
              </button>
            )}
            <div className="att-edit-ft-actions">
              <button type="button" className="btn btn-s" onClick={() => void requestClose()}>
                {tp('attractions', 'cancel')}
              </button>
              <button
                type="button"
                className="btn btn-p"
                disabled={!form.id || !form.name.trim() || !form.dest.trim()}
                onClick={handleSave}
              >
                {mode === 'edit' ? tp('attractions', 'saveChanges') : tp('attractions', 'addAttraction')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <GalleryPhotoModal
        open={quickAddOpen}
        mode="add"
        defaultRegion={form.region}
        saving={quickAddSaving}
        saveStatus={quickAddStatus}
        onClose={() => {
          if (quickAddSaving) return;
          setQuickAddOpen(false);
          setQuickAddStatus('');
        }}
        onSave={handleQuickAddSave}
      />
    </>
  );
}

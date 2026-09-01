'use client';

import { useMemo, useState } from 'react';
import PhotoLibraryPicker from '@/components/gallery/PhotoLibraryPicker';
import StorageImage from '@/components/gallery/StorageImage';
import { useStore } from '@/hooks/useStore';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { photoThumbUrl } from '@/lib/gallery/gallery-helpers';
import type { PhotoFolder } from '@/lib/gallery/photo-folders';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import type { WeatherRegion } from '@/lib/weather/coordinates';
import type { WeatherDestinationMeta } from '@/lib/weather/types';
import type { ProvinceFormInput } from '@/components/weather/hooks/useProvinceList';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

type Props = {
  open: boolean;
  destination: WeatherDestinationMeta | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<ProvinceFormInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  featuredCount?: number;
};

type FormState = {
  name: string;
  region: WeatherRegion;
  description: string;
  notes: string;
  latitude: string;
  longitude: string;
  emoji: string;
  coverPhotoId: string;
  isFeatured: boolean;
};

function fromDest(d: WeatherDestinationMeta): FormState {
  return {
    name: d.name,
    region: d.region,
    description: d.description ?? '',
    notes: d.notes ?? '',
    latitude: String(d.latitude),
    longitude: String(d.longitude),
    emoji: d.emoji ?? '',
    coverPhotoId: d.coverPhotoId ?? '',
    isFeatured: d.isFeatured,
  };
}

export default function EditProvinceModal({
  open,
  destination,
  onClose,
  onSave,
  onDelete,
  featuredCount = 0,
}: Props) {
  const formKey = `${open}-${destination?.id ?? 'none'}-${destination?.coverPhotoId ?? ''}-${destination?.name ?? ''}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [form, setForm] = useState<FormState>(() =>
    destination ? fromDest(destination) : fromDest({
      id: '',
      name: '',
      region: 'north',
      emoji: null,
      latitude: 0,
      longitude: 0,
      elevationM: null,
      sortOrder: 0,
      description: null,
      notes: null,
      coverPhotoId: null,
      coverUrl: null,
      coverThumbUrl: null,
      isFeatured: false,
      active: true,
    })
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const folders = useStore((s) => s.photoFolders) as PhotoFolder[];

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    if (destination) setForm(fromDest(destination));
    setPickerOpen(false);
    setSaving(false);
  }

  const { tp, tpl, tc, language } = useLanguage();
  const baselineForm = useMemo(
    () => (destination ? fromDest(destination) : form),
    [formKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dirty = useFormDirty(open && !!destination, baselineForm, form, undefined, formKey);
  const { requestClose } = useConfirmClose({ open, dirty, onClose, disabled: saving, language });

  if (!open || !destination) return null;

  const dest = destination;

  const cover = form.coverPhotoId ? photos.find((p) => p.id === form.coverPhotoId) : undefined;
  const coverThumb = cover ? photoThumbUrl(cover) || cover.url : null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) {
      toast.warning(tp('weather', 'toastProvinceNameRequired'));
      return;
    }
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      toast.warning(tp('weather', 'toastLatitudeRange'));
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      toast.warning(tp('weather', 'toastLongitudeRange'));
      return;
    }
    if (form.isFeatured && !dest.isFeatured) {
      const others = featuredCount;
      if (others >= 2) {
        toast.warning(tp('weather', 'toastFeaturedFull'));
        return;
      }
    }

    setSaving(true);
    try {
      await onSave(dest.id, {
        name,
        region: form.region,
        emoji: form.emoji.trim() || null,
        latitude: lat,
        longitude: lng,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        coverPhotoId: form.coverPhotoId || undefined,
        isFeatured: form.isFeatured,
      });
      toast.success(tp('weather', 'toastProvinceUpdated'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tp('weather', 'toastSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirmDialog(tpl('weather', 'hideFromGuideConfirm', { name: dest.name }), {
      title: tp('weather', 'deleteProvinceTitle'),
      confirmLabel: tp('weather', 'deleteConfirmLabel'),
      danger: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await onDelete(dest.id);
      toast.success(tp('weather', 'toastProvinceDeleted'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tp('weather', 'toastDeleteFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="overlay open" onClick={() => void requestClose()} role="presentation">
        <div
          className="modal wg-province-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wg-edit-title"
        >
          <div className="modal-hd modal-hd-green">
            <h2 id="wg-edit-title">{tp('weather', 'editProvinceTitle')}</h2>
            <button type="button" className="gallery-modal-close" onClick={() => void requestClose()} aria-label={tc('close')}>
              ×
            </button>
          </div>

          <div className="wg-province-form">
            <section className="wg-form-section">
              <h3 className="wg-form-section-title">{tp('weather', 'sectionInformation')}</h3>
              <div className="fg">
                <label className="lbl" htmlFor="wg-edit-name">
                  {tp('weather', 'provinceNameRequired')}
                </label>
                <input
                  id="wg-edit-name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </div>
              <div className="fg">
                <label className="lbl" htmlFor="wg-edit-region">
                  {tp('weather', 'region')}
                </label>
                <select
                  id="wg-edit-region"
                  value={form.region}
                  onChange={(e) => set('region', e.target.value as WeatherRegion)}
                >
                  <option value="north">{tp('weather', 'regionNorth')}</option>
                  <option value="central">{tp('weather', 'regionCentral')}</option>
                  <option value="south">{tp('weather', 'regionSouth')}</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl" htmlFor="wg-edit-desc">
                  {tp('weather', 'shortDescription')}
                </label>
                <input
                  id="wg-edit-desc"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            </section>

            <section className="wg-form-section">
              <h3 className="wg-form-section-title">{tp('weather', 'sectionCoordinates')}</h3>
              <div className="wg-coord-row">
                <div className="fg">
                  <label className="lbl" htmlFor="wg-edit-lat">
                    {tp('weather', 'latitudeRequired')}
                  </label>
                  <input
                    id="wg-edit-lat"
                    inputMode="decimal"
                    value={form.latitude}
                    onChange={(e) => set('latitude', e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label className="lbl" htmlFor="wg-edit-lng">
                    {tp('weather', 'longitudeRequired')}
                  </label>
                  <input
                    id="wg-edit-lng"
                    inputMode="decimal"
                    value={form.longitude}
                    onChange={(e) => set('longitude', e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="wg-form-section">
              <h3 className="wg-form-section-title">{tp('weather', 'sectionCoverImage')}</h3>
              <div className="wg-cover-pick">
                {coverThumb ? (
                  <div className="wg-cover-preview">
                    <StorageImage src={coverThumb} alt="" fill sizes="120px" className="phlib-img" />
                  </div>
                ) : (
                  <div className="wg-cover-empty">{tp('weather', 'noCoverYet')}</div>
                )}
                <button type="button" className="btn btn-s btn-sm" onClick={() => setPickerOpen(true)}>
                  {tp('weather', 'changeCoverFromLibrary')}
                </button>
              </div>
            </section>

            <section className="wg-form-section">
              <h3 className="wg-form-section-title">{tp('weather', 'sectionNotes')}</h3>
              <div className="fg">
                <textarea
                  id="wg-edit-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </div>
              <label className="wg-check">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  disabled={!form.isFeatured && featuredCount >= 2}
                  onChange={(e) => set('isFeatured', e.target.checked)}
                />
                <span>
                  {tp('weather', 'displayFeatured')}
                  <span className="wg-check-hint">
                    {!form.isFeatured && featuredCount >= 2
                      ? tp('weather', 'featuredSlotsFull')
                      : tp('weather', 'featuredMaxTwo')}
                  </span>
                </span>
              </label>
            </section>
          </div>

          <div className="wg-detail-ft wg-detail-ft--split">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => void handleDelete()}
              disabled={saving}
            >
              {tp('weather', 'deleteConfirmLabel')}
            </button>
            <div className="wg-detail-ft-right">
              <button type="button" className="btn btn-s" onClick={() => void requestClose()} disabled={saving}>
                {tc('cancel')}
              </button>
              <button type="button" className="btn btn-p" onClick={() => void handleSave()} disabled={saving}>
                {saving ? tp('weather', 'saving') : tc('save')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <PhotoLibraryPicker
        variant="modal"
        mode="single"
        open={pickerOpen}
        title={tp('weather', 'selectCoverImage')}
        photos={photos}
        folders={folders}
        linkedPhotoIds={form.coverPhotoId ? [form.coverPhotoId] : []}
        featuredPhotoIds={[]}
        onClose={() => setPickerOpen(false)}
        onPick={(photo) => {
          set('coverPhotoId', photo.id);
          setPickerOpen(false);
        }}
      />
    </>
  );
}

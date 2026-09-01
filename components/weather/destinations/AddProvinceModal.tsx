'use client';

import { useState } from 'react';
import PhotoLibraryPicker from '@/components/gallery/PhotoLibraryPicker';
import StorageImage from '@/components/gallery/StorageImage';
import { useStore } from '@/hooks/useStore';
import type { GalleryPhoto } from '@/lib/tour-design/tour-design-types';
import { photoThumbUrl } from '@/lib/gallery/gallery-helpers';
import type { PhotoFolder } from '@/lib/gallery/photo-folders';
import { toast } from '@/lib/toast';
import type { WeatherRegion } from '@/lib/weather/coordinates';
import type { ProvinceFormInput } from '@/components/weather/hooks/useProvinceList';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (input: ProvinceFormInput) => Promise<void>;
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

const EMPTY: FormState = {
  name: '',
  region: 'north',
  description: '',
  notes: '',
  latitude: '',
  longitude: '',
  emoji: '',
  coverPhotoId: '',
  isFeatured: false,
};

export default function AddProvinceModal({ open, onClose, onSave, featuredCount = 0 }: Props) {
  const formKey = `add-${open}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const photos = useStore((s) => s.photos) as GalleryPhoto[];
  const folders = useStore((s) => s.photoFolders) as PhotoFolder[];

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    setForm(EMPTY);
    setPickerOpen(false);
    setSaving(false);
  }

  const { tp, tpl, tc, language } = useLanguage();
  const dirty = useFormDirty(open, EMPTY, form, undefined, formKey);
  const { requestClose } = useConfirmClose({ open, dirty, onClose, disabled: saving, language });

  if (!open) return null;

  const cover = photos.find((p) => p.id === form.coverPhotoId);
  const coverThumb = cover ? photoThumbUrl(cover) || cover.url : null;
  const featuredFull = featuredCount >= 2;

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
    if (form.isFeatured && featuredFull) {
      toast.warning(tp('weather', 'toastFeaturedFull'));
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name,
        region: form.region,
        emoji: form.emoji.trim() || null,
        latitude: lat,
        longitude: lng,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        coverPhotoId: form.coverPhotoId || null,
        isFeatured: form.isFeatured,
      });
      toast.success(tp('weather', 'toastProvinceAdded'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tp('weather', 'toastSaveFailed'));
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
          aria-labelledby="wg-add-title"
        >
          <div className="modal-hd modal-hd-green">
            <h2 id="wg-add-title">{tp('weather', 'addProvinceTitle')}</h2>
            <button type="button" className="gallery-modal-close" onClick={() => void requestClose()} aria-label={tc('close')}>
              ×
            </button>
          </div>

          <div className="wg-province-form">
            <section className="wg-form-section">
              <h3 className="wg-form-section-title">{tp('weather', 'sectionInformation')}</h3>
              <div className="fg">
                <label className="lbl" htmlFor="wg-add-name">
                  {tp('weather', 'provinceNameRequired')}
                </label>
                <input
                  id="wg-add-name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder={tp('weather', 'provinceNamePlaceholder')}
                />
              </div>
              <div className="fg">
                <label className="lbl" htmlFor="wg-add-region">
                  {tp('weather', 'region')}
                </label>
                <select
                  id="wg-add-region"
                  value={form.region}
                  onChange={(e) => set('region', e.target.value as WeatherRegion)}
                >
                  <option value="north">{tp('weather', 'regionNorth')}</option>
                  <option value="central">{tp('weather', 'regionCentral')}</option>
                  <option value="south">{tp('weather', 'regionSouth')}</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl" htmlFor="wg-add-desc">
                  {tp('weather', 'shortDescription')}
                </label>
                <input
                  id="wg-add-desc"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            </section>

            <section className="wg-form-section">
              <h3 className="wg-form-section-title">{tp('weather', 'sectionCoordinates')}</h3>
              <div className="wg-coord-row">
                <div className="fg">
                  <label className="lbl" htmlFor="wg-add-lat">
                    {tp('weather', 'latitudeRequired')}
                  </label>
                  <input
                    id="wg-add-lat"
                    inputMode="decimal"
                    value={form.latitude}
                    onChange={(e) => set('latitude', e.target.value)}
                    placeholder="21.0285"
                  />
                </div>
                <div className="fg">
                  <label className="lbl" htmlFor="wg-add-lng">
                    {tp('weather', 'longitudeRequired')}
                  </label>
                  <input
                    id="wg-add-lng"
                    inputMode="decimal"
                    value={form.longitude}
                    onChange={(e) => set('longitude', e.target.value)}
                    placeholder="105.8542"
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
                  {tp('weather', 'selectFromLibrary')}
                </button>
              </div>
            </section>

            <section className="wg-form-section">
              <h3 className="wg-form-section-title">{tp('weather', 'sectionNotes')}</h3>
              <div className="fg">
                <textarea
                  id="wg-add-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder={tp('weather', 'internalNotesPlaceholder')}
                />
              </div>
              <label className="wg-check">
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  disabled={featuredFull && !form.isFeatured}
                  onChange={(e) => set('isFeatured', e.target.checked)}
                />
                <span>
                  {tp('weather', 'displayFeatured')}
                  <span className="wg-check-hint">
                    {featuredFull
                      ? tp('weather', 'featuredSlotsFull')
                      : tpl('weather', 'featuredSlotsAvailable', { slotsRemaining: 2 - featuredCount })}
                  </span>
                </span>
              </label>
            </section>
          </div>

          <div className="wg-detail-ft">
            <button type="button" className="btn btn-s" onClick={() => void requestClose()} disabled={saving}>
              {tc('cancel')}
            </button>
            <button type="button" className="btn btn-p" onClick={() => void handleSave()} disabled={saving}>
              {saving ? tp('weather', 'saving') : tc('save')}
            </button>
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

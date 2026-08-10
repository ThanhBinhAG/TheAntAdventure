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
      toast.warning('Tên tỉnh thành là bắt buộc.');
      return;
    }
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      toast.warning('Latitude phải trong khoảng -90 đến 90.');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      toast.warning('Longitude phải trong khoảng -180 đến 180.');
      return;
    }
    if (form.isFeatured && featuredFull) {
      toast.warning('Đã có 2 điểm nổi bật. Dùng “Chỉnh 2 điểm nổi bật” để đổi slot.');
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
      toast.success('Đã thêm tỉnh thành.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể lưu.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="overlay open" onClick={onClose} role="presentation">
        <div
          className="modal wg-province-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="wg-add-title"
        >
          <div className="modal-hd modal-hd-green">
            <h2 id="wg-add-title">Thêm tỉnh thành mới</h2>
            <button type="button" className="gallery-modal-close" onClick={onClose} aria-label="Đóng">
              ×
            </button>
          </div>

          <div className="wg-province-form">
            <section className="wg-form-section">
              <h3 className="wg-form-section-title">Thông tin</h3>
              <div className="fg">
                <label className="lbl" htmlFor="wg-add-name">
                  Tên tỉnh thành *
                </label>
                <input
                  id="wg-add-name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Ví dụ: Đà Lạt"
                />
              </div>
              <div className="fg">
                <label className="lbl" htmlFor="wg-add-region">
                  Vùng
                </label>
                <select
                  id="wg-add-region"
                  value={form.region}
                  onChange={(e) => set('region', e.target.value as WeatherRegion)}
                >
                  <option value="north">Miền Bắc</option>
                  <option value="central">Miền Trung</option>
                  <option value="south">Miền Nam</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl" htmlFor="wg-add-desc">
                  Mô tả ngắn
                </label>
                <input
                  id="wg-add-desc"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            </section>

            <section className="wg-form-section">
              <h3 className="wg-form-section-title">Tọa độ (Open-Meteo)</h3>
              <div className="wg-coord-row">
                <div className="fg">
                  <label className="lbl" htmlFor="wg-add-lat">
                    Latitude *
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
                    Longitude *
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
              <h3 className="wg-form-section-title">Ảnh đại diện</h3>
              <div className="wg-cover-pick">
                {coverThumb ? (
                  <div className="wg-cover-preview">
                    <StorageImage src={coverThumb} alt="" fill sizes="120px" className="phlib-img" />
                  </div>
                ) : (
                  <div className="wg-cover-empty">Chưa có ảnh — thêm sau được</div>
                )}
                <button type="button" className="btn btn-s btn-sm" onClick={() => setPickerOpen(true)}>
                  Chọn từ thư viện
                </button>
              </div>
            </section>

            <section className="wg-form-section">
              <h3 className="wg-form-section-title">Ghi chú</h3>
              <div className="fg">
                <textarea
                  id="wg-add-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Ghi chú nội bộ…"
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
                  Hiển thị nổi bật (featured)
                  <span className="wg-check-hint">
                    {featuredFull
                      ? 'Đã đủ 2 slot — dùng “Chỉnh 2 điểm nổi bật” trên trang.'
                      : `Còn ${2 - featuredCount} slot trống.`}
                  </span>
                </span>
              </label>
            </section>
          </div>

          <div className="wg-detail-ft">
            <button type="button" className="btn btn-s" onClick={onClose} disabled={saving}>
              Hủy
            </button>
            <button type="button" className="btn btn-p" onClick={() => void handleSave()} disabled={saving}>
              {saving ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>

      <PhotoLibraryPicker
        variant="modal"
        mode="single"
        open={pickerOpen}
        title="Chọn ảnh đại diện"
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

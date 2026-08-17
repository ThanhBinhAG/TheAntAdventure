'use client';

import { useState } from 'react';
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

  if (!open || !destination) return null;

  const dest = destination;

  const cover =
    photos.find((p) => p.id === form.coverPhotoId) ||
    (dest.coverUrl
      ? ({ id: form.coverPhotoId, url: dest.coverUrl, thumbUrl: dest.coverThumbUrl } as GalleryPhoto)
      : undefined);
  const coverThumb = cover
    ? photoThumbUrl(cover) || cover.url || dest.coverThumbUrl || dest.coverUrl
    : dest.coverThumbUrl || dest.coverUrl;

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
    if (form.isFeatured && !dest.isFeatured) {
      const others = featuredCount;
      if (others >= 2) {
        toast.warning('Đã có 2 điểm nổi bật. Dùng “Chỉnh 2 điểm nổi bật” để đổi slot.');
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
      toast.success('Đã cập nhật tỉnh thành.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể lưu.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const ok = await confirmDialog(
      `Ẩn "${dest.name}" khỏi Weather Guide? Dữ liệu cache sẽ được giữ.`,
      {
        title: 'Xóa tỉnh thành?',
        confirmLabel: 'Xóa',
        danger: true,
      }
    );
    if (!ok) return;
    setSaving(true);
    try {
      await onDelete(dest.id);
      toast.success('Đã xóa tỉnh thành.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa.');
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
          aria-labelledby="wg-edit-title"
        >
          <div className="modal-hd modal-hd-green">
            <h2 id="wg-edit-title">Sửa tỉnh thành</h2>
            <button type="button" className="gallery-modal-close" onClick={onClose} aria-label="Đóng">
              ×
            </button>
          </div>

          <div className="wg-province-form">
            <section className="wg-form-section">
              <h3 className="wg-form-section-title">Thông tin</h3>
              <div className="fg">
                <label className="lbl" htmlFor="wg-edit-name">
                  Tên tỉnh thành *
                </label>
                <input
                  id="wg-edit-name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
              </div>
              <div className="fg">
                <label className="lbl" htmlFor="wg-edit-region">
                  Vùng
                </label>
                <select
                  id="wg-edit-region"
                  value={form.region}
                  onChange={(e) => set('region', e.target.value as WeatherRegion)}
                >
                  <option value="north">Miền Bắc</option>
                  <option value="central">Miền Trung</option>
                  <option value="south">Miền Nam</option>
                </select>
              </div>
              <div className="fg">
                <label className="lbl" htmlFor="wg-edit-desc">
                  Mô tả ngắn
                </label>
                <input
                  id="wg-edit-desc"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                />
              </div>
            </section>

            <section className="wg-form-section">
              <h3 className="wg-form-section-title">Tọa độ (Open-Meteo)</h3>
              <div className="wg-coord-row">
                <div className="fg">
                  <label className="lbl" htmlFor="wg-edit-lat">
                    Latitude *
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
                    Longitude *
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
                  Đổi ảnh từ thư viện
                </button>
              </div>
            </section>

            <section className="wg-form-section">
              <h3 className="wg-form-section-title">Ghi chú</h3>
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
                  Hiển thị nổi bật (featured)
                  <span className="wg-check-hint">
                    {!form.isFeatured && featuredCount >= 2
                      ? 'Đã đủ 2 slot — dùng “Chỉnh 2 điểm nổi bật” trên trang.'
                      : 'Tối đa 2 điểm trên trang chính.'}
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
              Xóa
            </button>
            <div className="wg-detail-ft-right">
              <button type="button" className="btn btn-s" onClick={onClose} disabled={saving}>
                Hủy
              </button>
              <button type="button" className="btn btn-p" onClick={() => void handleSave()} disabled={saving}>
                {saving ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
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

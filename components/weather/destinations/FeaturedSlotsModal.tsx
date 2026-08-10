'use client';

import { useState } from 'react';
import type { WeatherDestinationMeta } from '@/lib/weather/types';
import { toast } from '@/lib/toast';

type Props = {
  open: boolean;
  destinations: WeatherDestinationMeta[];
  featuredIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => Promise<void>;
};

const REGION_LABEL: Record<string, string> = {
  north: 'Miền Bắc',
  central: 'Miền Trung',
  south: 'Miền Nam',
};

export default function FeaturedSlotsModal({
  open,
  destinations,
  featuredIds,
  onClose,
  onSave,
}: Props) {
  const formKey = `${open}-${featuredIds.join(',')}`;
  const [previousFormKey, setPreviousFormKey] = useState(formKey);
  const [slot1, setSlot1] = useState(featuredIds[0] ?? '');
  const [slot2, setSlot2] = useState(featuredIds[1] ?? '');
  const [saving, setSaving] = useState(false);

  if (formKey !== previousFormKey) {
    setPreviousFormKey(formKey);
    setSlot1(featuredIds[0] ?? '');
    setSlot2(featuredIds[1] ?? '');
    setSaving(false);
  }

  if (!open) return null;

  async function handleSave() {
    if (!slot1) {
      toast.warning('Chọn điểm nổi bật thứ nhất.');
      return;
    }
    if (slot2 && slot2 === slot1) {
      toast.warning('Hai slot không được trùng nhau.');
      return;
    }
    const ids = slot2 ? [slot1, slot2] : [slot1];
    setSaving(true);
    try {
      await onSave(ids);
      toast.success('Đã cập nhật điểm nổi bật.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Không thể lưu.');
    } finally {
      setSaving(false);
    }
  }

  const options = destinations.slice().sort((a, b) => a.name.localeCompare(b.name));

  function optionLabel(d: WeatherDestinationMeta) {
    const region = REGION_LABEL[d.region] ?? d.region;
    return `${d.name} · ${region}`;
  }

  return (
    <div className="overlay open" onClick={onClose} role="presentation">
      <div
        className="modal wg-province-modal wg-featured-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wg-featured-title"
      >
        <div className="modal-hd modal-hd-green">
          <div>
            <h2 id="wg-featured-title">Chỉnh 2 điểm nổi bật</h2>
            <p className="wg-featured-modal-sub">Hai điểm lớn trên đầu trang Weather Guide</p>
          </div>
          <button type="button" className="gallery-modal-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>

        <p className="wg-featured-hint">
          Slot 1 bắt buộc. Slot 2 có thể để trống nếu chỉ muốn một điểm nổi bật.
        </p>

        <div className="wg-featured-slots">
          <div className="wg-featured-slot">
            <label className="wg-featured-slot-lbl" htmlFor="wg-feat-1">
              <span className="wg-featured-slot-num" aria-hidden>
                1
              </span>
              <span>
                Điểm chính
                <span className="wg-featured-slot-hint"> · bắt buộc</span>
              </span>
            </label>
            <select id="wg-feat-1" value={slot1} onChange={(e) => setSlot1(e.target.value)}>
              <option value="">— Chọn điểm đến —</option>
              {options.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === slot2}>
                  {optionLabel(d)}
                </option>
              ))}
            </select>
          </div>
          <div className="wg-featured-slot">
            <label className="wg-featured-slot-lbl" htmlFor="wg-feat-2">
              <span className="wg-featured-slot-num wg-featured-slot-num--opt" aria-hidden>
                2
              </span>
              <span>
                Điểm phụ
                <span className="wg-featured-slot-hint"> · tùy chọn</span>
              </span>
            </label>
            <select id="wg-feat-2" value={slot2} onChange={(e) => setSlot2(e.target.value)}>
              <option value="">— Không chọn —</option>
              {options.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === slot1}>
                  {optionLabel(d)}
                </option>
              ))}
            </select>
          </div>
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
  );
}

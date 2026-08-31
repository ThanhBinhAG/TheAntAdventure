'use client';

import { useMemo, useState } from 'react';
import type { WeatherDestinationMeta } from '@/lib/weather/types';
import { toast } from '@/lib/toast';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';

type Props = {
  open: boolean;
  destinations: WeatherDestinationMeta[];
  featuredIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => Promise<void>;
};

const REGION_LABEL: Record<string, string> = {
  north: 'North',
  central: 'Central',
  south: 'South',
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

  const { language } = useLanguage();
  const baseline = useMemo(
    () => ({ slot1: featuredIds[0] ?? '', slot2: featuredIds[1] ?? '' }),
    [formKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dirty = useFormDirty(open, baseline, { slot1, slot2 }, undefined, formKey);
  const { requestClose } = useConfirmClose({ open, dirty, onClose, disabled: saving, language });

  if (!open) return null;

  async function handleSave() {
    if (!slot1) {
      toast.warning('Select the first featured destination.');
      return;
    }
    if (slot2 && slot2 === slot1) {
      toast.warning('Two slots cannot be the same.');
      return;
    }
    const ids = slot2 ? [slot1, slot2] : [slot1];
    setSaving(true);
    try {
      await onSave(ids);
      toast.success('Featured destinations updated.');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cannot save.');
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
    <div className="overlay open" onClick={() => void requestClose()} role="presentation">
      <div
        className="modal wg-province-modal wg-featured-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wg-featured-title"
      >
        <div className="modal-hd modal-hd-green">
          <div>
            <h2 id="wg-featured-title">Adjust featured destinations</h2>
            <p className="wg-featured-modal-sub">Two major destinations at the top of the Weather Guide page</p>
          </div>
          <button type="button" className="gallery-modal-close" onClick={() => void requestClose()} aria-label="Close">
            ×
          </button>
        </div>

        <p className="wg-featured-hint">
          Slot 1 is required. Slot 2 can be empty if you only want one featured destination.
        </p>

        <div className="wg-featured-slots">
          <div className="wg-featured-slot">
            <label className="wg-featured-slot-lbl" htmlFor="wg-feat-1">
              <span className="wg-featured-slot-num" aria-hidden>
                1
              </span>
              <span>
                Main destination
                <span className="wg-featured-slot-hint"> · required</span>
              </span>
            </label>
            <select id="wg-feat-1" value={slot1} onChange={(e) => setSlot1(e.target.value)}>
              <option value="">— Select destination —</option>
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
                Secondary destination
                <span className="wg-featured-slot-hint"> · optional</span>
              </span>
            </label>
            <select id="wg-feat-2" value={slot2} onChange={(e) => setSlot2(e.target.value)}>
              <option value="">— Select destination —</option>
              {options.map((d) => (
                <option key={d.id} value={d.id} disabled={d.id === slot1}>
                  {optionLabel(d)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="wg-detail-ft">
          <button type="button" className="btn btn-s" onClick={() => void requestClose()} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-p" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

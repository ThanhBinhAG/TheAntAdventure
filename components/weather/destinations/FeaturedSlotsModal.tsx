'use client';

import { useMemo, useState } from 'react';
import type { WeatherDestinationMeta } from '@/lib/weather/types';
import { toast } from '@/lib/toast';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';
import { regionLabel } from '@/components/weather/weatherLabels';

type Props = {
  open: boolean;
  destinations: WeatherDestinationMeta[];
  featuredIds: string[];
  onClose: () => void;
  onSave: (ids: string[]) => Promise<void>;
};

export default function FeaturedSlotsModal({
  open,
  destinations,
  featuredIds,
  onClose,
  onSave,
}: Props) {
  const { tp, tpl, tc, language } = useLanguage();
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

  const baseline = useMemo(
    () => ({ slot1: featuredIds[0] ?? '', slot2: featuredIds[1] ?? '' }),
    [formKey], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const dirty = useFormDirty(open, baseline, { slot1, slot2 }, undefined, formKey);
  const { requestClose } = useConfirmClose({ open, dirty, onClose, disabled: saving, language });

  if (!open) return null;

  async function handleSave() {
    if (!slot1) {
      toast.warning(tp('weather', 'toastSelectFirstFeatured'));
      return;
    }
    if (slot2 && slot2 === slot1) {
      toast.warning(tp('weather', 'toastSameSlot'));
      return;
    }
    const ids = slot2 ? [slot1, slot2] : [slot1];
    setSaving(true);
    try {
      await onSave(ids);
      toast.success(tp('weather', 'toastFeaturedUpdated'));
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tp('weather', 'toastCannotSave'));
    } finally {
      setSaving(false);
    }
  }

  const options = destinations.slice().sort((a, b) => a.name.localeCompare(b.name));

  function optionLabel(d: WeatherDestinationMeta) {
    return tpl('weather', 'destinationOptionLabel', {
      name: d.name,
      region: regionLabel(d.region, language),
    });
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
            <h2 id="wg-featured-title">{tp('weather', 'adjustFeaturedTitle')}</h2>
            <p className="wg-featured-modal-sub">{tp('weather', 'adjustFeaturedSub')}</p>
          </div>
          <button type="button" className="gallery-modal-close" onClick={() => void requestClose()} aria-label={tc('close')}>
            ×
          </button>
        </div>

        <p className="wg-featured-hint">{tp('weather', 'slotHint')}</p>

        <div className="wg-featured-slots">
          <div className="wg-featured-slot">
            <label className="wg-featured-slot-lbl" htmlFor="wg-feat-1">
              <span className="wg-featured-slot-num" aria-hidden>
                1
              </span>
              <span>
                {tp('weather', 'mainDestination')}
                <span className="wg-featured-slot-hint"> · {tp('weather', 'required')}</span>
              </span>
            </label>
            <select id="wg-feat-1" value={slot1} onChange={(e) => setSlot1(e.target.value)}>
              <option value="">{tp('weather', 'selectDestination')}</option>
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
                {tp('weather', 'secondaryDestination')}
                <span className="wg-featured-slot-hint"> · {tp('weather', 'optional')}</span>
              </span>
            </label>
            <select id="wg-feat-2" value={slot2} onChange={(e) => setSlot2(e.target.value)}>
              <option value="">{tp('weather', 'selectDestination')}</option>
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
            {tc('cancel')}
          </button>
          <button type="button" className="btn btn-p" onClick={() => void handleSave()} disabled={saving}>
            {saving ? tp('weather', 'saving') : tc('save')}
          </button>
        </div>
      </div>
    </div>
  );
}

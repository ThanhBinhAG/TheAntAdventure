'use client';

import { useState } from 'react';
import { MONTHS, WR, type WeatherRatingCode } from '@/lib/seeds/weather';
import { WEATHER_DESTINATIONS } from '@/lib/weather/coordinates';
import { wrStyle } from '@/components/weather/weatherUiHelpers';

type Props = {
  destId: string;
  monthIdx: number;
  initialCode: string;
  onCancel: () => void;
  onSave: (code: string) => void;
};

export default function WeatherRatingEditModal({
  destId,
  monthIdx,
  initialCode,
  onCancel,
  onSave,
}: Props) {
  const [pendingCode, setPendingCode] = useState(initialCode);
  const d = WEATHER_DESTINATIONS.find((x) => x.id === destId);

  return (
    <div className="modal-overlay open" onClick={onCancel}>
      <div className="modal wg-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wg-edit-title">
          {d?.name} — {MONTHS[monthIdx]}
        </div>
        <div className="wg-muted" style={{ marginBottom: 16 }}>
          Select travel rating for this month
        </div>
        <div className="wg-edit-codes">
          {(Object.keys(WR) as WeatherRatingCode[]).map((code) => {
            const wr = wrStyle(code);
            return (
              <button
                key={code}
                type="button"
                className={`wg-edit-code${pendingCode === code ? ' on' : ''}`}
                style={{ background: wr.bg, color: wr.fg }}
                onClick={() => setPendingCode(code)}
              >
                <div className="wg-cell-code">{code}</div>
                <div className="wg-cell-label">{wr.label}</div>
              </button>
            );
          })}
        </div>
        <div className="wg-edit-actions">
          <button className="btn btn-s" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-p" type="button" onClick={() => onSave(pendingCode)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import type { TourBrief } from '@/lib/tour-design-types';
import { getGuestPanelData, hasGuestBriefData } from '@/lib/tour-brief-summary';

interface Props {
  brief: TourBrief;
  clientType: 'b2c' | 'b2b';
  custName?: string;
  onEditBrief?: () => void;
}

export default function GuestProfileCard({ brief, clientType, custName, onEditBrief }: Props) {
  const { displayName, summaryLine, rows } = getGuestPanelData(brief, clientType, custName);
  const hasData = hasGuestBriefData(brief, clientType, custName);

  return (
    <div className="guest-info-panel">
      <div className="guest-info-panel-hd">
        <div className="guest-info-panel-title">👤 Guest Profile</div>
        {onEditBrief && (
          <button type="button" className="guest-info-edit" onClick={onEditBrief}>
            ✏ Edit Brief
          </button>
        )}
      </div>
      {!hasData ? (
        <div style={{ fontSize: 11.5, color: 'var(--m)' }}>Fill in Client Brief (Step 1) to see guest details here.</div>
      ) : (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--t)', marginBottom: 6 }}>{displayName}</div>
          {summaryLine && <div className="guest-info-summary">{summaryLine}</div>}
          <div className="guest-info-grid">
            {rows.map((r) => (
              <div key={r.label} className="guest-info-row">
                <span className="guest-info-lbl">{r.label}:</span>
                <span className="guest-info-val" title={r.value}>
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

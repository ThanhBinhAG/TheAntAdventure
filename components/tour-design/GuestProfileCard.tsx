'use client';

import { useState } from 'react';
import type { TourBrief } from '@/lib/tour-design/tour-design-types';
import { getGuestPanelData, hasGuestBriefData } from '@/lib/tour-design/tour-brief-summary';

const STORAGE_KEY = 'td-guest-profile-open';

interface Props {
  brief: TourBrief;
  clientType: 'b2c' | 'b2b';
  custName?: string;
  onEditBrief?: () => void;
}

export default function GuestProfileCard({ brief, clientType, custName, onEditBrief }: Props) {
  const { displayName, summaryLine, rows } = getGuestPanelData(brief, clientType, custName);
  const hasData = hasGuestBriefData(brief, clientType, custName);
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === '1';
    } catch {
      return false;
    }
  });

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className={`guest-info-panel${open ? ' is-open' : ' is-collapsed'}`}>
      <div className="guest-info-panel-hd">
        <div className="guest-info-panel-title">👤 Guest Profile</div>
        <div className="guest-info-hd-actions">
          {hasData && (
            <button type="button" className="guest-info-toggle" onClick={toggle} aria-expanded={open}>
              {open ? 'Hide details' : 'Details'}
              <span className="guest-info-chevron" aria-hidden>
                {open ? '▴' : '▾'}
              </span>
            </button>
          )}
          {onEditBrief && (
            <button type="button" className="guest-info-edit" onClick={onEditBrief}>
              ✏ Edit Brief
            </button>
          )}
        </div>
      </div>
      {!hasData ? (
        <div style={{ fontSize: 11.5, color: 'var(--m)' }}>Fill in Client Brief (Step 1) to see guest details here.</div>
      ) : (
        <>
          <div className="guest-info-compact">
            <div className="guest-info-name">{displayName}</div>
            {summaryLine && <div className="guest-info-summary">{summaryLine}</div>}
          </div>
          <div className={`guest-info-details${open ? ' open' : ''}`}>
            <div className="guest-info-details-inner">
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}

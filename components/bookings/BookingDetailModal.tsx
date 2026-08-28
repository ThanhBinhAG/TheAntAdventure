'use client';

import { useState } from 'react';
import { fmt } from '@/lib/constants';
import { parseMoneyInput } from '@/lib/core/money';
import { formatBookingTravelLabel } from '@/lib/bookings/booking-dates';
import type { Booking } from '@/lib/types';
import { toast } from '@/lib/toast';

export const STATUS_HEADER: Record<string, string> = {
  'Deposit Paid': '#D97706',
  'Fully Paid': '#2E7D52',
  Confirmed: '#1565C0',
  'On Tour': '#6B21A8',
  Completed: '#6B7F74',
  Cancelled: '#C0392B',
};

export type OtTab = 'add' | 'cancel' | 'full' | 'modify';

export interface BookingChange {
  id: string;
  type: string;
  date: string;
  time?: string;
  by?: string;
  description: string;
  detail?: string;
  costImpact?: number;
  cancelFee?: number;
  refund?: number;
}

export function BookingDetailModal({
  booking: b,
  customerName,
  otTab,
  setOtTab,
  onClose,
  onSaveChange,
  onMarkNotified,
}: {
  booking: Booking;
  customerName: string;
  otTab: OtTab;
  setOtTab: (t: OtTab) => void;
  onClose: () => void;
  onSaveChange: (type: OtTab, payload: Record<string, unknown>) => void;
  onMarkNotified: () => void;
}) {
  const bal = b.total - b.deposit;
  const changes = (b.changes as BookingChange[]) || [];
  const sc = STATUS_HEADER[b.status] || '#6B7F74';

  const otTabs: { id: OtTab; label: string }[] = [
    { id: 'add', label: '＋ Add Activity' },
    { id: 'cancel', label: '✕ Cancel Activity' },
    { id: 'full', label: '✗ Cancel Booking' },
    { id: 'modify', label: '⇄ Change Pax / Dates / Hotel' },
  ];

  return (
    <div className="overlay open" onClick={onClose}>
      <div className="bkd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bkd-header">
          <div style={{ flex: 1 }}>
            <div className="bkd-header-lbl">Booking Detail</div>
            <div className="bkd-title">{b.tour}</div>
            <div className="bkd-sub">
              {b.id} · {customerName} · {b.pax} pax · {formatBookingTravelLabel(b.start, b.end)}
            </div>
          </div>
          <span className="bkd-status-pill" style={{ background: sc }}>
            {b.status}
          </span>
          <button className="bkd-close" type="button" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        {b.guideAlertPending && (
          <div className="bkd-guide-banner">
            <span>
              ⚠ <b>Guide not yet notified</b> of recent changes — please contact {b.guide || 'the assigned guide'} directly.
            </span>
            <button className="btn btn-sm" type="button" onClick={onMarkNotified} style={{ background: '#D97706', color: '#fff', border: 'none' }}>
              ✓ Mark Notified
            </button>
          </div>
        )}

        <div className="bkd-finance">
          {[
            ['Total Value', `$${fmt(b.total)}`, 'var(--td)'],
            ['Deposit Paid', `$${fmt(b.deposit)}`, 'var(--blue)'],
            ['Balance Due', `$${fmt(bal)}`, bal > 0 ? 'var(--amb)' : 'var(--g)'],
            ['Guide', b.guide || '—', 'var(--td)'],
            ['Hotel', b.hotel || '—', 'var(--td)'],
            ['Changes', String(changes.length), 'var(--g)'],
          ].map(([label, value, color]) => (
            <div key={String(label)} className="bkd-fin-cell">
              <div className="bkd-fin-l">{label}</div>
              <div className="bkd-fin-v" style={{ color: color as string }}>
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className="bkd-body">
          <div className="bkd-section-title">✏ On-Tour Changes</div>
          <div className="otab-btns">
            {otTabs.map((t) => (
              <button key={t.id} type="button" className={`otab-btn${otTab === t.id ? ' on' : ''}`} onClick={() => setOtTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          <OnTourForm tab={otTab} onSave={onSaveChange} />

          <div className="bkd-section-title" style={{ marginTop: 22 }}>
            📋 Change Log
          </div>
          {changes.length === 0 ? (
            <div className="bkd-empty-log">No changes recorded yet for this booking.</div>
          ) : (
            <div className="bkd-log-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date / Time</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Detail</th>
                  <th style={{ textAlign: 'right' }}>Cost Impact</th>
                  <th style={{ textAlign: 'right' }}>Cancel Fee</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {changes.map((ch) => {
                  const TYPE_COLORS: Record<string, string> = { add: 'var(--g)', cancel: 'var(--amb)', full: 'var(--red)', modify: 'var(--blue)' };
                  const TYPE_LABELS: Record<string, string> = { add: 'Added', cancel: 'Cancelled', full: 'Full Cancel', modify: 'Modified' };
                  const tc = TYPE_COLORS[ch.type] || 'var(--m)';
                  const ci = ch.costImpact || 0;
                  return (
                    <tr key={ch.id}>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 11 }}>
                        {ch.date}
                        <br />
                        <span style={{ color: 'var(--m)' }}>{ch.time}</span>
                      </td>
                      <td>
                        <span className="chg-type-badge" style={{ background: `${tc}22`, color: tc }}>
                          {TYPE_LABELS[ch.type] || ch.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{ch.description}</td>
                      <td style={{ fontSize: 12, color: 'var(--m)' }}>{ch.detail || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: ci > 0 ? 'var(--g)' : ci < 0 ? 'var(--red)' : 'var(--m)' }}>
                        {ci !== 0 ? `${ci > 0 ? '+' : ''}$${fmt(Math.abs(ci))}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--red)' }}>{ch.cancelFee ? `$${fmt(ch.cancelFee)}` : '—'}</td>
                      <td style={{ fontSize: 11 }}>{ch.by || 'Staff'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function OnTourForm({ tab, onSave }: { tab: OtTab; onSave: (type: OtTab, payload: Record<string, unknown>) => void }) {
  const [addName, setAddName] = useState('');
  const [addCostInput, setAddCostInput] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addAlert, setAddAlert] = useState(true);
  const [cancelName, setCancelName] = useState('');
  const [fullConfirm, setFullConfirm] = useState(false);

  const blurCost = () => {
    const n = parseMoneyInput(addCostInput, { absolute: true });
    setAddCostInput(n ? fmt(n) : '');
    return n;
  };

  if (tab === 'add') {
    return (
      <div className="otab-form otab-form-add">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="fg" style={{ gridColumn: '1 / 3' }}>
            <label className="lbl">Activity / Tour Name *</label>
            <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="e.g. Hoi An Cooking Class..." />
          </div>
          <div className="fg">
            <label className="lbl">Additional Cost (USD)</label>
            <input
              type="text"
              value={addCostInput}
              placeholder="e.g. 150 or $150"
              onChange={(e) => setAddCostInput(e.target.value)}
              onBlur={blurCost}
            />
          </div>
          <div className="fg" style={{ gridColumn: '1 / 3' }}>
            <label className="lbl">Notes for guide / operations</label>
            <input value={addNotes} onChange={(e) => setAddNotes(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={addAlert} onChange={(e) => setAddAlert(e.target.checked)} /> Alert guide of this addition
          </label>
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-p btn-sm"
            type="button"
            onClick={() => {
              if (!addName.trim()) {
                toast.warning('Please enter the activity name.');
                return;
              }
              const addCost = parseMoneyInput(addCostInput, { absolute: true });
              onSave('add', { description: `Added: ${addName}`, detail: addNotes, costImpact: addCost, guideAlert: addAlert });
              setAddName('');
              setAddCostInput('');
              setAddNotes('');
            }}
          >
            ✓ Save & Update Booking
          </button>
        </div>
      </div>
    );
  }

  if (tab === 'cancel') {
    return (
      <div className="otab-form otab-form-cancel">
        <div className="fg">
          <label className="lbl">Activity Being Cancelled *</label>
          <input value={cancelName} onChange={(e) => setCancelName(e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            className="btn btn-sm"
            type="button"
            style={{ background: '#D97706', color: '#fff', border: 'none' }}
            onClick={() => {
              if (!cancelName.trim()) return;
              onSave('cancel', { description: `Cancelled: ${cancelName}`, guideAlert: true });
              setCancelName('');
            }}
          >
            ✓ Save Cancellation
          </button>
        </div>
      </div>
    );
  }

  if (tab === 'full') {
    return (
      <div className="otab-form otab-form-full">
        <div className="otab-full-warn">⚠ This will mark the entire booking as Cancelled and stop all services.</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginTop: 10 }}>
          <input type="checkbox" checked={fullConfirm} onChange={(e) => setFullConfirm(e.target.checked)} /> I confirm this booking should be fully cancelled
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button
            className="btn btn-sm"
            type="button"
            style={{ background: '#C0392B', color: '#fff', border: 'none' }}
            onClick={() => {
              if (!fullConfirm) {
                toast.warning('Please tick the confirmation checkbox.');
                return;
              }
              onSave('full', { description: 'BOOKING CANCELLED', guideAlert: true });
              setFullConfirm(false);
            }}
          >
            ✗ Cancel Entire Booking
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="otab-form otab-form-modify">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div className="fg">
          <label className="lbl">New Pax Count</label>
          <input type="number" min={1} id="ot-mod-pax" />
        </div>
        <div className="fg">
          <label className="lbl">New Start</label>
          <input id="ot-mod-start" placeholder="Oct 12" />
        </div>
        <div className="fg">
          <label className="lbl">New Hotel</label>
          <input id="ot-mod-hotel" />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <button
          className="btn btn-p btn-sm"
          type="button"
          onClick={() => {
            const pax = (document.getElementById('ot-mod-pax') as HTMLInputElement)?.value;
            const start = (document.getElementById('ot-mod-start') as HTMLInputElement)?.value;
            const hotel = (document.getElementById('ot-mod-hotel') as HTMLInputElement)?.value;
            const parts = [];
            if (pax) parts.push(`Pax → ${pax}`);
            if (start) parts.push(`Start → ${start}`);
            if (hotel) parts.push(`Hotel → ${hotel}`);
            if (!parts.length) {
              toast.warning('Enter at least one change.');
              return;
            }
            onSave('modify', { description: `Modified: ${parts.join(' · ')}`, pax, start, hotel, guideAlert: true });
          }}
        >
          ✓ Save Changes
        </button>
      </div>
    </div>
  );
}

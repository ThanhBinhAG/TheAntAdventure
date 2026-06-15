'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { getCustomerName } from '@/lib/crm-utils';
import { useStore } from '@/hooks/useStore';
import type { Booking } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  'Deposit Paid': 'bdg-a',
  'Fully Paid': 'bdg-g',
  Confirmed: 'bdg-b',
  'On Tour': 'bdg-p',
  Completed: 'bdg-w',
  Cancelled: 'bdg-r',
};

const STATUS_HEADER: Record<string, string> = {
  'Deposit Paid': '#D97706',
  'Fully Paid': '#2E7D52',
  Confirmed: '#1565C0',
  'On Tour': '#6B21A8',
  Completed: '#6B7F74',
  Cancelled: '#C0392B',
};

type OtTab = 'add' | 'cancel' | 'full' | 'modify';

interface BookingChange {
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

const emptyNewBooking = {
  custId: '',
  tour: '',
  pax: 2,
  start: '',
  end: '',
  total: 0,
  deposit: 0,
  status: 'Confirmed',
  guide: '',
  hotel: '',
};

export default function Bookings() {
  const bookings = useStore((s) => s.bookings);
  const customers = useStore((s) => s.customers);
  const addBooking = useStore((s) => s.addBooking);
  const updateBooking = useStore((s) => s.updateBooking);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [otTab, setOtTab] = useState<OtTab>('add');
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [monthF, setMonthF] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newBk, setNewBk] = useState(emptyNewBooking);

  const selected = bookings.find((b) => b.id === selectedId) || null;

  const filtered = useMemo(
    () =>
      bookings.filter((b) => {
        if (statusF && b.status !== statusF) return false;
        if (monthF && !`${b.start} ${b.end}`.toLowerCase().includes(monthF.toLowerCase().slice(0, 3))) return false;
        const client = getCustomerName(customers, b.custId).toLowerCase();
        const q = search.toLowerCase();
        if (q && !b.id.toLowerCase().includes(q) && !b.tour.toLowerCase().includes(q) && !client.includes(q)) return false;
        return true;
      }),
    [bookings, customers, search, statusF, monthF]
  );

  const saveNewBooking = () => {
    if (!newBk.custId || !newBk.tour) {
      alert('Please select a customer and enter tour name.');
      return;
    }
    const n = bookings.length + 1;
    const id = `BK-2026-${String(n).padStart(3, '0')}`;
    addBooking({
      id,
      custId: newBk.custId,
      tour: newBk.tour,
      pax: newBk.pax,
      start: newBk.start || 'TBD',
      end: newBk.end || 'TBD',
      total: newBk.total,
      deposit: newBk.deposit,
      status: newBk.status,
      guide: newBk.guide,
      hotel: newBk.hotel,
      changes: [],
      guideAlertPending: false,
    });
    setShowNew(false);
    setNewBk(emptyNewBooking);
  };

  const saveOnTourChange = (type: OtTab, payload: Record<string, unknown>) => {
    if (!selected) return;
    const now = new Date();
    const entry: BookingChange = {
      id: `CHG-${Date.now()}`,
      type,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      by: 'Staff',
      description: String(payload.description || ''),
      detail: String(payload.detail || ''),
      costImpact: Number(payload.costImpact || 0),
      cancelFee: Number(payload.cancelFee || 0),
      refund: Number(payload.refund || 0),
    };
    const changes = [entry, ...((selected.changes as BookingChange[]) || [])];
    const updates: Partial<Booking> = {
      changes,
      total: Math.max(0, selected.total + (entry.costImpact || 0)),
      guideAlertPending: Boolean(payload.guideAlert),
    };
    if (type === 'full') updates.status = 'Cancelled';
    if (type === 'modify') {
      if (payload.pax) updates.pax = Number(payload.pax);
      if (payload.start) updates.start = String(payload.start);
      if (payload.end) updates.end = String(payload.end);
      if (payload.hotel) updates.hotel = String(payload.hotel);
    }
    updateBooking(selected.id, updates);
  };

  const markGuideNotified = () => {
    if (selected) updateBooking(selected.id, { guideAlertPending: false });
  };

  return (
    <div className="bk-page">
      <div className="pt-banner">
        <span style={{ fontSize: 12.5, color: 'var(--gd)' }}>
          ⭐ <b>Tour completed?</b> Log post-tour feedback & satisfaction surveys:
        </span>
        <Link href="/posttour" className="btn btn-p btn-sm">
          → Client Survey (NPS)
        </Link>
        <Link href="/posttour" className="btn btn-s btn-sm">
          → Agent Feedback
        </Link>
        <Link href="/posttour" className="btn btn-s btn-sm">
          📋 View Feedback Log
        </Link>
      </div>

      <div className="search-row">
        <input placeholder="Search bookings..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={statusF} onChange={(e) => setStatusF(e.target.value)}>
          <option value="">All Status</option>
          <option>Confirmed</option>
          <option>Deposit Paid</option>
          <option>Fully Paid</option>
          <option>On Tour</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
        <select value={monthF} onChange={(e) => setMonthF(e.target.value)}>
          <option value="">All Months</option>
          <option>May 2026</option>
          <option>Jun 2026</option>
          <option>Jul 2026</option>
          <option>Aug 2026</option>
          <option>Oct 2026</option>
          <option>Nov 2026</option>
        </select>
        <div style={{ flex: 1 }} />
        <button className="btn btn-p btn-sm" type="button" onClick={() => setShowNew(true)}>
          + New Booking
        </button>
      </div>

      <div className="card bk-table-card">
        <div className="card-body" style={{ padding: 0 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Booking ID</th>
                <th>Customer</th>
                <th>Tour</th>
                <th>Pax</th>
                <th>Travel Date</th>
                <th>Total Value</th>
                <th>Deposit</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Guide</th>
                <th>📋 Forms</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const bal = b.total - b.deposit;
                const isOnTour = b.status === 'On Tour';
                const changes = (b.changes as BookingChange[]) || [];
                return (
                  <tr
                    key={b.id}
                    style={{ cursor: 'pointer' }}
                    className={isOnTour ? 'bk-on-tour-row' : undefined}
                    onClick={() => setSelectedId(b.id)}
                  >
                    <td>
                      <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{b.id}</code>
                      {b.guideAlertPending && (
                        <span className="bk-guide-alert" title="Guide not yet notified">
                          ⚠ Guide
                        </span>
                      )}
                    </td>
                    <td>
                      <b>{getCustomerName(customers, b.custId)}</b>
                    </td>
                    <td>
                      {b.tour}
                      {changes.length > 0 && <span className="bk-changes-badge">{changes.length} change{changes.length > 1 ? 's' : ''}</span>}
                    </td>
                    <td>{b.pax}</td>
                    <td>
                      {b.start}–{b.end} 2026
                    </td>
                    <td style={{ fontWeight: 600 }}>${fmt(b.total)}</td>
                    <td style={{ color: 'var(--blue)' }}>${fmt(b.deposit)}</td>
                    <td style={{ color: bal > 0 ? 'var(--amb)' : 'var(--g)', fontWeight: 600 }}>${fmt(bal)}</td>
                    <td>
                      <span className={`bdg ${STATUS_COLORS[b.status] || 'bdg-w'}`}>{b.status}</span>
                    </td>
                    <td>{b.guide || '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="bk-forms-btn" type="button">
                        📋 Generate
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <div className="overlay open" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 640 }}>
            <div className="modal-hd modal-hd-green">
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>+ New Booking</span>
              <button className="modal-close-btn" type="button" onClick={() => setShowNew(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fg">
                  <label className="lbl">
                    Customer <span className="req">*</span>
                  </label>
                  <select value={newBk.custId} onChange={(e) => setNewBk({ ...newBk, custId: e.target.value })}>
                    <option value="">— Select customer —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">
                    Tour Name <span className="req">*</span>
                  </label>
                  <input value={newBk.tour} onChange={(e) => setNewBk({ ...newBk, tour: e.target.value })} placeholder="North Vietnam Classic 12D" />
                </div>
                <div className="fg">
                  <label className="lbl">Pax</label>
                  <input type="number" min={1} value={newBk.pax} onChange={(e) => setNewBk({ ...newBk, pax: +e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">Status</label>
                  <select value={newBk.status} onChange={(e) => setNewBk({ ...newBk, status: e.target.value })}>
                    <option>Confirmed</option>
                    <option>Deposit Paid</option>
                    <option>Fully Paid</option>
                    <option>On Tour</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Start Date</label>
                  <input placeholder="Oct 12" value={newBk.start} onChange={(e) => setNewBk({ ...newBk, start: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">End Date</label>
                  <input placeholder="Oct 23" value={newBk.end} onChange={(e) => setNewBk({ ...newBk, end: e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">Total (USD)</label>
                  <input type="number" value={newBk.total || ''} onChange={(e) => setNewBk({ ...newBk, total: +e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">Deposit (USD)</label>
                  <input type="number" value={newBk.deposit || ''} onChange={(e) => setNewBk({ ...newBk, deposit: +e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">Guide</label>
                  <input value={newBk.guide} onChange={(e) => setNewBk({ ...newBk, guide: e.target.value })} placeholder="Minh N." />
                </div>
                <div className="fg">
                  <label className="lbl">Hotel</label>
                  <input value={newBk.hotel} onChange={(e) => setNewBk({ ...newBk, hotel: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                <button className="btn btn-s" type="button" onClick={() => setShowNew(false)}>
                  Cancel
                </button>
                <button className="btn btn-p" type="button" onClick={saveNewBooking}>
                  ✓ Create Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <BookingDetailModal
          booking={selected}
          customerName={getCustomerName(customers, selected.custId)}
          otTab={otTab}
          setOtTab={setOtTab}
          onClose={() => setSelectedId(null)}
          onSaveChange={saveOnTourChange}
          onMarkNotified={markGuideNotified}
        />
      )}
    </div>
  );
}

function BookingDetailModal({
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
              {b.id} · {customerName} · {b.pax} pax · {b.start}–{b.end} 2026
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
          )}
        </div>
      </div>
    </div>
  );
}

function OnTourForm({ tab, onSave }: { tab: OtTab; onSave: (type: OtTab, payload: Record<string, unknown>) => void }) {
  const [addName, setAddName] = useState('');
  const [addCost, setAddCost] = useState(0);
  const [addNotes, setAddNotes] = useState('');
  const [addAlert, setAddAlert] = useState(true);
  const [cancelName, setCancelName] = useState('');
  const [fullConfirm, setFullConfirm] = useState(false);

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
            <input type="number" min={0} value={addCost || ''} onChange={(e) => setAddCost(+e.target.value)} />
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
                alert('Please enter the activity name.');
                return;
              }
              onSave('add', { description: `Added: ${addName}`, detail: addNotes, costImpact: addCost, guideAlert: addAlert });
              setAddName('');
              setAddCost(0);
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
                alert('Please tick the confirmation checkbox.');
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
              alert('Enter at least one change.');
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

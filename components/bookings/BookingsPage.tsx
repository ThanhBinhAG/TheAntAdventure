'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { getCustomerName } from '@/lib/core/crm-utils';
import { parseMoneyInput } from '@/lib/core/money';
import { useStore } from '@/hooks/useStore';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import PaginationBar from '@/components/PaginationBar';
import type { Booking } from '@/lib/types';
import { toast } from '@/lib/toast';
import { usePagePermission } from '@/hooks/usePagePermission';
import {
  BookingDetailModal,
  type BookingChange,
  type OtTab,
} from '@/components/bookings/BookingDetailModal';

const STATUS_COLORS: Record<string, string> = {
  'Deposit Paid': 'bdg-a',
  'Fully Paid': 'bdg-g',
  Confirmed: 'bdg-b',
  'On Tour': 'bdg-p',
  Completed: 'bdg-w',
  Cancelled: 'bdg-r',
};


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

export default function BookingsPage() {
  const { canWrite } = usePagePermission('bookings');
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
  const [totalInput, setTotalInput] = useState('');
  const [depositInput, setDepositInput] = useState('');

  const openNewBooking = () => {
    setNewBk(emptyNewBooking);
    setTotalInput('');
    setDepositInput('');
    setShowNew(true);
  };

  const formatMoneyBlur = (raw: string, setter: (v: string) => void) => {
    const n = parseMoneyInput(raw, { absolute: true });
    setter(n ? fmt(n) : '');
    return n;
  };

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

  const { pageSize, setPageSize } = usePageSize();
  const pagination = usePagination(filtered, pageSize, [search, statusF, monthF, pageSize]);
  const { paginatedItems } = pagination;

  const saveNewBooking = () => {
    if (!newBk.custId || !newBk.tour) {
      toast.warning('Please select a customer and enter tour name.');
      return;
    }
    const total = parseMoneyInput(totalInput, { absolute: true });
    let deposit = parseMoneyInput(depositInput, { absolute: true });
    if (deposit > total) deposit = total;
    const n = bookings.length + 1;
    const id = `BK-2026-${String(n).padStart(3, '0')}`;
    addBooking({
      id,
      custId: newBk.custId,
      tour: newBk.tour,
      pax: newBk.pax,
      start: newBk.start || 'TBD',
      end: newBk.end || 'TBD',
      total,
      deposit,
      status: newBk.status,
      guide: newBk.guide,
      hotel: newBk.hotel,
      changes: [],
      guideAlertPending: false,
    });
    setShowNew(false);
    setNewBk(emptyNewBooking);
    setTotalInput('');
    setDepositInput('');
  };

  const saveOnTourChange = (type: OtTab, payload: Record<string, unknown>) => {
    if (!selected) return;
    const now = new Date();
    const entry: BookingChange = {
      id: `CHG-${selected.id}-${((selected.changes as BookingChange[]) || []).length + 1}`,
      type,
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      by: 'Staff',
      description: String(payload.description || ''),
      detail: String(payload.detail || ''),
      costImpact: parseMoneyInput(payload.costImpact as string | number, { allowNegative: true }),
      cancelFee: parseMoneyInput(payload.cancelFee as string | number, { absolute: true }),
      refund: parseMoneyInput(payload.refund as string | number, { absolute: true }),
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
        <button
          className="btn btn-p btn-sm"
          type="button"
          onClick={openNewBooking}
          disabled={!canWrite}
          title={!canWrite ? 'You need write permission for Bookings to create a booking' : undefined}
        >
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
              {paginatedItems.map((b) => {
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
          <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
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
                  <input
                    type="text"
                    value={totalInput}
                    placeholder="e.g. 22,000 or $22000"
                    onChange={(e) => setTotalInput(e.target.value)}
                    onBlur={() => formatMoneyBlur(totalInput, setTotalInput)}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Deposit (USD)</label>
                  <input
                    type="text"
                    value={depositInput}
                    placeholder="e.g. 6,600"
                    onChange={(e) => setDepositInput(e.target.value)}
                    onBlur={() => formatMoneyBlur(depositInput, setDepositInput)}
                  />
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

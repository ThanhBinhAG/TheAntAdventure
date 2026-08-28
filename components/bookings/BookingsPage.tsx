'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { getCustomerName } from '@/lib/core/crm-utils';
import { parseMoneyInput } from '@/lib/core/money';
import { formatBookingTravelLabel } from '@/lib/bookings/booking-dates';
import { useStore } from '@/hooks/useStore';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { useBookingsPage } from '@/hooks/useBookingsPage';
import { useCreateBooking } from '@/hooks/useCreateBooking';
import { useUpdateBooking } from '@/hooks/useUpdateBooking';
import { useEnsureCustomersCatalogLoaded } from '@/hooks/useEnsureCustomersCatalogLoaded';
import PaginationBar from '@/components/PaginationBar';
import type { Booking } from '@/lib/types';
import { toast } from '@/lib/toast';
import { usePagePermission } from '@/hooks/usePagePermission';
import BookingFormModal from '@/components/bookings/BookingFormModal';
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

export default function BookingsPage() {
  const { canWrite } = usePagePermission('bookings');
  const { items, loading, error, reload } = useBookingsPage();
  const { createBooking } = useCreateBooking();
  const { patchBooking } = useUpdateBooking();
  const { ensureCatalog } = useEnsureCustomersCatalogLoaded();
  const customers = useStore((s) => s.customers);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [otTab, setOtTab] = useState<OtTab>('add');
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('');
  const [monthF, setMonthF] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void ensureCatalog();
  }, [ensureCatalog]);

  const openNewBooking = () => {
    void ensureCatalog();
    setShowNew(true);
  };

  const customerNameFor = (custId: string, fallback?: string) =>
    fallback || getCustomerName(customers, custId);

  const selected = items.find((b) => b.id === selectedId) || null;

  const filtered = useMemo(
    () =>
      items.filter((b) => {
        if (statusF && b.status !== statusF) return false;
        if (monthF && !`${b.start} ${b.end}`.toLowerCase().includes(monthF.toLowerCase().slice(0, 3)))
          return false;
        const client = (b.customerName || getCustomerName(customers, b.custId)).toLowerCase();
        const q = search.toLowerCase();
        if (q && !b.id.toLowerCase().includes(q) && !b.tour.toLowerCase().includes(q) && !client.includes(q))
          return false;
        return true;
      }),
    [items, customers, search, statusF, monthF],
  );

  const { pageSize, setPageSize } = usePageSize();
  const pagination = usePagination(filtered, pageSize, [search, statusF, monthF, pageSize]);
  const { paginatedItems } = pagination;

  const handleCreateBooking = async (booking: Parameters<typeof createBooking>[0]) => {
    setSaving(true);
    const result = await createBooking(booking);
    setSaving(false);
    if (result.ok) {
      await reload();
      toast.success('Booking created.');
    }
    return result;
  };

  const saveOnTourChange = async (type: OtTab, payload: Record<string, unknown>) => {
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
    const result = await patchBooking(selected.id, updates);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    await reload();
  };

  const markGuideNotified = async () => {
    if (!selected) return;
    const result = await patchBooking(selected.id, { guideAlertPending: false });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    await reload();
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

      {error && (
        <div className="card" style={{ marginBottom: 12, padding: 12, color: 'var(--red)' }}>
          {error}{' '}
          <button className="btn btn-s btn-sm" type="button" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      )}

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
          disabled={!canWrite || loading}
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
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ padding: 16, color: 'var(--m)' }}>
                    Loading bookings…
                  </td>
                </tr>
              ) : (
                paginatedItems.map((b) => {
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
                        <b>{customerNameFor(b.custId, b.customerName)}</b>
                      </td>
                      <td>
                        {b.tour}
                        {changes.length > 0 && (
                          <span className="bk-changes-badge">
                            {changes.length} change{changes.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </td>
                      <td>{b.pax}</td>
                      <td>{formatBookingTravelLabel(b.start, b.end)}</td>
                      <td style={{ fontWeight: 600 }}>${fmt(b.total)}</td>
                      <td style={{ color: 'var(--blue)' }}>${fmt(b.deposit)}</td>
                      <td style={{ color: bal > 0 ? 'var(--amb)' : 'var(--g)', fontWeight: 600 }}>
                        ${fmt(bal)}
                      </td>
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
                })
              )}
            </tbody>
          </table>
          <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
        </div>
      </div>

      <BookingFormModal
        open={showNew}
        customers={customers}
        saving={saving}
        onClose={() => setShowNew(false)}
        onCreate={handleCreateBooking}
      />

      {selected && (
        <BookingDetailModal
          booking={selected}
          customerName={customerNameFor(selected.custId, selected.customerName)}
          otTab={otTab}
          setOtTab={setOtTab}
          onClose={() => setSelectedId(null)}
          onSaveChange={(type, payload) => {
            void saveOnTourChange(type, payload);
          }}
          onMarkNotified={() => {
            void markGuideNotified();
          }}
        />
      )}
    </div>
  );
}

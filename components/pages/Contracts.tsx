'use client';

import { useMemo, useState } from 'react';
import { fmt } from '@/lib/constants';
import { buildContractHTML, downloadContractWord, printContract } from '@/lib/contract-html';
import { useStore } from '@/hooks/useStore';

type Contract = {
  id: string;
  bookingId?: string;
  clientName?: string;
  nationality?: string;
  pax?: number;
  rooms?: string;
  tourName?: string;
  duration?: string;
  departureDate?: string;
  returnDate?: string;
  route?: string;
  inclusions?: string;
  exclusions?: string;
  flights?: string;
  currency?: string;
  total?: number;
  depositPct?: number;
  depositAmt?: number;
  balanceDueDate?: string;
  status?: string;
  createdAt?: string;
  signedAt?: string | null;
  notes?: string;
};

const DEFAULT_INCLUSIONS = `Private English-speaking guide throughout
All accommodation as per itinerary
Daily breakfast and meals as specified
Private air-conditioned vehicle & driver
All entrance fees and activities listed
Bottled water during touring`;

const DEFAULT_EXCLUSIONS = `International flights to/from Vietnam
Travel insurance (strongly recommended)
Personal expenses, tips & gratuities
Visa fees (unless specified)
Meals not mentioned in the itinerary`;

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Draft: { bg: '#FEF3C7', color: '#92400E', border: '#D97706' },
  Sent: { bg: '#DBEAFE', color: '#1e3a8a', border: '#1565C0' },
  Signed: { bg: '#E8F5EE', color: '#1a5c38', border: '#2E7D52' },
};

function statusBadge(status?: string) {
  const s = STATUS_STYLE[status || 'Draft'] || STATUS_STYLE.Draft;
  return (
    <span className="ctr-status-badge" style={{ background: s.bg, color: s.color, borderColor: s.border }}>
      {status}
    </span>
  );
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Contracts() {
  const contracts = useStore((s) => s.contracts) as Contract[];
  const bookings = useStore((s) => s.bookings);
  const addContract = useStore((s) => s.addContract);
  const updateContract = useStore((s) => s.updateContract);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [preview, setPreview] = useState<Contract | null>(null);
  const [form, setForm] = useState({
    bookingId: '',
    clientName: '',
    nationality: '',
    pax: 2,
    rooms: '',
    tourName: '',
    duration: '',
    departureDate: '',
    returnDate: '',
    route: '',
    inclusions: DEFAULT_INCLUSIONS,
    exclusions: DEFAULT_EXCLUSIONS,
    flights: '',
    currency: 'USD',
    total: 0,
    depositPct: 50,
    balanceDueDate: '',
    notes: '',
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return contracts.filter((c) => {
      if (filter !== 'all' && c.status !== filter) return false;
      if (q && !`${c.clientName} ${c.tourName} ${c.id}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [contracts, search, filter]);

  const kpis = useMemo(() => {
    const draft = contracts.filter((c) => c.status === 'Draft').length;
    const sent = contracts.filter((c) => c.status === 'Sent').length;
    const signed = contracts.filter((c) => c.status === 'Signed').length;
    const pipeline = contracts.filter((c) => c.status !== 'Draft').reduce((s, c) => s + Number(c.total || 0), 0);
    return { total: contracts.length, draft, sent, signed, pipeline };
  }, [contracts]);

  const autoFillBooking = (bkId: string) => {
    const b = bookings.find((x) => x.id === bkId);
    if (!b) return;
    setForm((f) => ({
      ...f,
      bookingId: bkId,
      pax: b.pax,
      tourName: b.tour,
      total: b.total,
      depositPct: 50,
    }));
  };

  const depositAmt = form.total * (form.depositPct / 100);

  const saveContract = () => {
    if (!form.clientName || !form.tourName) {
      alert('Please fill in Client Name and Tour Name.');
      return;
    }
    const id = `CTR-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`;
    const c: Contract = {
      id,
      bookingId: form.bookingId,
      clientName: form.clientName,
      nationality: form.nationality,
      pax: form.pax,
      rooms: form.rooms,
      tourName: form.tourName,
      duration: form.duration,
      departureDate: form.departureDate,
      returnDate: form.returnDate,
      route: form.route,
      inclusions: form.inclusions,
      exclusions: form.exclusions,
      flights: form.flights,
      currency: form.currency,
      total: form.total,
      depositPct: form.depositPct,
      depositAmt,
      balanceDueDate: form.balanceDueDate,
      status: 'Draft',
      createdAt: new Date().toISOString().slice(0, 10),
      signedAt: null,
      notes: form.notes,
    };
    addContract(c as Record<string, unknown>);
    setShowNew(false);
    setPreview(c);
  };

  return (
    <div>
      <div className="ctr-header-bar">
        <input className="ctr-search" placeholder="🔍  Search contracts…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="ctr-filters">
          {(['all', 'Draft', 'Sent', 'Signed'] as const).map((f) => (
            <button key={f} type="button" className={`ctr-filter-btn${filter === f ? ' on' : ''}`} data-status={f} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
        <button className="btn btn-p btn-sm" type="button" style={{ marginLeft: 'auto' }} onClick={() => setShowNew(true)}>
          ＋ New Contract
        </button>
      </div>

      <div className="ctr-kpi-row">
        {[
          ['Total Contracts', kpis.total, 'var(--gd)'],
          ['Draft', kpis.draft, '#D97706'],
          ['Sent to Client', kpis.sent, 'var(--blue)'],
          ['Signed', kpis.signed, 'var(--g)'],
          ['Pipeline Value', `$${kpis.pipeline.toLocaleString("en-US")}`, 'var(--pur)'],
        ].map(([label, value, color]) => (
          <div key={String(label)} className="ctr-kpi-pill">
            <div className="ctr-kpi-val" style={{ color: color as string }}>
              {value}
            </div>
            <div className="ctr-kpi-lbl">{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Contract No.</th>
              <th>Client</th>
              <th>Tour</th>
              <th>Pax</th>
              <th>Value</th>
              <th>Departure</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 30, color: 'var(--m)', fontStyle: 'italic' }}>
                  No contracts found.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => setPreview(c)}>
                  <td>
                    <b style={{ color: 'var(--gd)' }}>{c.id}</b>
                  </td>
                  <td>{c.clientName}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.tourName}>
                    {c.tourName}
                  </td>
                  <td style={{ textAlign: 'center' }}>{c.pax}</td>
                  <td>
                    <b>
                      {c.currency} {Number(c.total).toLocaleString("en-US")}
                    </b>
                  </td>
                  <td>{fmtDate(c.departureDate)}</td>
                  <td>{statusBadge(c.status)}</td>
                  <td>{fmtDate(c.createdAt)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-s btn-sm" type="button" onClick={() => setPreview(c)}>
                      👁 View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="overlay open" onClick={() => setShowNew(false)}>
          <div className="modal ctr-new-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd modal-hd-green">
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>📄 New Contract</div>
                <div style={{ color: 'rgba(255,255,255,.75)', fontSize: 12, marginTop: 2 }}>Auto-fill from a confirmed booking or enter manually</div>
              </div>
              <button className="modal-close-btn" type="button" onClick={() => setShowNew(false)}>
                ✕
              </button>
            </div>
            <div style={{ padding: 22 }}>
              <div className="ctr-autofill-box">
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gd)', marginBottom: 8 }}>🔗 LINK TO BOOKING (Auto-fill)</div>
                <select value={form.bookingId} onChange={(e) => autoFillBooking(e.target.value)} style={{ flex: 1, width: '100%' }}>
                  <option value="">— Select a confirmed booking —</option>
                  {bookings
                    .filter((b) => ['Confirmed', 'On Tour', 'Completed', 'Deposit Paid'].includes(b.status))
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.id} — {b.tour} ({b.pax} pax)
                      </option>
                    ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <div className="ctr-form-section">CLIENT INFORMATION</div>
                  <div className="fg">
                    <label className="lbl">Client Name *</label>
                    <input value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Nationality</label>
                    <input value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Pax *</label>
                    <input type="number" min={1} value={form.pax} onChange={(e) => setForm({ ...form, pax: +e.target.value })} />
                  </div>
                </div>
                <div>
                  <div className="ctr-form-section">TOUR DETAILS</div>
                  <div className="fg">
                    <label className="lbl">Tour Name *</label>
                    <input value={form.tourName} onChange={(e) => setForm({ ...form, tourName: e.target.value })} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Duration</label>
                    <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="10 Days / 9 Nights" />
                  </div>
                  <div className="fg">
                    <label className="lbl">Departure Date</label>
                    <input type="date" value={form.departureDate} onChange={(e) => setForm({ ...form, departureDate: e.target.value })} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Return Date</label>
                    <input type="date" value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Route</label>
                    <input value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} placeholder="Hanoi – Halong – Hoi An – Saigon" />
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 14 }}>
                <div className="fg">
                  <label className="lbl">Inclusions (one per line)</label>
                  <textarea value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} style={{ minHeight: 100 }} />
                </div>
                <div className="fg">
                  <label className="lbl">Exclusions (one per line)</label>
                  <textarea value={form.exclusions} onChange={(e) => setForm({ ...form, exclusions: e.target.value })} style={{ minHeight: 100 }} />
                </div>
              </div>
              <div className="fg" style={{ marginTop: 10 }}>
                <label className="lbl">Domestic Flights (one per line, optional)</label>
                <textarea value={form.flights} onChange={(e) => setForm({ ...form, flights: e.target.value })} placeholder="HAN–DAD Economy · DAD–SGN Economy" style={{ minHeight: 60 }} />
              </div>
              <div className="ctr-form-section" style={{ marginTop: 14 }}>
                PRICING & PAYMENT
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                <div className="fg">
                  <label className="lbl">Currency</label>
                  <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                    <option>USD</option>
                    <option>AUD</option>
                    <option>EUR</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Total Value</label>
                  <input type="number" value={form.total || ''} onChange={(e) => setForm({ ...form, total: +e.target.value })} />
                </div>
                <div className="fg">
                  <label className="lbl">Deposit %</label>
                  <select value={form.depositPct} onChange={(e) => setForm({ ...form, depositPct: +e.target.value })}>
                    <option value={30}>30%</option>
                    <option value={50}>50%</option>
                    <option value={100}>100%</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Deposit Amount</label>
                  <input readOnly value={depositAmt.toLocaleString("en-US")} style={{ background: '#f5f5f5' }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button className="btn btn-s" type="button" onClick={() => setShowNew(false)}>
                  Cancel
                </button>
                <button className="btn btn-p" type="button" onClick={saveContract}>
                  💾 Save as Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="overlay open" onClick={() => setPreview(null)}>
          <div className="modal ctr-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd modal-hd-green" style={{ borderRadius: '12px 12px 0 0' }}>
              <div style={{ color: '#fff', fontWeight: 700 }}>
                📄 {preview.id} — {preview.clientName}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={preview.status}
                  onChange={(e) => {
                    updateContract(preview.id, { status: e.target.value, signedAt: e.target.value === 'Signed' ? new Date().toISOString().slice(0, 10) : null });
                    setPreview({ ...preview, status: e.target.value });
                  }}
                  className="ctr-status-select"
                >
                  <option>Draft</option>
                  <option>Sent</option>
                  <option>Signed</option>
                </select>
                <button className="modal-close-btn" type="button" onClick={() => setPreview(null)}>
                  ✕
                </button>
              </div>
            </div>
            <div className="ctr-preview-body" dangerouslySetInnerHTML={{ __html: buildContractHTML(preview) }} />
            <div style={{ padding: '12px 22px 22px', display: 'flex', gap: 8, borderTop: '1px solid var(--b)' }}>
              <button className="btn btn-p btn-sm" type="button" onClick={() => printContract(preview)}>
                🖨 Print / PDF
              </button>
              <button className="btn btn-s btn-sm" type="button" onClick={() => downloadContractWord(preview)}>
                📄 Download Word
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

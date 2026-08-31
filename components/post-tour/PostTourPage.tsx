'use client';

import { useEffect, useMemo, useState } from 'react';
import PaginationBar from '@/components/PaginationBar';
import EmptyState from '@/components/EmptyState';
import { usePagination } from '@/hooks/usePagination';
import { usePageSize } from '@/hooks/usePageSize';
import { useStore } from '@/hooks/useStore';
import { useFeedbackPage } from '@/hooks/useFeedbackPage';
import { useCreateFeedback } from '@/hooks/useCreateFeedback';
import { useEnsureBookingsCatalogLoaded } from '@/hooks/useEnsureBookingsCatalogLoaded';
import { localTodayIso } from '@/lib/core/date-utils';
import { usePagePermission } from '@/hooks/usePagePermission';
import type { FeedbackCreatePayload } from '@/lib/feedback/feedback-input';
import type { BookingListItem } from '@/lib/bookings/booking-input';
import { toast } from '@/lib/toast';

type PtTab = 'log' | 'ops' | 'guide' | 'client' | 'agent';

const TYPE_LABELS: Record<string, string> = {
  client: 'Client Survey',
  guide: 'Guide Report',
  ops: 'Ops Debrief',
  agent: 'Agent Feedback',
};

function BookingSelect({
  name,
  value,
  onChange,
  required,
  bookings,
}: {
  name: string;
  value: string;
  onChange: (bookingId: string) => void;
  required?: boolean;
  bookings: BookingListItem[];
}) {
  return (
    <select
      name={name}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{bookings.length ? 'Select booking…' : 'Loading bookings…'}</option>
      {bookings.map((b) => (
        <option key={b.id} value={b.id}>
          {b.id} — {b.customerName || b.tour}
        </option>
      ))}
    </select>
  );
}

export default function PostTourPage() {
  const { canWrite } = usePagePermission('posttour');
  const { items: feedback, loading, error, reload } = useFeedbackPage();
  const { createFeedback } = useCreateFeedback();
  const { ensureCatalog } = useEnsureBookingsCatalogLoaded();
  const bookings = useStore((s) => s.bookings) as BookingListItem[];

  const [tab, setTab] = useState<PtTab>('log');
  const [typeF, setTypeF] = useState('');
  const [npsF, setNpsF] = useState('');
  const [npsSelected, setNpsSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [clientBkid, setClientBkid] = useState('');
  const [clientName, setClientName] = useState('');
  const [opsBkid, setOpsBkid] = useState('');
  const [guideBkid, setGuideBkid] = useState('');
  const [agentBkid, setAgentBkid] = useState('');

  useEffect(() => {
    void ensureCatalog();
  }, [ensureCatalog]);

  const bookingById = useMemo(() => {
    const map = new Map<string, BookingListItem>();
    for (const b of bookings) map.set(b.id, b);
    return map;
  }, [bookings]);

  const fillClientFromBooking = (bookingId: string) => {
    setClientBkid(bookingId);
    const booking = bookingById.get(bookingId);
    if (booking?.customerName) setClientName(booking.customerName);
  };

  const filtered = useMemo(() => {
    return feedback.filter((f) => {
      if (typeF && f.type !== typeF) return false;
      if (npsF === 'promoter' && (f.nps || 0) < 9) return false;
      if (npsF === 'passive' && ((f.nps || 0) < 7 || (f.nps || 0) > 8)) return false;
      if (npsF === 'detractor' && (f.nps || 0) > 6) return false;
      return true;
    });
  }, [feedback, typeF, npsF]);

  const { pageSize, setPageSize } = usePageSize();
  const pagination = usePagination(filtered, pageSize, [typeF, npsF, pageSize, feedback.length]);
  const { paginatedItems } = pagination;

  const avgNps = feedback.length
    ? feedback.reduce((s, f) => s + (f.nps || 0), 0) / feedback.length
    : 0;
  const promoters = feedback.filter((f) => (f.nps || 0) >= 9).length;
  const detractors = feedback.filter((f) => (f.nps || 0) <= 6).length;

  const submitFeedback = async (input: FeedbackCreatePayload) => {
    if (!canWrite) return;
    setSaving(true);
    const result = await createFeedback(input);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success('Feedback saved.');
    await reload();
    setTab('log');
    setNpsSelected(null);
    setClientBkid('');
    setClientName('');
    setOpsBkid('');
    setGuideBkid('');
    setAgentBkid('');
  };

  const saveClientSurvey = async (form: HTMLFormElement) => {
    if (npsSelected == null) {
      toast.warning('Please select an NPS score (0–10) before submitting.');
      return;
    }
    const fd = new FormData(form);
    await submitFeedback({
      type: 'client',
      date: String(fd.get('date') || localTodayIso()),
      bkid: clientBkid || String(fd.get('bkid') || ''),
      client: clientName || String(fd.get('client') || ''),
      nps: npsSelected,
      overall: String(fd.get('overall') || ''),
      guide_r: String(fd.get('guide_r') || ''),
      hotel_r: String(fd.get('hotel_r') || ''),
      best: String(fd.get('best') || ''),
      improve: String(fd.get('improve') || ''),
      comments: String(fd.get('comments') || ''),
      again: String(fd.get('again') || ''),
    });
    form.reset();
  };

  const saveOpsDebrief = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const tour = String(fd.get('tour') || '').trim();
    const leadGuide = String(fd.get('leadGuide') || '').trim();
    const comments = [tour ? `Tour: ${tour}` : '', leadGuide ? `Lead Guide: ${leadGuide}` : '']
      .filter(Boolean)
      .join('\n');
    await submitFeedback({
      type: 'ops',
      date: localTodayIso(),
      bkid: opsBkid,
      best: String(fd.get('best') || ''),
      improve: String(fd.get('improve') || ''),
      comments: comments || undefined,
    });
    form.reset();
  };

  const saveGuideReport = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const tour = String(fd.get('tour') || '').trim();
    const guideName = String(fd.get('guideName') || '').trim();
    await submitFeedback({
      type: 'guide',
      date: localTodayIso(),
      bkid: guideBkid,
      client: guideName || undefined,
      best: String(fd.get('best') || ''),
      improve: String(fd.get('improve') || ''),
      comments: tour ? `Tour: ${tour}` : undefined,
    });
    form.reset();
  };

  const saveAgentFeedback = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    await submitFeedback({
      type: 'agent',
      date: localTodayIso(),
      bkid: agentBkid || String(fd.get('bkid') || '') || undefined,
      client: String(fd.get('agentName') || ''),
      overall: String(fd.get('overall') || ''),
      comments: String(fd.get('comments') || ''),
    });
    form.reset();
  };

  return (
    <div>
      <div className="tabs">
        {(
          [
            ['log', '📋 Feedback Log'],
            ['ops', '🔧 Ops Debrief'],
            ['guide', '🧭 Guide Report'],
            ['client', '⭐ Client Survey'],
            ['agent', '🤝 Agent Feedback'],
          ] as const
        ).map(([id, label]) => (
          <div
            key={id}
            className={`tab${tab === id ? ' on' : ''}`}
            onClick={() => setTab(id)}
            role="button"
            tabIndex={0}
          >
            {label}
          </div>
        ))}
      </div>

      {tab === 'log' && (
        <>
          <div className="pt-log-filters">
            <select value={typeF} onChange={(e) => setTypeF(e.target.value)}>
              <option value="">All Types</option>
              <option value="client">Client Survey</option>
              <option value="guide">Guide Report</option>
              <option value="ops">Ops Debrief</option>
              <option value="agent">Agent Feedback</option>
            </select>
            <select value={npsF} onChange={(e) => setNpsF(e.target.value)}>
              <option value="">All NPS</option>
              <option value="promoter">Promoter (9–10)</option>
              <option value="passive">Passive (7–8)</option>
              <option value="detractor">Detractor (0–6)</option>
            </select>
            <div style={{ flex: 1 }} />
            <div className="pt-nps-summary">
              <span>
                Avg NPS: <b style={{ color: 'var(--g)' }}>{loading ? '…' : avgNps.toFixed(1)}</b>
              </span>
              <span>
                Promoters: <b>{loading ? '…' : promoters}</b>
              </span>
              <span>
                Detractors: <b style={{ color: 'var(--red)' }}>{loading ? '…' : detractors}</b>
              </span>
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              {loading ? (
                <EmptyState title="Loading feedback…" size="compact" />
              ) : error ? (
                <EmptyState
                  title="Could not load feedback"
                  description={error}
                  action={
                    <button type="button" className="btn btn-s" onClick={() => void reload()}>
                      Retry
                    </button>
                  }
                  role="alert"
                />
              ) : paginatedItems.length === 0 ? (
                <EmptyState
                  title="No feedback yet"
                  description="Submit a client survey or debrief from the tabs above."
                  size="compact"
                />
              ) : (
                <>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Booking</th>
                        <th>Client</th>
                        <th>Type</th>
                        <th>Submitted</th>
                        <th>NPS</th>
                        <th>Overall</th>
                        <th>Highlights</th>
                        <th>Issues</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((f, i) => (
                        <tr key={f.id || i}>
                          <td>
                            <code>{f.bkid || '—'}</code>
                          </td>
                          <td>
                            <b>{f.client || '—'}</b>
                          </td>
                          <td>
                            <span className="bdg bdg-w">
                              {TYPE_LABELS[f.type || 'client'] || f.type}
                            </span>
                          </td>
                          <td style={{ color: 'var(--m)', fontSize: 12 }}>{f.date}</td>
                          <td>
                            <span
                              className={`bdg ${(f.nps || 0) >= 9 ? 'bdg-g' : (f.nps || 0) >= 7 ? 'bdg-b' : 'bdg-a'}`}
                            >
                              {f.nps ?? '—'}
                            </span>
                          </td>
                          <td>{f.overall ? `${f.overall}/5` : '—'}</td>
                          <td style={{ maxWidth: 200, fontSize: 12 }}>{f.best?.slice(0, 80) || '—'}</td>
                          <td style={{ maxWidth: 160, fontSize: 12, color: 'var(--red)' }}>
                            {f.improve?.slice(0, 60) || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PaginationBar {...pagination} onPageSizeChange={setPageSize} />
                </>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'ops' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🔧 Operations Post-Tour Debrief</span>
          </div>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveOpsDebrief(e.currentTarget);
              }}
            >
              <div className="pt-form-grid-3">
                <div className="fg">
                  <label className="lbl">Booking Reference *</label>
                  <BookingSelect
                    name="bkid"
                    value={opsBkid}
                    onChange={setOpsBkid}
                    required
                    bookings={bookings}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Tour Name</label>
                  <input name="tour" placeholder="Vietnam Full 12D" />
                </div>
                <div className="fg">
                  <label className="lbl">Lead Guide</label>
                  <input name="leadGuide" placeholder="Minh N." />
                </div>
              </div>
              <div className="pt-form-grid-2">
                <div className="fg">
                  <label className="lbl">What went well ✓</label>
                  <textarea
                    name="best"
                    style={{ minHeight: 90 }}
                    placeholder="Hotels exceeded expectations..."
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Issues encountered ✗</label>
                  <textarea
                    name="improve"
                    style={{ minHeight: 90 }}
                    placeholder="Transfer delay on Day 3..."
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
                <button className="btn btn-s" type="button" onClick={() => setTab('log')}>
                  Cancel
                </button>
                <button
                  className="btn btn-p"
                  type="submit"
                  disabled={!canWrite || saving}
                  title={!canWrite ? 'You need write permission to save debrief' : undefined}
                >
                  {saving ? 'Saving…' : '✓ Save Debrief'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'guide' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🧭 Post-Tour Guide Report</span>
          </div>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveGuideReport(e.currentTarget);
              }}
            >
              <div className="pt-form-grid-3">
                <div className="fg">
                  <label className="lbl">Booking Reference *</label>
                  <BookingSelect
                    name="bkid"
                    value={guideBkid}
                    onChange={setGuideBkid}
                    required
                    bookings={bookings}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Guide Name</label>
                  <input name="guideName" placeholder="Minh N." />
                </div>
                <div className="fg">
                  <label className="lbl">Tour Name</label>
                  <input name="tour" placeholder="Vietnam Full 12D" />
                </div>
              </div>
              <div className="pt-form-grid-2">
                <div className="fg">
                  <label className="lbl">Client highlights</label>
                  <textarea name="best" style={{ minHeight: 90 }} />
                </div>
                <div className="fg">
                  <label className="lbl">Client complaints</label>
                  <textarea name="improve" style={{ minHeight: 90 }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
                <button className="btn btn-s" type="button" onClick={() => setTab('log')}>
                  Cancel
                </button>
                <button
                  className="btn btn-p"
                  type="submit"
                  disabled={!canWrite || saving}
                  title={!canWrite ? 'You need write permission to submit report' : undefined}
                >
                  {saving ? 'Saving…' : '✓ Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'client' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">⭐ Client Satisfaction Survey</span>
            <span style={{ fontSize: 11.5, color: 'var(--m)' }}>Sent D+2 after tour</span>
          </div>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveClientSurvey(e.currentTarget);
              }}
            >
              <div className="pt-form-grid-3">
                <div className="fg">
                  <label className="lbl">Booking Reference *</label>
                  <BookingSelect
                    name="bkid"
                    value={clientBkid}
                    onChange={fillClientFromBooking}
                    required
                    bookings={bookings}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Client Name</label>
                  <input
                    name="client"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="James & Sarah Miller"
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Submission Date</label>
                  <input name="date" type="date" defaultValue={localTodayIso()} />
                </div>
              </div>
              <div className="nps-block">
                <div className="nps-title">NPS — Net Promoter Score *</div>
                <div style={{ fontSize: 12.5, color: 'var(--m)', marginBottom: 8 }}>
                  How likely are you to recommend The Ant Adventures? (0–10)
                </div>
                <div className="nps-buttons">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`nps-btn${npsSelected === n ? ' on' : ''}`}
                      onClick={() => setNpsSelected(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-form-grid-3">
                <div className="fg">
                  <label className="lbl">Overall Experience</label>
                  <select name="overall" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {'★'.repeat(n)} ({n})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Guide Rating</label>
                  <select name="guide_r" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Hotel Rating</label>
                  <select name="hotel_r" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="pt-form-grid-2">
                <div className="fg">
                  <label className="lbl">Best moments</label>
                  <textarea name="best" style={{ minHeight: 90 }} />
                </div>
                <div className="fg">
                  <label className="lbl">What could improve?</label>
                  <textarea name="improve" style={{ minHeight: 90 }} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Other comments</label>
                <textarea name="comments" style={{ minHeight: 70 }} />
              </div>
              <div className="fg">
                <label className="lbl">Would you travel with us again?</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <label>
                    <input type="radio" name="again" value="yes" defaultChecked /> Yes
                  </label>
                  <label>
                    <input type="radio" name="again" value="maybe" /> Maybe
                  </label>
                  <label>
                    <input type="radio" name="again" value="no" /> Not likely
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
                <button className="btn btn-s" type="button" onClick={() => setTab('log')}>
                  Cancel
                </button>
                <button
                  className="btn btn-p"
                  type="submit"
                  disabled={!canWrite || saving}
                  title={!canWrite ? 'You need write permission to save survey' : undefined}
                >
                  {saving ? 'Saving…' : '✓ Save Survey'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'agent' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🤝 B2B Agent Feedback Form</span>
          </div>
          <div className="card-body">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveAgentFeedback(e.currentTarget);
              }}
            >
              <div className="pt-form-grid-3">
                <div className="fg">
                  <label className="lbl">Agent Name *</label>
                  <input name="agentName" required placeholder="Virtuoso — Smith Travel" />
                </div>
                <div className="fg">
                  <label className="lbl">Booking Reference</label>
                  <BookingSelect
                    name="bkid"
                    value={agentBkid}
                    onChange={setAgentBkid}
                    bookings={bookings}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">Overall Rating (1–5)</label>
                  <select name="overall" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Agent feedback & commission notes</label>
                <textarea
                  name="comments"
                  style={{ minHeight: 100 }}
                  placeholder="Service quality, communication, would book again..."
                />
              </div>
              <div className="info-bar" style={{ marginTop: 12 }}>
                Agent commission paid within 14 days of tour completion per B2B policy.
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
                <button
                  className="btn btn-p"
                  type="submit"
                  disabled={!canWrite || saving}
                  title={!canWrite ? 'You need write permission to save agent feedback' : undefined}
                >
                  {saving ? 'Saving…' : '✓ Save Agent Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

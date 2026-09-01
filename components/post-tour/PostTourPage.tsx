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
import { useLanguage } from '@/hooks/useLanguage';
import { POST_TOUR_TYPE_KEYS } from '@/lib/i18n/pages/post-tour';

type PtTab = 'log' | 'ops' | 'guide' | 'client' | 'agent';

function BookingSelect({
  name,
  value,
  onChange,
  required,
  bookings,
  emptyLabel,
  loadingLabel,
}: {
  name: string;
  value: string;
  onChange: (bookingId: string) => void;
  required?: boolean;
  bookings: BookingListItem[];
  emptyLabel: string;
  loadingLabel: string;
}) {
  return (
    <select
      name={name}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{bookings.length ? emptyLabel : loadingLabel}</option>
      {bookings.map((b) => (
        <option key={b.id} value={b.id}>
          {b.id} — {b.customerName || b.tour}
        </option>
      ))}
    </select>
  );
}

export default function PostTourPage() {
  const { tp, tc } = useLanguage();
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
    toast.success(tp('post-tour', 'feedbackSaved'));
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
      toast.warning(tp('post-tour', 'npsRequiredToast'));
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

  const typeLabel = (type: string) => {
    const key = POST_TOUR_TYPE_KEYS[type || 'client'];
    return key ? tp('post-tour', key) : type;
  };

  return (
    <div>
      <div className="tabs">
        {(
          [
            ['log', tp('post-tour', 'tabLog')],
            ['ops', tp('post-tour', 'tabOps')],
            ['guide', tp('post-tour', 'tabGuide')],
            ['client', tp('post-tour', 'tabClient')],
            ['agent', tp('post-tour', 'tabAgent')],
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
              <option value="">{tp('post-tour', 'filterAllTypes')}</option>
              <option value="client">{tp('post-tour', 'typeClient')}</option>
              <option value="guide">{tp('post-tour', 'typeGuide')}</option>
              <option value="ops">{tp('post-tour', 'typeOps')}</option>
              <option value="agent">{tp('post-tour', 'typeAgent')}</option>
            </select>
            <select value={npsF} onChange={(e) => setNpsF(e.target.value)}>
              <option value="">{tp('post-tour', 'filterAllNps')}</option>
              <option value="promoter">{tp('post-tour', 'filterPromoter')}</option>
              <option value="passive">{tp('post-tour', 'filterPassive')}</option>
              <option value="detractor">{tp('post-tour', 'filterDetractor')}</option>
            </select>
            <div style={{ flex: 1 }} />
            <div className="pt-nps-summary">
              <span>
                {tp('post-tour', 'avgNps')} <b style={{ color: 'var(--g)' }}>{loading ? '…' : avgNps.toFixed(1)}</b>
              </span>
              <span>
                {tp('post-tour', 'promoters')} <b>{loading ? '…' : promoters}</b>
              </span>
              <span>
                {tp('post-tour', 'detractors')} <b style={{ color: 'var(--red)' }}>{loading ? '…' : detractors}</b>
              </span>
            </div>
          </div>
          <div className="card">
            <div className="card-body" style={{ padding: 0 }}>
              {loading ? (
                <EmptyState title={tp('post-tour', 'loadingFeedback')} size="compact" />
              ) : error ? (
                <EmptyState
                  title={tp('post-tour', 'loadErrorTitle')}
                  description={error}
                  action={
                    <button type="button" className="btn btn-s" onClick={() => void reload()}>
                      {tc('retry')}
                    </button>
                  }
                  role="alert"
                />
              ) : paginatedItems.length === 0 ? (
                <EmptyState
                  title={tp('post-tour', 'noFeedbackTitle')}
                  description={tp('post-tour', 'noFeedbackDesc')}
                  size="compact"
                />
              ) : (
                <>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>{tp('post-tour', 'colBooking')}</th>
                        <th>{tp('post-tour', 'colClient')}</th>
                        <th>{tp('post-tour', 'colType')}</th>
                        <th>{tp('post-tour', 'colSubmitted')}</th>
                        <th>{tp('post-tour', 'colNps')}</th>
                        <th>{tp('post-tour', 'colOverall')}</th>
                        <th>{tp('post-tour', 'colHighlights')}</th>
                        <th>{tp('post-tour', 'colIssues')}</th>
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
                              {typeLabel(f.type || 'client')}
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
            <span className="card-title">{tp('post-tour', 'opsTitle')}</span>
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
                  <label className="lbl">{tp('post-tour', 'lblBookingRef')}</label>
                  <BookingSelect
                    name="bkid"
                    value={opsBkid}
                    onChange={setOpsBkid}
                    required
                    bookings={bookings}
                    emptyLabel={tp('post-tour', 'selectBooking')}
                    loadingLabel={tp('post-tour', 'loadingBookings')}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblTourName')}</label>
                  <input name="tour" placeholder={tp('post-tour', 'placeholderTour')} />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblLeadGuide')}</label>
                  <input name="leadGuide" placeholder={tp('post-tour', 'placeholderGuide')} />
                </div>
              </div>
              <div className="pt-form-grid-2">
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblWentWell')}</label>
                  <textarea
                    name="best"
                    style={{ minHeight: 90 }}
                    placeholder={tp('post-tour', 'placeholderWentWell')}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblIssues')}</label>
                  <textarea
                    name="improve"
                    style={{ minHeight: 90 }}
                    placeholder={tp('post-tour', 'placeholderIssues')}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
                <button className="btn btn-s" type="button" onClick={() => setTab('log')}>
                  {tp('post-tour', 'cancel')}
                </button>
                <button
                  className="btn btn-p"
                  type="submit"
                  disabled={!canWrite || saving}
                  title={!canWrite ? tp('post-tour', 'readOnlyDebrief') : undefined}
                >
                  {saving ? tp('post-tour', 'saving') : tp('post-tour', 'saveDebrief')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'guide' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tp('post-tour', 'guideTitle')}</span>
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
                  <label className="lbl">{tp('post-tour', 'lblBookingRef')}</label>
                  <BookingSelect
                    name="bkid"
                    value={guideBkid}
                    onChange={setGuideBkid}
                    required
                    bookings={bookings}
                    emptyLabel={tp('post-tour', 'selectBooking')}
                    loadingLabel={tp('post-tour', 'loadingBookings')}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblGuideName')}</label>
                  <input name="guideName" placeholder={tp('post-tour', 'placeholderGuide')} />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblTourName')}</label>
                  <input name="tour" placeholder={tp('post-tour', 'placeholderTour')} />
                </div>
              </div>
              <div className="pt-form-grid-2">
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblClientHighlights')}</label>
                  <textarea name="best" style={{ minHeight: 90 }} />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblClientComplaints')}</label>
                  <textarea name="improve" style={{ minHeight: 90 }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
                <button className="btn btn-s" type="button" onClick={() => setTab('log')}>
                  {tp('post-tour', 'cancel')}
                </button>
                <button
                  className="btn btn-p"
                  type="submit"
                  disabled={!canWrite || saving}
                  title={!canWrite ? tp('post-tour', 'readOnlyReport') : undefined}
                >
                  {saving ? tp('post-tour', 'saving') : tp('post-tour', 'submitReport')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'client' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tp('post-tour', 'clientTitle')}</span>
            <span style={{ fontSize: 11.5, color: 'var(--m)' }}>{tp('post-tour', 'clientSubtitle')}</span>
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
                  <label className="lbl">{tp('post-tour', 'lblBookingRef')}</label>
                  <BookingSelect
                    name="bkid"
                    value={clientBkid}
                    onChange={fillClientFromBooking}
                    required
                    bookings={bookings}
                    emptyLabel={tp('post-tour', 'selectBooking')}
                    loadingLabel={tp('post-tour', 'loadingBookings')}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblClientName')}</label>
                  <input
                    name="client"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={tp('post-tour', 'placeholderClient')}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblSubmissionDate')}</label>
                  <input name="date" type="date" defaultValue={localTodayIso()} />
                </div>
              </div>
              <div className="nps-block">
                <div className="nps-title">{tp('post-tour', 'npsTitle')}</div>
                <div style={{ fontSize: 12.5, color: 'var(--m)', marginBottom: 8 }}>
                  {tp('post-tour', 'npsQuestion')}
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
                  <label className="lbl">{tp('post-tour', 'lblOverallExperience')}</label>
                  <select name="overall" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {'★'.repeat(n)} ({n})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblGuideRating')}</label>
                  <select name="guide_r" defaultValue="5">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblHotelRating')}</label>
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
                  <label className="lbl">{tp('post-tour', 'lblBestMoments')}</label>
                  <textarea name="best" style={{ minHeight: 90 }} />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblImprove')}</label>
                  <textarea name="improve" style={{ minHeight: 90 }} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">{tp('post-tour', 'lblOtherComments')}</label>
                <textarea name="comments" style={{ minHeight: 70 }} />
              </div>
              <div className="fg">
                <label className="lbl">{tp('post-tour', 'lblTravelAgain')}</label>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <label>
                    <input type="radio" name="again" value="yes" defaultChecked /> {tp('post-tour', 'againYes')}
                  </label>
                  <label>
                    <input type="radio" name="again" value="maybe" /> {tp('post-tour', 'againMaybe')}
                  </label>
                  <label>
                    <input type="radio" name="again" value="no" /> {tp('post-tour', 'againNo')}
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
                <button className="btn btn-s" type="button" onClick={() => setTab('log')}>
                  {tp('post-tour', 'cancel')}
                </button>
                <button
                  className="btn btn-p"
                  type="submit"
                  disabled={!canWrite || saving}
                  title={!canWrite ? tp('post-tour', 'readOnlySurvey') : undefined}
                >
                  {saving ? tp('post-tour', 'saving') : tp('post-tour', 'saveSurvey')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {tab === 'agent' && (
        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tp('post-tour', 'agentTitle')}</span>
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
                  <label className="lbl">{tp('post-tour', 'lblAgentName')}</label>
                  <input name="agentName" required placeholder={tp('post-tour', 'placeholderAgent')} />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblBookingRef')}</label>
                  <BookingSelect
                    name="bkid"
                    value={agentBkid}
                    onChange={setAgentBkid}
                    bookings={bookings}
                    emptyLabel={tp('post-tour', 'selectBooking')}
                    loadingLabel={tp('post-tour', 'loadingBookings')}
                  />
                </div>
                <div className="fg">
                  <label className="lbl">{tp('post-tour', 'lblOverallRating')}</label>
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
                <label className="lbl">{tp('post-tour', 'lblAgentFeedback')}</label>
                <textarea
                  name="comments"
                  style={{ minHeight: 100 }}
                  placeholder={tp('post-tour', 'placeholderAgentComments')}
                />
              </div>
              <div className="info-bar" style={{ marginTop: 12 }}>
                {tp('post-tour', 'commissionPolicy')}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 14 }}>
                <button
                  className="btn btn-p"
                  type="submit"
                  disabled={!canWrite || saving}
                  title={!canWrite ? tp('post-tour', 'readOnlyAgent') : undefined}
                >
                  {saving ? tp('post-tour', 'saving') : tp('post-tour', 'saveAgentFeedback')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

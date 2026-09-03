'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SRC_COLORS, STAGE_COLORS, fmt } from '@/lib/constants';
import { getClientLeads, getClientPipeline, getCustomerBookings } from '@/lib/core/crm-utils';
import { npsBadgeClass, npsIcon } from '@/lib/core/page-helpers';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { useCustomerProfileMutations } from '@/hooks/useCustomerProfileMutations';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';
import { formatTravelMonth } from '@/lib/core/travel-month';
import { useStore } from '@/hooks/useStore';
import { usePagePermission } from '@/hooks/usePagePermission';
import type { Customer, Lead } from '@/lib/types';
import { toast } from '@/lib/toast';

const TABS = ['overview', 'pipeline', 'communications', 'bookings', 'notes', 'feedback'] as const;
type Tab = (typeof TABS)[number];

import type { CUSTOMERSKey } from '@/lib/i18n/pages/customers';

const TAB_LABEL_KEYS: Record<Tab, CUSTOMERSKey> = {
  overview: 'profileTabOverview',
  pipeline: 'profileTabPipeline',
  communications: 'profileTabComms',
  bookings: 'profileTabBookings',
  notes: 'profileTabNotes',
  feedback: 'profileTabFeedback',
};

interface CustomerProfileModalProps {
  customer: Customer;
  initialTab?: Tab;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function PipelineLeadCard({ lead, customerId }: { lead: Lead; customerId: string }) {
  const { tp, tStage } = useLanguage();
  return (
    <article className="prof-lead-card">
      <div className="prof-lead-card-top">
        <div className="prof-lead-card-main">
          <div className="prof-lead-tour">{lead.tour?.trim() || tp('customers', 'profileUntitledInquiry')}</div>
          <code className="prof-lead-id">{lead.id}</code>
        </div>
        <span className={`bdg ${STAGE_COLORS[lead.stage] || 'bdg-w'}`}>{tStage(lead.stage)}</span>
      </div>
      <dl className="prof-lead-meta">
        <div>
          <dt>{tp('customers', 'profileLeadValue')}</dt>
          <dd>{lead.value > 0 ? `$${fmt(lead.value)}` : '—'}</dd>
        </div>
        <div>
          <dt>{tp('customers', 'profileLeadTravel')}</dt>
          <dd>{lead.month || '—'}</dd>
        </div>
        <div>
          <dt>{tp('customers', 'profileLeadOwner')}</dt>
          <dd>{lead.owner || '—'}</dd>
        </div>
      </dl>
      <div className="prof-lead-actions">
        <Link
          href={`/sales?custId=${encodeURIComponent(customerId)}&leadId=${encodeURIComponent(lead.id)}&tab=list`}
          className="btn btn-s btn-sm"
        >
          {tp('customers', 'profileOpenSales')}
        </Link>
        <Link
          href={`/tourdesign?leadId=${encodeURIComponent(lead.id)}&custId=${encodeURIComponent(customerId)}`}
          className="btn btn-p btn-sm"
        >
          {tp('customers', 'profileTourDesign')}
        </Link>
      </div>
    </article>
  );
}

export default function CustomerProfileModal({
  customer,
  initialTab = 'overview',
  onClose,
  onEdit,
  onDelete,
}: CustomerProfileModalProps) {
  const { canWrite } = usePagePermission('customers');
  const {
    leads,
    comms,
    bookings,
    feedback,
    isLoading: profileLoading,
    error: profileError,
    refresh,
  } = useCustomerProfile(customer.id);
  const { createInquiry, logComm: logCommRemote } = useCustomerProfileMutations();
  const updateCustomer = useStore((s) => s.updateCustomer);

  const [tab, setTab] = useState<Tab>(initialTab);
  const [showLostLeads, setShowLostLeads] = useState(false);
  const [createdLead, setCreatedLead] = useState<{ leadId: string; custId: string } | null>(null);
  const [notesDraft, setNotesDraft] = useState(customer.notes || '');
  const [commForm, setCommForm] = useState({
    type: 'Email',
    dir: 'outbound' as 'inbound' | 'outbound',
    date: new Date().toISOString().split('T')[0],
    subj: '',
    body: '',
  });
  const [aiDraft, setAiDraft] = useState<string | null>(null);

  const { language, tp, tpl, tStage } = useLanguage();
  const emptyCommForm = {
    type: 'Email',
    dir: 'outbound' as const,
    date: new Date().toISOString().split('T')[0],
    subj: '',
    body: '',
  };
  const profileDirty = useFormDirty(
    true,
    { notes: customer.notes || '', comm: emptyCommForm },
    { notes: notesDraft, comm: commForm },
    (v) => JSON.stringify(v),
    customer.id,
  );
  const { requestClose } = useConfirmClose({ open: true, dirty: profileDirty, onClose, language });

  const custComms = useMemo(
    () => comms.filter((m) => m.cid === customer.id).sort((a, b) => b.date.localeCompare(a.date)),
    [comms, customer.id]
  );
  const cfb = feedback.filter((f) => f.custId === customer.id);
  const avgNps = cfb.length ? cfb.reduce((s, f) => s + (f.nps || 0), 0) / cfb.length : null;
  const pipeline = getClientPipeline(customer.id, leads);
  const activeLeads = useMemo(() => getClientLeads(customer.id, leads), [customer.id, leads]);
  const lostLeads = useMemo(
    () => leads.filter((l) => l.custId === customer.id && l.stage === 'Lost').sort((a, b) => a.id.localeCompare(b.id)),
    [customer.id, leads]
  );

  const custBookings = useMemo(
    () => getCustomerBookings(customer, bookings),
    [customer, bookings]
  );

  async function logComm() {
    if (!commForm.subj.trim()) {
      toast.warning(tp('customers', 'toastSubjectRequired'));
      return;
    }
    const result = await logCommRemote(customer.id, {
      type: commForm.type,
      dir: commForm.dir,
      date: commForm.date,
      subj: commForm.subj.trim(),
      body: commForm.body,
    });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setCommForm({ ...commForm, subj: '', body: '' });
    refresh();
  }

  async function saveNotes() {
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(customer.id)}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesDraft }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        customer?: { notes?: string };
      };
      if (!res.ok || !body.ok) {
        toast.error(typeof body.error === 'string' ? body.error : tp('customers', 'toastNotesSaveFailed'));
        return;
      }
      // Notes already saved via BFF; customers is BFF-managed (no browser upsert).
      updateCustomer(customer.id, { notes: notesDraft });
      toast.success(tp('customers', 'toastNotesSaved'));
    } catch {
      toast.error(tp('customers', 'toastNotesSaveFailed'));
    }
  }

  function aiDraftEmail() {
    const draft = `Dear ${customer.name.split(' ')[0] || customer.name},

Thank you for your interest in traveling with The Ant Adventures. Based on your ${customer.style || 'travel'} preferences${customer.travelMonth ? ` for ${formatTravelMonth(customer.travelMonth)}` : ''}, we would love to craft a personalised Vietnam itinerary for you.

${customer.interests ? `We noted your interests in: ${customer.interests}. ` : ''}Our team will follow up shortly with tailored recommendations.

Warm regards,
Tai Pham
The Ant Adventures`;
    setAiDraft(draft);
    setCommForm((f) => ({ ...f, subj: `Your Vietnam Journey — ${customer.name}`, body: draft, type: 'Email', dir: 'outbound' }));
    setTab('communications');
  }

  async function startNewInquiry() {
    const result = await createInquiry(customer.id, { flagTourDesign: true });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setCreatedLead({ leadId: result.lead.id, custId: customer.id });
    setTab('pipeline');
    refresh();
  }

  return (
    <div className="overlay open prof-overlay" onClick={() => void requestClose()}>
      <div className="modal prof-modal" onClick={(e) => e.stopPropagation()}>
        <div className="prof-modal-hd">
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{customer.name}</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              {customer.email || '—'} · {customer.country} · <code style={{ fontSize: 10.5 }}>{customer.id}</code>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`bdg ${customer.clientType === 'b2b' ? 'bdg-p' : 'bdg-b'}`} style={{ fontSize: 10 }}>
              {customer.clientType === 'b2b' ? 'B2B' : 'B2C'}
            </span>
            {customer.source && <span className={`bdg ${SRC_COLORS[customer.source] || 'bdg-w'}`}>{customer.source}</span>}
          </div>
        </div>

        <div className="prof-modal-toolbar">
          <button type="button" className="prof-toolbar-btn" onClick={onEdit} disabled={!canWrite}>
            {tp('customers', 'profileEdit')}
          </button>
          <button type="button" className="prof-toolbar-btn prof-toolbar-danger" onClick={onDelete} disabled={!canWrite}>
            {tp('customers', 'profileDelete')}
          </button>
          <button type="button" className="prof-toolbar-btn" onClick={() => void requestClose()}>
            {tp('customers', 'profileClose')}
          </button>
        </div>

        <div className="prof-modal-body">
          {profileError && (
            <div className="crm-page-hydrate-error" role="alert" style={{ padding: '0.5rem 0.75rem', marginBottom: 8, color: '#b91c1c', fontSize: 12 }}>
              {profileError}
            </div>
          )}
          {profileLoading && (
            <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--m)' }}>{tp('customers', 'profileLoading')}</div>
          )}
          <div className="prof-tabs">
            {TABS.map((t) => (
              <div key={t} className={`prof-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)} role="button" tabIndex={0}>
                {tp('customers', TAB_LABEL_KEYS[t])}
              </div>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="prof-overview-grid">
              <div>
                <div className="prof-section-lbl">{tp('customers', 'profileSectionProfile')}</div>
                {[
                  [tp('customers', 'profileCustomerId'), customer.id],
                  [tp('customers', 'profileCountry'), customer.country],
                  [tp('customers', 'profileNationality'), customer.nat || '—'],
                  [tp('customers', 'profileTravelStyle'), customer.style],
                  [tp('customers', 'profileLanguage'), customer.lang],
                  [tp('customers', 'profileSource'), customer.source],
                  [tp('customers', 'profileHotelTier'), customer.hotelTier || '—'],
                  [tp('customers', 'profileBudget'), customer.budget || '—'],
                  [
                    tp('customers', 'profileRevenue'),
                    customer.revenue != null && customer.revenue > 0 ? `$${fmt(customer.revenue)}` : '—',
                  ],
                  [
                    tp('customers', 'profileCost'),
                    customer.cost != null && customer.cost > 0 ? `$${fmt(customer.cost)}` : '—',
                  ],
                  [
                    tp('customers', 'profileProfit'),
                    customer.profit != null && Number.isFinite(customer.profit)
                      ? `$${fmt(customer.profit)}`
                      : '—',
                  ],
                  [tp('customers', 'profileTravelMonth'), formatTravelMonth(customer.travelMonth) || '—'],
                  [tp('customers', 'profileSalesPerson'), customer.salesperson || '—'],
                  [tp('customers', 'profileAgent'), customer.agentName || '—'],
                  [tp('customers', 'profilePhone'), customer.phone || '—'],
                  [tp('customers', 'profileWhatsapp'), customer.whatsapp || '—'],
                ].map(([l, v]) => (
                  <div
                    key={l}
                    className="prof-kv-row"
                    style={
                      l === tp('customers', 'profileProfit')
                        ? { fontWeight: 700, color: 'var(--g)' }
                        : undefined
                    }
                  >
                    <span>{l}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="prof-section-lbl">{tp('customers', 'profileSectionActivity')}</div>
                <div className="prof-stat-box">
                  <div className="prof-stat-num">{custComms.length}</div>
                  <div className="prof-stat-lbl">{tp('customers', 'profileCommsLogged')}</div>
                </div>
                <div className="prof-stat-box">
                  <div className="prof-stat-num">{custBookings.length}</div>
                  <div className="prof-stat-lbl">{tp('customers', 'profileConfirmedBookings')}</div>
                </div>
                <div className="prof-stat-box" style={{ background: 'var(--pur-l)' }}>
                  <div className="prof-stat-num" style={{ color: 'var(--pur)', fontSize: 18 }}>
                    {pipeline.count} · ${fmt(pipeline.value)}
                  </div>
                  <div className="prof-stat-lbl">
                    {tpl('customers', 'profileActivePipeline', {
                      stage: pipeline.stage ? tStage(pipeline.stage) : tp('customers', 'profileNoStage'),
                    })}
                  </div>
                </div>
                {avgNps !== null && (
                  <div className="prof-stat-box">
                    <span className={`bdg ${npsBadgeClass(avgNps)}`}>
                      {npsIcon(avgNps)} NPS {avgNps.toFixed(1)}
                    </span>
                  </div>
                )}
                {customer.notes && (
                  <div className="prof-notes-box">
                    <div className="prof-notes-lbl">{tp('customers', 'profileNotes')}</div>
                    {customer.notes}
                  </div>
                )}
                {(customer.interests || customer.donts) && (
                  <div style={{ marginTop: 10, fontSize: 12.5 }}>
                    {customer.interests && <div>{tp('customers', 'profileInterests')} {customer.interests}</div>}
                    {customer.donts && <div style={{ marginTop: 4 }}>{tp('customers', 'profileAvoid')} {customer.donts}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'pipeline' && (
            <div>
              <div className="prof-tab-toolbar">
                <div className="prof-section-lbl" style={{ marginBottom: 0 }}>
                  {tpl('customers', 'profilePipelineTitle', { count: activeLeads.length })}
                </div>
                <button className="btn btn-p btn-sm" type="button" onClick={startNewInquiry} disabled={!canWrite}>
                  {tp('customers', 'profileStartInquiry')}
                </button>
              </div>

              {activeLeads.length === 0 ? (
                <div className="prof-empty" style={{ textAlign: 'center', padding: 28 }}>
                  <div style={{ fontSize: 13, marginBottom: 12 }}>{tp('customers', 'profileNoInquiries')}</div>
                  <button className="btn btn-p btn-sm" type="button" onClick={startNewInquiry} disabled={!canWrite}>
                    {tp('customers', 'profileStartInquiryBtn')}
                  </button>
                </div>
              ) : (
                <div className="prof-lead-stack">
                  {activeLeads.map((lead) => (
                    <PipelineLeadCard key={lead.id} lead={lead} customerId={customer.id} />
                  ))}
                </div>
              )}

              {lostLeads.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <button
                    type="button"
                    className="btn btn-s btn-sm"
                    style={{ marginBottom: 10 }}
                    onClick={() => setShowLostLeads((v) => !v)}
                  >
                    {showLostLeads
                      ? tpl('customers', 'profileHideLost', { count: lostLeads.length })
                      : tpl('customers', 'profileShowLost', { count: lostLeads.length })}
                  </button>
                  {showLostLeads && (
                    <div className="prof-lead-stack prof-lead-stack-muted">
                      {lostLeads.map((lead) => (
                        <PipelineLeadCard key={lead.id} lead={lead} customerId={customer.id} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'communications' && (
            <div>
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-hd">
                  <span className="card-title">{tp('customers', 'profileLogCommTitle')}</span>
                  <button className="btn btn-pu btn-sm" type="button" style={{ fontSize: 11 }} onClick={aiDraftEmail}>
                    {tp('customers', 'profileAiDraftEmail')}
                  </button>
                </div>
                <div className="card-body">
                  {aiDraft && (
                    <div className="ai-draft-banner">
                      {tp('customers', 'profileAiDraftBanner')}
                      <button type="button" onClick={() => setAiDraft(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pur)' }}>
                        {tp('customers', 'profileDismiss')}
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="fg">
                      <label className="lbl">{tp('customers', 'profileCommType')}</label>
                      <select value={commForm.type} onChange={(e) => setCommForm({ ...commForm, type: e.target.value })}>
                        {['Email', 'WhatsApp', 'Phone', 'Meeting', 'Note'].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="fg">
                      <label className="lbl">{tp('customers', 'profileCommDirection')}</label>
                      <select value={commForm.dir} onChange={(e) => setCommForm({ ...commForm, dir: e.target.value as 'inbound' | 'outbound' })}>
                        <option value="outbound">{tp('customers', 'profileCommOutbound')}</option>
                        <option value="inbound">{tp('customers', 'profileCommInbound')}</option>
                      </select>
                    </div>
                    <div className="fg">
                      <label className="lbl">{tp('customers', 'profileCommDate')}</label>
                      <input type="date" value={commForm.date} onChange={(e) => setCommForm({ ...commForm, date: e.target.value })} />
                    </div>
                  </div>
                  <div className="fg" style={{ marginBottom: 10 }}>
                    <label className="lbl">{tp('customers', 'profileCommSubject')}</label>
                    <input value={commForm.subj} onChange={(e) => setCommForm({ ...commForm, subj: e.target.value })} placeholder={tp('customers', 'profileCommSubjectPlaceholder')} />
                  </div>
                  <div className="fg" style={{ marginBottom: 12 }}>
                    <label className="lbl">{tp('customers', 'profileCommMessage')}</label>
                    <textarea value={commForm.body} onChange={(e) => setCommForm({ ...commForm, body: e.target.value })} placeholder={tp('customers', 'profileCommMessagePlaceholder')} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-p btn-sm" type="button" onClick={logComm} disabled={!canWrite}>
                      {tp('customers', 'profileLogComm')}
                    </button>
                  </div>
                </div>
              </div>
              <div className="prof-section-lbl">{tpl('customers', 'profileCommHistory', { count: custComms.length })}</div>
              {custComms.length === 0 ? (
                <div className="prof-empty">{tp('customers', 'profileNoComms')}</div>
              ) : (
                <div className="comm-timeline">
                  {custComms.map((cm) => (
                    <article
                      key={cm.id}
                      className={`comm-card ${cm.dir === 'outbound' ? 'comm-out' : 'comm-in'}`}
                    >
                      <header className="comm-card-hd">
                        <div className="comm-card-badges">
                          <span className={`comm-dir-badge ${cm.dir}`}>
                            {cm.dir === 'outbound' ? tp('customers', 'profileCommOut') : tp('customers', 'profileCommIn')}
                          </span>
                          <span className="comm-type-badge">{cm.type}</span>
                        </div>
                        <time className="comm-card-when">
                          {cm.date}
                          {cm.author ? ` · ${cm.author}` : ''}
                        </time>
                      </header>
                      <h4 className="comm-card-subj">{cm.subj || tp('customers', 'profileNoSubject')}</h4>
                      {cm.body?.trim() ? (
                        <div className="comm-card-body">{cm.body}</div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'bookings' && (
            <div>
              {custBookings.length === 0 ? (
                <div className="prof-empty">
                  {tp('customers', 'profileNoBookings')}
                  <Link href="/tourdesign" className="btn btn-p btn-sm" style={{ marginTop: 12, display: 'inline-block' }}>
                    {tp('customers', 'profileTourDesignLink')}
                  </Link>
                </div>
              ) : (
                custBookings.map((bk) => (
                  <div key={bk.id} className="prof-booking-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <code style={{ fontSize: 11, color: 'var(--g)' }}>{bk.id}</code>
                      <span className={`bdg ${bk.status === 'Fully Paid' ? 'bdg-g' : bk.status === 'Deposit Paid' ? 'bdg-a' : 'bdg-b'}`}>{bk.status}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{bk.tour}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--m)' }}>
                      {bk.pax} pax · {bk.start}–{bk.end} · Total: <b>${fmt(bk.total)}</b> · Deposit: ${fmt(bk.deposit)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'notes' && (
            <div>
              <div className="fg" style={{ marginBottom: 12 }}>
                <label className="lbl">{tp('customers', 'profileInternalNotes')}</label>
                <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} style={{ minHeight: 140 }} />
              </div>
              <button className="btn btn-p btn-sm" type="button" onClick={saveNotes} disabled={!canWrite}>
                {tp('customers', 'profileSaveNotes')}
              </button>
            </div>
          )}

          {tab === 'feedback' && (
            <div>
              {cfb.length === 0 ? (
                <div className="prof-empty" style={{ textAlign: 'center', padding: 30 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
                  <div style={{ fontSize: 13, marginBottom: 14 }}>{tp('customers', 'profileNoFeedback')}</div>
                  <Link href="/posttour" className="btn btn-p btn-sm">
                    {tp('customers', 'profileRecordFeedback')}
                  </Link>
                </div>
              ) : (
                <>
                  <div className="prof-nps-summary">
                    <div>
                      <div className="prof-nps-big" style={{ color: avgNps! >= 9 ? 'var(--g)' : avgNps! >= 7 ? 'var(--amb)' : 'var(--red)' }}>
                        {avgNps!.toFixed(1)}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--m)' }}>{tp('customers', 'profileAvgNps')}</div>
                    </div>
                    <div style={{ flex: 1, fontSize: 12.5 }}>
                      <b>{cfb.length}</b>{' '}
                      {tpl('customers', cfb.length > 1 ? 'profileSurveysOnFilePlural' : 'profileSurveysOnFile', { count: cfb.length })}
                    </div>
                  </div>
                  {cfb.map((f) => {
                    const text = f.comments || f.best || '';
                    const npsColor = (f.nps || 0) >= 9 ? 'var(--g)' : (f.nps || 0) >= 7 ? 'var(--amb)' : 'var(--red)';
                    return (
                      <div key={f.id || f.bkid} className="prof-fb-card" style={{ borderLeftColor: npsColor }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div>
                            <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{f.bkid || '—'}</code>
                            <span style={{ fontSize: 10.5, color: 'var(--m)', marginLeft: 8 }}>{f.date || '—'}</span>
                          </div>
                          <div style={{ fontSize: 22, fontWeight: 800, color: npsColor }}>
                            {f.nps}
                            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--m)' }}>/10</span>
                          </div>
                        </div>
                        {text && <div style={{ fontSize: 12.5, lineHeight: 1.6, marginTop: 7 }}>{text}</div>}
                        {f.improve && <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--m)' }}>💡 <em>{f.improve}</em></div>}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {createdLead && (
        <div className="overlay open" style={{ zIndex: 10001 }} onClick={() => setCreatedLead(null)}>
          <div className="modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd modal-hd-green">
              <div style={{ color: '#fff', fontWeight: 700 }}>{tp('customers', 'inquiryCreatedTitle')}</div>
              <button type="button" className="modal-close-btn" onClick={() => setCreatedLead(null)}>
                ✕
              </button>
            </div>
            <div style={{ padding: 22 }}>
              <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                {tpl('customers', 'inquiryCreatedLead', { leadId: createdLead.leadId, name: customer.name })}
              </p>
              <p style={{ fontSize: 13, marginBottom: 16 }}>
                {tp('customers', 'inquiryCreatedContinue')}
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-s" type="button" onClick={() => setCreatedLead(null)}>
                  {tp('customers', 'inquiryStayHere')}
                </button>
                <Link
                  href={`/tourdesign?leadId=${encodeURIComponent(createdLead.leadId)}&custId=${encodeURIComponent(createdLead.custId)}`}
                  className="btn btn-p"
                  onClick={() => setCreatedLead(null)}
                >
                  {tp('customers', 'inquiryTourDesign')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

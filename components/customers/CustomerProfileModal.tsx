'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { SRC_COLORS, STAGE_COLORS, fmt } from '@/lib/constants';
import { createInquiryLeadForCustomer } from '@/lib/customers/customer-onboarding';
import { getClientLeads, getClientPipeline, getCustomerBookings } from '@/lib/core/crm-utils';
import { npsBadgeClass, npsIcon } from '@/lib/core/page-helpers';
import { useCustomerProfile } from '@/hooks/useCustomerProfile';
import { useStore } from '@/hooks/useStore';
import { usePagePermission } from '@/hooks/usePagePermission';
import type { Comm, Customer, Lead } from '@/lib/types';
import { toast } from '@/lib/toast';

const TABS = ['overview', 'pipeline', 'communications', 'bookings', 'notes', 'feedback'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  pipeline: 'Pipeline',
  communications: 'Communications',
  bookings: 'Bookings',
  notes: 'Notes',
  feedback: 'Feedback',
};

interface CustomerProfileModalProps {
  customer: Customer;
  initialTab?: Tab;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function PipelineLeadRow({ lead, customerId }: { lead: Lead; customerId: string }) {
  return (
    <tr>
      <td>
        <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{lead.id}</code>
      </td>
      <td style={{ fontSize: 12, maxWidth: 180 }}>{lead.tour}</td>
      <td>
        <span className={`bdg ${STAGE_COLORS[lead.stage] || 'bdg-w'}`} style={{ fontSize: 10 }}>
          {lead.stage}
        </span>
      </td>
      <td style={{ fontWeight: 600, color: 'var(--g)' }}>{lead.value > 0 ? `$${fmt(lead.value)}` : '—'}</td>
      <td style={{ fontSize: 12, color: 'var(--m)' }}>{lead.month || '—'}</td>
      <td style={{ fontSize: 12 }}>{lead.owner || '—'}</td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <Link
          href={`/sales?custId=${encodeURIComponent(customerId)}&leadId=${encodeURIComponent(lead.id)}&tab=list`}
          className="btn btn-s btn-sm"
          style={{ marginRight: 4 }}
        >
          Pipeline
        </Link>
        <Link
          href={`/tourdesign?leadId=${encodeURIComponent(lead.id)}&custId=${encodeURIComponent(customerId)}`}
          className="btn btn-s btn-sm"
        >
          Tour Design
        </Link>
      </td>
    </tr>
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
  } = useCustomerProfile(customer.id);
  const addComm = useStore((s) => s.addComm);
  const addLead = useStore((s) => s.addLead);
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

  function logComm() {
    if (!commForm.subj.trim()) {
      toast.warning('Please add a subject.');
      return;
    }
    const comm: Comm = {
      id: `CM-${Date.now()}`,
      cid: customer.id,
      date: commForm.date,
      type: commForm.type,
      dir: commForm.dir,
      subj: commForm.subj.trim(),
      body: commForm.body,
      author: commForm.dir === 'inbound' ? customer.name : 'Tai (The Ant Adventures)',
    };
    addComm(comm);
    setCommForm({ ...commForm, subj: '', body: '' });
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
        toast.error(typeof body.error === 'string' ? body.error : 'Không thể lưu notes.');
        return;
      }
      // Notes already saved via BFF; customers is BFF-managed (no browser upsert).
      updateCustomer(customer.id, { notes: notesDraft });
      toast.success('Notes saved.');
    } catch {
      toast.error('Không thể lưu notes.');
    }
  }

  function aiDraftEmail() {
    const draft = `Dear ${customer.name.split(' ')[0] || customer.name},

Thank you for your interest in traveling with The Ant Adventures. Based on your ${customer.style || 'travel'} preferences${customer.travelMonth ? ` for ${customer.travelMonth}` : ''}, we would love to craft a personalised Vietnam itinerary for you.

${customer.interests ? `We noted your interests in: ${customer.interests}. ` : ''}Our team will follow up shortly with tailored recommendations.

Warm regards,
Tai Pham
The Ant Adventures`;
    setAiDraft(draft);
    setCommForm((f) => ({ ...f, subj: `Your Vietnam Journey — ${customer.name}`, body: draft, type: 'Email', dir: 'outbound' }));
    setTab('communications');
  }

  function startNewInquiry() {
    const lead = createInquiryLeadForCustomer(customer, leads, { flagTourDesign: true });
    addLead(lead);
    setCreatedLead({ leadId: lead.id, custId: customer.id });
    setTab('pipeline');
  }

  return (
    <div className="overlay open prof-overlay" onClick={onClose}>
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
            ✎ Edit
          </button>
          <button type="button" className="prof-toolbar-btn prof-toolbar-danger" onClick={onDelete} disabled={!canWrite}>
            ✕ Delete
          </button>
          <button type="button" className="prof-toolbar-btn" onClick={onClose}>
            ✕ Close
          </button>
        </div>

        <div className="prof-modal-body">
          {profileError && (
            <div className="crm-page-hydrate-error" role="alert" style={{ padding: '0.5rem 0.75rem', marginBottom: 8, color: '#b91c1c', fontSize: 12 }}>
              {profileError}
            </div>
          )}
          {profileLoading && (
            <div style={{ padding: '8px 0', fontSize: 12, color: 'var(--m)' }}>Loading profile…</div>
          )}
          <div className="prof-tabs">
            {TABS.map((t) => (
              <div key={t} className={`prof-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)} role="button" tabIndex={0}>
                {TAB_LABELS[t]}
              </div>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="prof-overview-grid">
              <div>
                <div className="prof-section-lbl">Profile / Hồ sơ</div>
                {[
                  ['Customer ID', customer.id],
                  ['Country', customer.country],
                  ['Nationality', customer.nat || '—'],
                  ['Travel Style', customer.style],
                  ['Language', customer.lang],
                  ['Source', customer.source],
                  ['Hotel Tier', customer.hotelTier || '—'],
                  ['Budget', customer.budget || '—'],
                  ['Travel Month', customer.travelMonth || '—'],
                  ['Sales Person', customer.salesperson || '—'],
                  ['Agent', customer.agentName || '—'],
                  ['Phone', customer.phone || '—'],
                  ['WhatsApp', customer.whatsapp || '—'],
                ].map(([l, v]) => (
                  <div key={l} className="prof-kv-row">
                    <span>{l}</span>
                    <span>{v}</span>
                  </div>
                ))}
              </div>
              <div>
                <div className="prof-section-lbl">Activity</div>
                <div className="prof-stat-box">
                  <div className="prof-stat-num">{custComms.length}</div>
                  <div className="prof-stat-lbl">Communications logged</div>
                </div>
                <div className="prof-stat-box">
                  <div className="prof-stat-num">{custBookings.length}</div>
                  <div className="prof-stat-lbl">Confirmed bookings</div>
                </div>
                <div className="prof-stat-box" style={{ background: 'var(--pur-l)' }}>
                  <div className="prof-stat-num" style={{ color: 'var(--pur)', fontSize: 18 }}>
                    {pipeline.count} · ${fmt(pipeline.value)}
                  </div>
                  <div className="prof-stat-lbl">Active pipeline · {pipeline.stage || 'No stage'}</div>
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
                    <div className="prof-notes-lbl">Notes</div>
                    {customer.notes}
                  </div>
                )}
                {(customer.interests || customer.donts) && (
                  <div style={{ marginTop: 10, fontSize: 12.5 }}>
                    {customer.interests && <div>✦ Interests: {customer.interests}</div>}
                    {customer.donts && <div style={{ marginTop: 4 }}>✕ Avoid: {customer.donts}</div>}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'pipeline' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="prof-section-lbl" style={{ marginBottom: 0 }}>
                  Quotes & Pipeline ({activeLeads.length})
                </div>
                <button className="btn btn-p btn-sm" type="button" onClick={startNewInquiry} disabled={!canWrite}>
                  + Start New Inquiry
                </button>
              </div>

              {activeLeads.length === 0 ? (
                <div className="prof-empty" style={{ textAlign: 'center', padding: 28 }}>
                  <div style={{ fontSize: 13, marginBottom: 12 }}>No quotes yet for this client.</div>
                  <button className="btn btn-p btn-sm" type="button" onClick={startNewInquiry} disabled={!canWrite}>
                    Start New Inquiry
                  </button>
                </div>
              ) : (
                <div className="card" style={{ marginBottom: 14 }}>
                  <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>Lead ID</th>
                          <th>Tour</th>
                          <th>Stage</th>
                          <th>Value</th>
                          <th>Travel Month</th>
                          <th>Owner</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeLeads.map((lead) => (
                          <PipelineLeadRow key={lead.id} lead={lead} customerId={customer.id} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {lostLeads.length > 0 && (
                <div>
                  <button
                    type="button"
                    className="btn btn-s btn-sm"
                    style={{ marginBottom: 8 }}
                    onClick={() => setShowLostLeads((v) => !v)}
                  >
                    {showLostLeads ? 'Hide' : 'Show'} lost leads ({lostLeads.length})
                  </button>
                  {showLostLeads && (
                    <div className="card">
                      <div className="card-body" style={{ padding: 0, overflowX: 'auto' }}>
                        <table className="tbl">
                          <thead>
                            <tr>
                              <th>Lead ID</th>
                              <th>Tour</th>
                              <th>Stage</th>
                              <th>Value</th>
                              <th>Travel Month</th>
                              <th>Owner</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lostLeads.map((lead) => (
                              <PipelineLeadRow key={lead.id} lead={lead} customerId={customer.id} />
                            ))}
                          </tbody>
                        </table>
                      </div>
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
                  <span className="card-title">Log New Communication</span>
                  <button className="btn btn-pu btn-sm" type="button" style={{ fontSize: 11 }} onClick={aiDraftEmail}>
                    ✉ AI Draft Email
                  </button>
                </div>
                <div className="card-body">
                  {aiDraft && (
                    <div className="ai-draft-banner">
                      ✦ AI draft loaded below — edit before logging.
                      <button type="button" onClick={() => setAiDraft(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pur)' }}>
                        dismiss
                      </button>
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="fg">
                      <label className="lbl">Type</label>
                      <select value={commForm.type} onChange={(e) => setCommForm({ ...commForm, type: e.target.value })}>
                        {['Email', 'WhatsApp', 'Phone', 'Meeting', 'Note'].map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="fg">
                      <label className="lbl">Direction</label>
                      <select value={commForm.dir} onChange={(e) => setCommForm({ ...commForm, dir: e.target.value as 'inbound' | 'outbound' })}>
                        <option value="outbound">↑ Outbound (us→client)</option>
                        <option value="inbound">↓ Inbound (client→us)</option>
                      </select>
                    </div>
                    <div className="fg">
                      <label className="lbl">Date</label>
                      <input type="date" value={commForm.date} onChange={(e) => setCommForm({ ...commForm, date: e.target.value })} />
                    </div>
                  </div>
                  <div className="fg" style={{ marginBottom: 10 }}>
                    <label className="lbl">Subject</label>
                    <input value={commForm.subj} onChange={(e) => setCommForm({ ...commForm, subj: e.target.value })} placeholder="Email subject or call topic" />
                  </div>
                  <div className="fg" style={{ marginBottom: 12 }}>
                    <label className="lbl">Message</label>
                    <textarea value={commForm.body} onChange={(e) => setCommForm({ ...commForm, body: e.target.value })} placeholder="Message content..." />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-p btn-sm" type="button" onClick={logComm} disabled={!canWrite}>
                      + Log Communication
                    </button>
                  </div>
                </div>
              </div>
              <div className="prof-section-lbl">History ({custComms.length})</div>
              {custComms.length === 0 ? (
                <div className="prof-empty">No communications logged yet.</div>
              ) : (
                custComms.map((cm) => (
                  <div key={cm.id} className={`comm-card ${cm.dir === 'outbound' ? 'comm-out' : 'comm-in'}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      <span className={`comm-dir-badge ${cm.dir}`}>{cm.dir === 'outbound' ? '↑ OUT' : '↓ IN'}</span>
                      <span className="comm-type-badge">{cm.type}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{cm.subj}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--m)', whiteSpace: 'nowrap' }}>
                        {cm.date} · {cm.author}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{cm.body}</div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'bookings' && (
            <div>
              {custBookings.length === 0 ? (
                <div className="prof-empty">
                  No bookings yet. Design a tour in Tour Design Studio.
                  <Link href="/tourdesign" className="btn btn-p btn-sm" style={{ marginTop: 12, display: 'inline-block' }}>
                    Tour Design →
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
                <label className="lbl">Internal Notes / Ghi chú nội bộ</label>
                <textarea value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} style={{ minHeight: 140 }} />
              </div>
              <button className="btn btn-p btn-sm" type="button" onClick={saveNotes} disabled={!canWrite}>
                Save Notes
              </button>
            </div>
          )}

          {tab === 'feedback' && (
            <div>
              {cfb.length === 0 ? (
                <div className="prof-empty" style={{ textAlign: 'center', padding: 30 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⭐</div>
                  <div style={{ fontSize: 13, marginBottom: 14 }}>No post-tour feedback recorded yet.</div>
                  <Link href="/posttour" className="btn btn-p btn-sm">
                    Record Feedback →
                  </Link>
                </div>
              ) : (
                <>
                  <div className="prof-nps-summary">
                    <div>
                      <div className="prof-nps-big" style={{ color: avgNps! >= 9 ? 'var(--g)' : avgNps! >= 7 ? 'var(--amb)' : 'var(--red)' }}>
                        {avgNps!.toFixed(1)}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--m)' }}>Average NPS / 10</div>
                    </div>
                    <div style={{ flex: 1, fontSize: 12.5 }}>
                      <b>{cfb.length}</b> survey{cfb.length > 1 ? 's' : ''} on file
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
              <div style={{ color: '#fff', fontWeight: 700 }}>Inquiry created</div>
              <button type="button" className="modal-close-btn" onClick={() => setCreatedLead(null)}>
                ✕
              </button>
            </div>
            <div style={{ padding: 22 }}>
              <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
                Lead <code>{createdLead.leadId}</code> added for <strong>{customer.name}</strong>.
              </p>
              <p style={{ fontSize: 13, marginBottom: 16 }}>
                Continue in <strong>Tour Design</strong> to complete the client brief.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-s" type="button" onClick={() => setCreatedLead(null)}>
                  Stay here
                </button>
                <Link
                  href={`/tourdesign?leadId=${encodeURIComponent(createdLead.leadId)}&custId=${encodeURIComponent(createdLead.custId)}`}
                  className="btn btn-p"
                  onClick={() => setCreatedLead(null)}
                >
                  Tour Design →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { STAGE_COLORS, STAGE_PROB_V22, fmt } from '@/lib/constants';
import { getCustomerName } from '@/lib/crm-utils';
import { useStore } from '@/hooks/useStore';
import type { Lead } from '@/lib/types';

const STAGES = ['Inquiry', 'Designing', 'Quoted', 'Negotiation', 'Confirmed', 'Completed'] as const;
const LOST_REASONS = ['Price too high', 'Chose competitor', 'Dates unavailable', 'No response', 'Changed plans', 'Other'];

type SalesTab = 'pipeline' | 'list' | 'policy';

function SalesPolicyView() {
  return (
    <div>
      <div
        style={{
          background: '#E8F5EE',
          border: '1px solid #b8dfc9',
          borderRadius: 9,
          padding: '10px 16px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 15 }}>📎</span>
        <span style={{ fontSize: 12.5, color: 'var(--gd)', flex: 1 }}>
          Quick reference for sales staff. Full policy version in{' '}
          <Link href="/regulations" style={{ color: 'var(--g)', fontWeight: 600, textDecoration: 'none' }}>
            Regulations page →
          </Link>
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="card-hd">
            <span className="card-title">📋 Booking & Payment Policy</span>
          </div>
          <div className="card-body">
            <div style={{ fontSize: 12.5, lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                ['30%', 'Non-refundable deposit to confirm. Payable within 7 days of confirmation.', 'var(--g)'],
                ['70%', 'Balance due 45 days before departure. Bookings within 45 days: full payment at confirmation.', 'var(--g)'],
                ['FX', 'All prices in USD. Payment via bank transfer or credit card (+2.5% fee).', 'var(--blue)'],
                ['B2B', 'Agent commission within 14 days of completion. Bronze 8% / Silver 12% / Gold 15% / Platinum 20%.', 'var(--pur)'],
              ].map(([tag, text, bg]) => (
                <div key={tag} style={{ display: 'flex', gap: 10 }}>
                  <span style={{ background: bg, color: '#fff', borderRadius: 5, padding: '2px 9px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    {tag}
                  </span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-hd">
            <span className="card-title">🚫 Cancellation Policy</span>
          </div>
          <div className="card-body">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Notice Period</th>
                  <th>Penalty</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['60+ days before', 'Deposit forfeited'],
                  ['45–59 days', '30% of total'],
                  ['30–44 days', '50% of total'],
                  ['15–29 days', '75% of total'],
                  ['0–14 days / no-show', '100% of total'],
                ].map(([period, penalty]) => (
                  <tr key={period}>
                    <td>{period}</td>
                    <td style={penalty.includes('100%') ? { color: 'var(--red)', fontWeight: 600 } : undefined}>{penalty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PipeCard({
  lead,
  stage,
  name,
  onStageChange,
  onUpdate,
}: {
  lead: Lead;
  stage: string;
  name: string;
  onStageChange: (id: string, stage: string) => void;
  onUpdate: (id: string, data: Partial<Lead>) => void;
}) {
  const [fupOpen, setFupOpen] = useState(false);
  const [fupDate, setFupDate] = useState(lead.followUpDate || '');
  const [fupAction, setFupAction] = useState(lead.nextAction || '');
  const [aiOpen, setAiOpen] = useState(false);

  const prob = lead.probability ?? STAGE_PROB_V22[stage] ?? 10;
  const weighted = Math.round(((lead.value || 0) * prob) / 100);

  const aiDraft = `Dear ${name.split(' ')[0] || name},

Thank you for your interest in "${lead.tour}". We are preparing a tailored proposal for ${lead.pax} guests travelling in ${lead.month || 'your preferred dates'}.

Our team at The Ant Adventures will follow up shortly with itinerary options and pricing.

Warm regards,
Tai Pham
The Ant Adventures`;

  return (
    <div
      className="pipe-card"
      style={{
        borderLeft: stage === 'Confirmed' ? '3px solid var(--g)' : stage === 'Negotiation' ? '3px solid var(--amb)' : undefined,
      }}
      title={`${lead.tour} | ${lead.pax} pax | ${lead.month}`}
    >
      <div className="pname">{name}</div>
      <div className="pmeta">
        {Number(lead.pax) > 0 ? `${lead.pax} pax · ` : ''}
        {lead.month}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 }}>
        <span style={{ fontSize: 11.5, color: 'var(--g)', fontWeight: 600 }}>{lead.value > 0 ? `$${fmt(lead.value)}` : '—'}</span>
        <span style={{ fontSize: 10.5, color: 'var(--pur)' }}>
          ~{prob}% → {lead.value > 0 ? `$${fmt(weighted)}` : '—'}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        <select
          className="pipe-stage-select"
          value={lead.stage}
          onChange={(e) => onStageChange(lead.id, e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          {['Inquiry', 'Designing', 'Quoted', 'Negotiation', 'Confirmed', 'Completed', 'Lost'].map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginTop: 6 }}>
        <button type="button" className="pipe-ai-btn" onClick={() => setAiOpen(!aiOpen)}>
          ✉ AI Draft Email
        </button>
      </div>
      {aiOpen && (
        <div className="pipe-ai-panel">
          <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: '0 0 8px', fontFamily: 'inherit' }}>{aiDraft}</pre>
          <button type="button" className="btn btn-pu btn-sm" style={{ width: '100%', fontSize: 10.5 }} onClick={() => navigator.clipboard?.writeText(aiDraft)}>
            Copy to clipboard
          </button>
        </div>
      )}
      <div style={{ marginTop: 5 }}>
        {lead.followUpDate && (
          <div className="pipe-fup-hint">
            📅 {lead.followUpDate}
            {lead.nextAction ? ` · ${lead.nextAction.slice(0, 28)}${(lead.nextAction?.length || 0) > 28 ? '…' : ''}` : ''}
          </div>
        )}
        <button type="button" className="pipe-fup-btn" onClick={() => setFupOpen(!fupOpen)}>
          📅 {lead.followUpDate ? 'Edit' : 'Set'} Follow-up
        </button>
        {fupOpen && (
          <div className="pipe-fup-form">
            <input type="date" value={fupDate} onChange={(e) => setFupDate(e.target.value)} />
            <input type="text" value={fupAction} onChange={(e) => setFupAction(e.target.value)} placeholder="Next action…" />
            <button
              type="button"
              onClick={() => {
                onUpdate(lead.id, { followUpDate: fupDate, nextAction: fupAction });
                setFupOpen(false);
              }}
            >
              ✓ Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Sales() {
  const leads = useStore((s) => s.leads);
  const customers = useStore((s) => s.customers);
  const updateLead = useStore((s) => s.updateLead);
  const [tab, setTab] = useState<SalesTab>('pipeline');
  const [lostModal, setLostModal] = useState<{ leadId: string; reason: string; note: string } | null>(null);

  const activeLeads = leads.filter((l) => l.stage !== 'Lost' && l.stage !== 'Completed');
  const totalPipelineVal = activeLeads.reduce((s, l) => s + (l.value || 0), 0);
  const weightedForecast = activeLeads.reduce((s, l) => {
    const prob = l.probability ?? STAGE_PROB_V22[l.stage] ?? 10;
    return s + (l.value || 0) * (prob / 100);
  }, 0);
  const confirmedVal = leads.filter((l) => l.stage === 'Confirmed').reduce((s, l) => s + (l.value || 0), 0);

  const listLeads = useMemo(
    () =>
      [...leads]
        .filter((l) => l.stage !== 'Lost')
        .sort((a, b) => {
          const wa = ((a.value || 0) * (a.probability ?? STAGE_PROB_V22[a.stage] ?? 10)) / 100;
          const wb = ((b.value || 0) * (b.probability ?? STAGE_PROB_V22[b.stage] ?? 10)) / 100;
          return wb - wa;
        }),
    [leads]
  );

  function moveStage(leadId: string, newStage: string) {
    if (newStage === 'Lost') {
      const lead = leads.find((l) => l.id === leadId);
      setLostModal({
        leadId,
        reason: (lead?.lostReason as string) || '',
        note: (lead?.lostNote as string) || '',
      });
    } else {
      updateLead(leadId, { stage: newStage, probability: STAGE_PROB_V22[newStage] ?? 10 });
    }
  }

  function saveLostReason() {
    if (!lostModal) return;
    updateLead(lostModal.leadId, {
      stage: 'Lost',
      probability: 0,
      lostReason: lostModal.reason,
      lostNote: lostModal.note,
      lostAt: new Date().toISOString().split('T')[0],
    });
    setLostModal(null);
  }

  return (
    <div>
      <div className="tabs">
        {(
          [
            ['pipeline', 'Pipeline View'],
            ['list', 'List View'],
            ['policy', '📋 Tour Policy & Regulations'],
          ] as const
        ).map(([id, label]) => (
          <div key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)} role="button" tabIndex={0}>
            {label}
          </div>
        ))}
      </div>

      {tab === 'pipeline' && (
        <>
          <div className="pipeline-forecast-bar">
            <div style={{ textAlign: 'center', minWidth: 90 }}>
              <div className="pipeline-forecast-val" style={{ color: 'var(--g)' }}>
                ${fmt(Math.round(confirmedVal))}
              </div>
              <div className="pipeline-forecast-lbl">Confirmed</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 110 }}>
              <div className="pipeline-forecast-val" style={{ color: 'var(--pur)' }}>
                ${fmt(Math.round(weightedForecast))}
              </div>
              <div className="pipeline-forecast-lbl">Weighted Forecast</div>
            </div>
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <div className="pipeline-forecast-val" style={{ color: 'var(--m)' }}>
                ${fmt(Math.round(totalPipelineVal))}
              </div>
              <div className="pipeline-forecast-lbl">Total Pipeline</div>
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--m)' }}>Weighted = stage probability × deal value</span>
          </div>

          <div className="pipeline">
            {STAGES.map((stage) => {
              const stageLeads = leads.filter((l) => l.stage === stage);
              const stageVal = stageLeads.reduce((acc, l) => acc + (l.value || 0), 0);
              return (
                <div className="pipe-col" key={stage}>
                  <div className="pipe-hd">
                    <span>{stage}</span>
                    <span className={`bdg ${STAGE_COLORS[stage] || 'bdg-w'}`}>{stageLeads.length}</span>
                    {stageVal > 0 && <span className="pipe-col-val">${fmt(Math.round(stageVal))}</span>}
                  </div>
                  {stageLeads.map((l) => (
                    <PipeCard
                      key={l.id}
                      lead={l}
                      stage={stage}
                      name={getCustomerName(customers, l.custId)}
                      onStageChange={moveStage}
                      onUpdate={updateLead}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'list' && (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Lead ID</th>
                  <th>Customer</th>
                  <th>Tour</th>
                  <th>Pax</th>
                  <th>Value</th>
                  <th style={{ color: 'var(--pur)' }}>Weighted ▾</th>
                  <th>Travel Date</th>
                  <th>Stage</th>
                  <th>Owner</th>
                  <th>Lost Reason</th>
                </tr>
              </thead>
              <tbody>
                {listLeads.map((l) => {
                  const prob = l.probability ?? STAGE_PROB_V22[l.stage] ?? 10;
                  const weighted = Math.round(((l.value || 0) * prob) / 100);
                  return (
                    <tr key={l.id}>
                      <td>
                        <code style={{ fontSize: 10.5, color: 'var(--g)' }}>{l.id}</code>
                      </td>
                      <td>
                        <b>{getCustomerName(customers, l.custId)}</b>
                      </td>
                      <td style={{ fontSize: 12, maxWidth: 200 }}>{l.tour}</td>
                      <td>{l.pax || '—'}</td>
                      <td style={{ fontWeight: 600, color: 'var(--g)' }}>{l.value > 0 ? `$${fmt(l.value)}` : '—'}</td>
                      <td style={{ fontWeight: 700, color: 'var(--pur)' }}>{weighted > 0 ? `$${fmt(weighted)}` : '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--m)' }}>{l.month || '—'}</td>
                      <td>
                        <span className={`bdg ${STAGE_COLORS[l.stage] || 'bdg-w'}`} style={{ fontSize: 10 }}>
                          {l.stage}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{l.owner || 'Tai Pham'}</td>
                      <td style={{ fontSize: 11.5, color: 'var(--m)' }}>{(l.lostReason as string) || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'policy' && <SalesPolicyView />}

      {lostModal && (
        <div className="overlay open" onClick={() => setLostModal(null)}>
          <div className="modal lost-reason-modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-hd modal-hd-green">
              <div style={{ color: '#fff', fontWeight: 700 }}>Mark Lead as Lost</div>
              <button type="button" className="modal-close-btn" onClick={() => setLostModal(null)}>
                ✕
              </button>
            </div>
            <div style={{ padding: 22 }}>
              <div className="fg">
                <label className="lbl">Lost Reason</label>
                <select value={lostModal.reason} onChange={(e) => setLostModal({ ...lostModal, reason: e.target.value })}>
                  <option value="">— Select reason —</option>
                  {LOST_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Additional Notes</label>
                <textarea value={lostModal.note} onChange={(e) => setLostModal({ ...lostModal, note: e.target.value })} placeholder="Optional context..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn btn-s" type="button" onClick={() => setLostModal(null)}>
                  Cancel
                </button>
                <button className="btn btn-p" type="button" onClick={saveLostReason} disabled={!lostModal.reason}>
                  Confirm Lost
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

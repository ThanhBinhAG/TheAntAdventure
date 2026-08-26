'use client';

import Link from 'next/link';
import { useState } from 'react';
import { STAGE_PROB_V22, fmt, KANBAN_STAGES } from '@/lib/constants';
import { isFollowUpOverdue } from '@/lib/sales/sales-lead-utils';
import type { ListSortField, ListSortState } from '@/lib/sales/sales-lead-utils';
import { outlineStatusLabel } from '@/lib/tour-design/tour-design-lead';
import { useLanguage } from '@/hooks/useLanguage';
import type { Lead } from '@/lib/types';

export const STAGE_SELECT_OPTIONS = [...KANBAN_STAGES, 'Lost'] as const;

export function SalesPolicyView() {
  const { tsf } = useLanguage();

  const bookingItems = [
    ['30%', tsf('deposit30'), 'var(--g)'],
    ['70%', tsf('balance70'), 'var(--g)'],
    ['FX', tsf('fxPolicy'), 'var(--blue)'],
    ['B2B', tsf('b2bCommission'), 'var(--pur)'],
  ] as const;

  const cancellationRows = [
    [tsf('cancel60plus'), tsf('cancelDepositForfeited')],
    [tsf('cancel45to59'), tsf('cancel30pct')],
    [tsf('cancel30to44'), tsf('cancel50pct')],
    [tsf('cancel15to29'), tsf('cancel75pct')],
    [tsf('cancel0to14'), tsf('cancel100pct')],
  ] as const;

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
          {tsf('policyQuickRef')}{' '}
          <Link href="/regulations" style={{ color: 'var(--g)', fontWeight: 600, textDecoration: 'none' }}>
            {tsf('regulationsLink')}
          </Link>
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tsf('bookingPaymentPolicy')}</span>
          </div>
          <div className="card-body">
            <div style={{ fontSize: 12.5, lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {bookingItems.map(([tag, text, bg]) => (
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
            <span className="card-title">{tsf('cancellationPolicy')}</span>
          </div>
          <div className="card-body">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{tsf('noticePeriod')}</th>
                  <th>{tsf('penalty')}</th>
                </tr>
              </thead>
              <tbody>
                {cancellationRows.map(([period, penalty]) => (
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

export function PipeCard({
  lead,
  stage,
  name,
  today,
  onStageChange,
  onUpdate,
  onApproveOutline,
}: {
  lead: Lead & { outlineStatus?: string | null; outlineRevision?: number };
  stage: string;
  name: string;
  today: string;
  onStageChange: (id: string, stage: string) => void;
  onUpdate: (id: string, data: Partial<Lead>) => void;
  onApproveOutline: (lead: Lead) => void;
}) {
  const { tc, tsf, tStage } = useLanguage();
  const [fupOpen, setFupOpen] = useState(false);
  const [fupDate, setFupDate] = useState(lead.followUpDate || '');
  const [fupAction, setFupAction] = useState(lead.nextAction || '');
  const [aiOpen, setAiOpen] = useState(false);

  const prob = lead.probability ?? STAGE_PROB_V22[stage] ?? 10;
  const weighted = Math.round(((lead.value || 0) * prob) / 100);
  const overdue = isFollowUpOverdue(lead, today);
  const outlineStatus = lead.outlineStatus ?? null;
  const outlineWaiting = outlineStatus === 'sent';

  const firstName = name.split(' ')[0] || name;
  const travelWhen = lead.month || tsf('preferredDates');
  const aiDraft = `${tsf('aiEmailGreeting')} ${firstName},

${tsf('aiEmailThanks')} "${lead.tour}". ${tsf('aiEmailPreparing')} ${lead.pax} ${tsf('aiEmailGuests')} ${travelWhen}.

${tsf('aiEmailFollowUp')}

${tsf('aiEmailRegards')}
Tai Pham
${tsf('aiEmailSignature')}`;

  return (
    <div
      className={`pipe-card${overdue ? ' pipe-card-overdue' : ''}${outlineWaiting ? ' pipe-card-outline-waiting' : ''}`}
      style={{
        borderLeft: stage === 'Confirmed' ? '3px solid var(--g)' : stage === 'Negotiation' ? '3px solid var(--amb)' : undefined,
      }}
      title={`${lead.tour} | ${lead.pax} ${tsf('paxSuffix')} | ${lead.month}`}
    >
      <div className="pname">{name}</div>
      {outlineStatus && (
        <div style={{ fontSize: 10.5, marginTop: 4 }}>
          <span className={`bdg ${outlineStatus === 'approved' ? 'bdg-g' : outlineStatus === 'sent' ? 'bdg-a' : 'bdg-w'}`}>
            Outline: {outlineStatusLabel(outlineStatus)}
            {(lead.outlineRevision ?? 0) > 0 ? ` v${lead.outlineRevision}` : ''}
          </span>
        </div>
      )}
      <div className="pmeta">
        {Number(lead.pax) > 0 ? `${lead.pax} ${tsf('paxSuffix')} · ` : ''}
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
          {STAGE_SELECT_OPTIONS.map((st) => (
            <option key={st} value={st}>
              {tStage(st)}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Link
          href={`/tourdesign?leadId=${encodeURIComponent(lead.id)}&custId=${encodeURIComponent(lead.custId)}&step=1`}
          className="btn btn-s btn-sm"
          style={{ fontSize: 10.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          Open outline
        </Link>
        {outlineWaiting && (
          <button
            type="button"
            className="btn btn-p btn-sm"
            style={{ fontSize: 10.5 }}
            onClick={(e) => {
              e.stopPropagation();
              onApproveOutline(lead);
            }}
          >
            Mark approved
          </button>
        )}
      </div>
      <div style={{ marginTop: 6 }}>
        <button type="button" className="pipe-ai-btn" onClick={() => setAiOpen(!aiOpen)}>
          ✉ {tc('aiDraftEmail')}
        </button>
      </div>
      {aiOpen && (
        <div className="pipe-ai-panel">
          <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: '0 0 8px', fontFamily: 'inherit' }}>{aiDraft}</pre>
          <button type="button" className="btn btn-pu btn-sm" style={{ width: '100%', fontSize: 10.5 }} onClick={() => navigator.clipboard?.writeText(aiDraft)}>
            {tc('copyToClipboard')}
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
          📅 {lead.followUpDate ? tc('editFollowUp') : tc('setFollowUp')}
        </button>
        {fupOpen && (
          <div className="pipe-fup-form">
            <input type="date" value={fupDate} onChange={(e) => setFupDate(e.target.value)} />
            <input type="text" value={fupAction} onChange={(e) => setFupAction(e.target.value)} placeholder={`${tc('nextAction')}…`} />
            <button
              type="button"
              onClick={() => {
                onUpdate(lead.id, { followUpDate: fupDate, nextAction: fupAction });
                setFupOpen(false);
              }}
            >
              ✓ {tc('save')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ListFollowUpCell({
  lead,
  today,
  onUpdate,
}: {
  lead: Lead;
  today: string;
  onUpdate: (id: string, data: Partial<Lead>) => void;
}) {
  const { tc } = useLanguage();
  const [open, setOpen] = useState(false);
  const [fupDate, setFupDate] = useState(lead.followUpDate || '');
  const [fupAction, setFupAction] = useState(lead.nextAction || '');
  const overdue = isFollowUpOverdue(lead, today);
  const hasDate = Boolean(lead.followUpDate);

  return (
    <td className={`sales-list-fup${overdue ? ' is-overdue' : ''}${open ? ' is-open' : ''}`}>
      <div className="sales-list-fup-row">
        <span className="sales-list-fup-date" title={lead.nextAction || undefined}>
          {lead.followUpDate || '—'}
        </span>
        <button
          type="button"
          className="sales-list-fup-link"
          onClick={() => {
            setFupDate(lead.followUpDate || '');
            setFupAction(lead.nextAction || '');
            setOpen((v) => !v);
          }}
        >
          {hasDate ? tc('editFollowUp') : tc('setFollowUp')}
        </button>
      </div>
      {lead.nextAction && !open ? (
        <div className="sales-list-fup-hint" title={lead.nextAction}>
          {lead.nextAction}
        </div>
      ) : null}
      {open && (
        <div className="sales-list-fup-popover" role="dialog" aria-label={tc('setFollowUp')}>
          <input type="date" value={fupDate} onChange={(e) => setFupDate(e.target.value)} />
          <input
            type="text"
            value={fupAction}
            onChange={(e) => setFupAction(e.target.value)}
            placeholder={`${tc('nextAction')}…`}
          />
          <div className="sales-list-fup-actions">
            <button type="button" className="btn btn-s btn-sm" onClick={() => setOpen(false)}>
              {tc('cancel')}
            </button>
            <button
              type="button"
              className="btn btn-p btn-sm"
              onClick={() => {
                onUpdate(lead.id, { followUpDate: fupDate, nextAction: fupAction });
                setOpen(false);
              }}
            >
              {tc('save')}
            </button>
          </div>
        </div>
      )}
    </td>
  );
}

export function SortableTh({
  field,
  label,
  listSort,
  onSort,
  style,
}: {
  field: ListSortField;
  label: string;
  listSort: ListSortState;
  onSort: (field: ListSortField) => void;
  style?: React.CSSProperties;
}) {
  const indicator = listSort.field === field ? (listSort.direction === 'asc' ? ' ▴' : ' ▾') : '';
  return (
    <th className="sortable" style={style} onClick={() => onSort(field)}>
      {label}
      {indicator}
    </th>
  );
}

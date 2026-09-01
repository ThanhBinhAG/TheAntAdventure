'use client';

import { useLanguage } from '@/hooks/useLanguage';
import {
  formatOutlineTimestamp,
} from '@/lib/tour-design/tour-design-lead';
import type { OutlineStatus } from '@/lib/types';
import type { TOUR_DESIGNKey } from '@/lib/i18n/pages/tour-design';

interface Props {
  outlineStatus: OutlineStatus;
  outlineSentAt?: string;
  outlineApprovedAt?: string;
  outlineRevision?: number;
  outlineNotes: string;
  onNotesChange: (notes: string) => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  onMarkSent: () => void;
  onApprove: () => void;
  onRevise: () => void;
  onResend: () => void;
  canWrite?: boolean;
}

const STATUS_LABEL_KEYS: Record<OutlineStatus, TOUR_DESIGNKey> = {
  draft: 'outlineStatusDraft',
  sent: 'outlineStatusSent',
  approved: 'outlineStatusApproved',
};

export default function OutlineWorkflowPanel({
  outlineStatus,
  outlineSentAt,
  outlineApprovedAt,
  outlineRevision = 0,
  outlineNotes,
  onNotesChange,
  saveState,
  onMarkSent,
  onApprove,
  onRevise,
  onResend,
  canWrite = true,
}: Props) {
  const { tp, tpl } = useLanguage();
  const canSend = outlineStatus === 'draft' && outlineRevision === 0;
  const canResend = outlineStatus === 'draft' && outlineRevision >= 1;
  const canApprove = outlineStatus === 'sent';
  const canRevise = outlineStatus === 'sent';

  return (
    <div className="outline-workflow-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gd)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          {tp('tour-design', 'outlineWorkflowTitle')}
        </div>
        <span style={{ fontSize: 11, color: 'var(--m)' }}>
          {saveState === 'saving' && tp('tour-design', 'outlineSaving')}
          {saveState === 'saved' && tp('tour-design', 'outlineSaved')}
          {saveState === 'error' && tp('tour-design', 'outlineSaveFailed')}
        </span>
      </div>

      <div className="outline-workflow-timeline">
        <span className={`outline-wf-step${outlineStatus === 'draft' ? ' on' : ' done'}`}>
          {tp('tour-design', 'outlineStatusDraft')}
        </span>
        <span className="outline-wf-arrow">→</span>
        <span className={`outline-wf-step${outlineStatus === 'sent' ? ' on' : outlineStatus === 'approved' ? ' done' : ''}`}>
          {tp('tour-design', 'outlineStatusSent')}
          {outlineSentAt ? ` (${formatOutlineTimestamp(outlineSentAt)})` : ''}
          {outlineRevision > 0 ? ` · v${outlineRevision}` : ''}
        </span>
        <span className="outline-wf-arrow">→</span>
        <span className={`outline-wf-step${outlineStatus === 'approved' ? ' on' : ''}`}>
          {tp('tour-design', 'outlineStatusApproved')}
          {outlineApprovedAt ? ` (${formatOutlineTimestamp(outlineApprovedAt)})` : ''}
        </span>
      </div>

      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <label className="lbl" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
          {tp('tour-design', 'outlineInternalNotes')}
        </label>
        <textarea
          rows={2}
          value={outlineNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder={tp('tour-design', 'outlineNotesPlaceholder')}
          style={{ width: '100%', fontSize: 12 }}
          disabled={!canWrite}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {canSend && (
          <button className="btn btn-p btn-sm" type="button" onClick={onMarkSent} disabled={!canWrite}>
            {tp('tour-design', 'outlineMarkSent')}
          </button>
        )}
        {canResend && (
          <button className="btn btn-p btn-sm" type="button" onClick={onResend} disabled={!canWrite}>
            {tpl('tour-design', 'outlineResend', { version: (outlineRevision ?? 0) + 1 })}
          </button>
        )}
        {canApprove && (
          <button className="btn btn-p btn-sm" type="button" onClick={onApprove} disabled={!canWrite}>
            {tp('tour-design', 'outlineApprove')}
          </button>
        )}
        {canRevise && (
          <button className="btn btn-s btn-sm" type="button" onClick={onRevise} disabled={!canWrite}>
            {tp('tour-design', 'outlineRevise')}
          </button>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 8 }}>
        {tp('tour-design', 'outlineStatusLabel')} <strong>{tp('tour-design', STATUS_LABEL_KEYS[outlineStatus])}</strong>
        {outlineStatus !== 'approved' && (
          <span>{tp('tour-design', 'outlineApprovalHint')}</span>
        )}
      </div>
    </div>
  );
}

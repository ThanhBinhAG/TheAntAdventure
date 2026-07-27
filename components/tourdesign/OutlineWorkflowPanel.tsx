'use client';

import {
  formatOutlineTimestamp,
  outlineStatusLabel,
} from '@/lib/tour-design-lead';
import type { OutlineStatus } from '@/lib/types';

interface Props {
  outlineStatus: OutlineStatus;
  outlineSentAt?: string;
  outlineApprovedAt?: string;
  outlineRevision?: number;
  outlineNotes: string;
  onNotesChange: (notes: string) => void;
  saveState: 'idle' | 'saving' | 'saved';
  onMarkSent: () => void;
  onApprove: () => void;
  onRevise: () => void;
  onResend: () => void;
}

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
}: Props) {
  const canSend = outlineStatus === 'draft' && outlineRevision === 0;
  const canResend = outlineStatus === 'draft' && outlineRevision >= 1;
  const canApprove = outlineStatus === 'sent';
  const canRevise = outlineStatus === 'sent' || outlineStatus === 'approved';

  return (
    <div className="outline-workflow-panel">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gd)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Outline workflow
        </div>
        <span style={{ fontSize: 11, color: 'var(--m)' }}>
          {saveState === 'saving' && 'Saving…'}
          {saveState === 'saved' && 'Saved'}
        </span>
      </div>

      <div className="outline-workflow-timeline">
        <span className={`outline-wf-step${outlineStatus === 'draft' ? ' on' : ' done'}`}>
          Draft
        </span>
        <span className="outline-wf-arrow">→</span>
        <span className={`outline-wf-step${outlineStatus === 'sent' ? ' on' : outlineStatus === 'approved' ? ' done' : ''}`}>
          Sent{outlineSentAt ? ` (${formatOutlineTimestamp(outlineSentAt)})` : ''}
          {outlineRevision > 0 ? ` · v${outlineRevision}` : ''}
        </span>
        <span className="outline-wf-arrow">→</span>
        <span className={`outline-wf-step${outlineStatus === 'approved' ? ' on' : ''}`}>
          Approved{outlineApprovedAt ? ` (${formatOutlineTimestamp(outlineApprovedAt)})` : ''}
        </span>
      </div>

      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <label className="lbl" style={{ fontSize: 11, marginBottom: 4, display: 'block' }}>
          Internal notes
        </label>
        <textarea
          rows={2}
          value={outlineNotes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Client feedback, revision requests, call notes…"
          style={{ width: '100%', fontSize: 12 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {canSend && (
          <button className="btn btn-p btn-sm" type="button" onClick={onMarkSent}>
            Mark sent to client
          </button>
        )}
        {canResend && (
          <button className="btn btn-p btn-sm" type="button" onClick={onResend}>
            Resend to client (v{(outlineRevision ?? 0) + 1})
          </button>
        )}
        {canApprove && (
          <button className="btn btn-p btn-sm" type="button" onClick={onApprove}>
            Client approved outline
          </button>
        )}
        {canRevise && (
          <button className="btn btn-s btn-sm" type="button" onClick={onRevise}>
            Revise outline
          </button>
        )}
      </div>

      <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 8 }}>
        Status: <strong>{outlineStatusLabel(outlineStatus)}</strong>
        {outlineStatus !== 'approved' && (
          <span> — Tour Experiences unlocks after client approval.</span>
        )}
      </div>
    </div>
  );
}

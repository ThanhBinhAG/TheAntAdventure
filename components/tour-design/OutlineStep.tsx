'use client';

import { useMemo, useState } from 'react';
import { buildOutlineHTML, fmtOutlineDate, outlineDocFromRows } from '@/lib/outline/outline-html';
import OutlineRichCell from '@/components/tour-design/OutlineRichCell';
import OutlineWorkflowPanel from '@/components/tour-design/OutlineWorkflowPanel';
import type { OutlineStatus } from '@/lib/types';
import type { TourOutlineDay } from '@/lib/types';

interface Props {
  outlineRows: TourOutlineDay[];
  outlineStatus: OutlineStatus;
  outlineSentAt?: string;
  outlineApprovedAt?: string;
  outlineRevision?: number;
  outlineNotes: string;
  onOutlineNotesChange: (notes: string) => void;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  clientName?: string;
  onUpdateRow: (id: string, patch: Partial<TourOutlineDay>) => void;
  onAddDay: () => void;
  onRemoveDay: (id: string) => void;
  onPrint: () => void;
  onMarkSent: () => void;
  onApprove: () => void;
  onRevise: () => void;
  onResend: () => void;
  onBack: () => void;
  onNext: () => void;
  canWrite?: boolean;
}

const STATUS_BADGE: Record<OutlineStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: ' bdg-a' },
  sent: { label: 'Sent', className: ' bdg-b' },
  approved: { label: 'Approved', className: ' bdg-g' },
};

export default function OutlineStep({
  outlineRows,
  outlineStatus,
  outlineSentAt,
  outlineApprovedAt,
  outlineRevision,
  outlineNotes,
  onOutlineNotesChange,
  saveState,
  clientName,
  onUpdateRow,
  onAddDay,
  onRemoveDay,
  onPrint,
  onMarkSent,
  onApprove,
  onRevise,
  onResend,
  onBack,
  onNext,
  canWrite = true,
}: Props) {
  const [showPreview, setShowPreview] = useState(true);
  const sorted = [...outlineRows].sort((a, b) => a.dayNumber - b.dayNumber);
  const badge = STATUS_BADGE[outlineStatus] ?? STATUS_BADGE.draft;
  const hasRows = sorted.length > 0;

  const previewHtml = useMemo(() => {
    if (!hasRows) return '';
    return buildOutlineHTML(outlineDocFromRows(sorted, clientName));
  }, [sorted, clientName, hasRows]);

  return (
    <div className="card">
      <div className="card-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span className="card-title">Outline — Day plan for client review</span>
        <span className={`bdg${badge.className}`} style={{ fontSize: 11 }}>
          {badge.label}
        </span>
      </div>
      <div className="card-body">
        <p className="outline-intro">
          Build the day-by-day route below. The editor mirrors the guest PDF layout — cyan header, same columns.
        </p>

        {hasRows && (
          <OutlineWorkflowPanel
            outlineStatus={outlineStatus}
            outlineSentAt={outlineSentAt}
            outlineApprovedAt={outlineApprovedAt}
            outlineRevision={outlineRevision}
            outlineNotes={outlineNotes}
            onNotesChange={onOutlineNotesChange}
            saveState={saveState}
            onMarkSent={onMarkSent}
            onApprove={onApprove}
            onRevise={onRevise}
            onResend={onResend}
            canWrite={canWrite}
          />
        )}

        <div className="outline-editor-panel">
          <div className="outline-editor-toolbar">
            <span className="outline-editor-label">Itinerary editor</span>
            <span className="outline-editor-hint">{sorted.length} day{sorted.length === 1 ? '' : 's'}</span>
          </div>

          <div className="outline-table-wrap outline-editor-wrap">
            <fieldset disabled={!canWrite} style={{ border: 'none', padding: 0, margin: 0 }}>
              <table className="outline-editor-table">
                <thead>
                  <tr>
                    <th className="outline-col-day">DAY</th>
                    <th className="outline-col-date">DATE</th>
                    <th className="outline-col-location">LOCATION</th>
                    <th className="outline-col-itinerary">ITINERARY</th>
                    <th className="outline-col-hotels">HOTELS</th>
                    <th className="outline-col-actions" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="outline-empty-cell">
                        No days yet — click <strong>+ Add day</strong> to start.
                      </td>
                    </tr>
                  ) : (
                    sorted.map((row, i) => (
                      <tr key={row.id} className={i % 2 === 1 ? 'outline-row-alt' : undefined}>
                        <td className="outline-day-cell">
                          <span className="outline-day-label">Day {row.dayNumber}</span>
                        </td>
                        <td>
                          <input
                            type="date"
                            className="outline-cell-input outline-date-input"
                            value={row.date || ''}
                            title={row.date ? fmtOutlineDate(row.date) : 'Select date'}
                            onChange={(e) => onUpdateRow(row.id, { date: e.target.value })}
                          />
                          {row.date && <span className="outline-date-hint">{fmtOutlineDate(row.date)}</span>}
                        </td>
                        <td>
                          <textarea
                            className="outline-cell-input outline-location-input"
                            value={row.location || ''}
                            placeholder="Hoian - Hue"
                            rows={2}
                            onChange={(e) => onUpdateRow(row.id, { location: e.target.value })}
                          />
                        </td>
                        <td className="outline-rich-td">
                          <OutlineRichCell
                            value={row.activities || ''}
                            placeholder="Pick up, transfer, activities, notes…"
                            minRows={4}
                            onChange={(html) => onUpdateRow(row.id, { activities: html })}
                            disabled={!canWrite}
                          />
                        </td>
                        <td className="outline-rich-td">
                          <OutlineRichCell
                            value={row.hotels || ''}
                            placeholder="Hotel name - room type"
                            minRows={4}
                            onChange={(html) => onUpdateRow(row.id, { hotels: html })}
                            disabled={!canWrite}
                          />
                        </td>
                        <td className="outline-actions-cell">
                          <button
                            className="outline-remove-btn"
                            type="button"
                            title="Remove day"
                            onClick={() => onRemoveDay(row.id)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </fieldset>
          </div>
        </div>

        {hasRows && (
          <div className="outline-preview-panel">
            <button
              type="button"
              className="outline-preview-toggle"
              onClick={() => setShowPreview((v) => !v)}
              aria-expanded={showPreview}
            >
              <span>Guest preview (as PDF)</span>
              <span className="outline-preview-chevron">{showPreview ? '▾' : '▸'}</span>
            </button>
            {showPreview && (
              <div className="outline-preview-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            )}
          </div>
        )}

        <div className="outline-actions-bar">
          <button className="btn btn-s btn-sm" type="button" onClick={onAddDay} disabled={!canWrite}>
            + Add day
          </button>
          {hasRows && (
            <button className="btn btn-s btn-sm" type="button" onClick={onPrint}>
              Print / Save PDF
            </button>
          )}
          {hasRows && (
            <span className="outline-print-tip">
              Tip: In the print dialog, disable <strong>Headers and footers</strong> for a clean page.
            </span>
          )}
        </div>

      </div>

      <div className="td-nav" style={{ padding: '0 16px 16px' }}>
        <button className="btn btn-s" type="button" onClick={onBack}>
          ← Back
        </button>
        <button className="btn btn-p" type="button" onClick={onNext} disabled={!canWrite}>
          Next: Tour Experiences →
        </button>
      </div>
    </div>
  );
}

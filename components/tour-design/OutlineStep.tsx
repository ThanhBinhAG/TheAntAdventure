'use client';

import { useMemo, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { buildOutlineHTML, fmtOutlineDate, outlineDocFromRows } from '@/lib/outline/outline-html';
import OutlineRichCell from '@/components/tour-design/OutlineRichCell';
import OutlineWorkflowPanel from '@/components/tour-design/OutlineWorkflowPanel';
import type { OutlineStatus } from '@/lib/types';
import type { TourOutlineDay } from '@/lib/types';
import type { TOUR_DESIGNKey } from '@/lib/i18n/pages/tour-design';

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

const STATUS_BADGE_KEYS: Record<OutlineStatus, { key: TOUR_DESIGNKey; className: string }> = {
  draft: { key: 'outlineStatusDraft', className: ' bdg-a' },
  sent: { key: 'outlineStatusSent', className: ' bdg-b' },
  approved: { key: 'outlineStatusApproved', className: ' bdg-g' },
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
  const { tp, tpl } = useLanguage();
  const [showPreview, setShowPreview] = useState(true);
  const sorted = [...outlineRows].sort((a, b) => a.dayNumber - b.dayNumber);
  const badge = STATUS_BADGE_KEYS[outlineStatus] ?? STATUS_BADGE_KEYS.draft;
  const hasRows = sorted.length > 0;

  const previewHtml = useMemo(() => {
    if (!hasRows) return '';
    return buildOutlineHTML(outlineDocFromRows(sorted, clientName));
  }, [sorted, clientName, hasRows]);

  return (
    <div className="card">
      <div className="card-hd" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span className="card-title">{tp('tour-design', 'outlineTitle')}</span>
        <span className={`bdg${badge.className}`} style={{ fontSize: 11 }}>
          {tp('tour-design', badge.key)}
        </span>
      </div>
      <div className="card-body">
        <p className="outline-intro">{tp('tour-design', 'outlineIntro')}</p>

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
            <span className="outline-editor-label">{tp('tour-design', 'outlineEditorLabel')}</span>
            <span className="outline-editor-hint">
              {sorted.length === 1
                ? tpl('tour-design', 'outlineDayCount', { count: sorted.length })
                : tpl('tour-design', 'outlineDayCountPlural', { count: sorted.length })}
            </span>
          </div>

          <div className="outline-table-wrap outline-editor-wrap">
            <fieldset disabled={!canWrite} style={{ border: 'none', padding: 0, margin: 0 }}>
              <table className="outline-editor-table">
                <thead>
                  <tr>
                    <th className="outline-col-day">{tp('tour-design', 'outlineColDay')}</th>
                    <th className="outline-col-date">{tp('tour-design', 'outlineColDate')}</th>
                    <th className="outline-col-location">{tp('tour-design', 'outlineColLocation')}</th>
                    <th className="outline-col-itinerary">{tp('tour-design', 'outlineColItinerary')}</th>
                    <th className="outline-col-hotels">{tp('tour-design', 'outlineColHotels')}</th>
                    <th className="outline-col-actions" aria-label={tp('tour-design', 'outlineColActions')} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="outline-empty-cell">
                        {tp('tour-design', 'outlineEmpty')}
                      </td>
                    </tr>
                  ) : (
                    sorted.map((row, i) => (
                      <tr key={row.id} className={i % 2 === 1 ? 'outline-row-alt' : undefined}>
                        <td className="outline-day-cell">
                          <span className="outline-day-label">{tpl('tour-design', 'outlineDayLabel', { n: row.dayNumber })}</span>
                        </td>
                        <td>
                          <input
                            type="date"
                            className="outline-cell-input outline-date-input"
                            value={row.date || ''}
                            title={row.date ? fmtOutlineDate(row.date) : tp('tour-design', 'outlineSelectDate')}
                            onChange={(e) => onUpdateRow(row.id, { date: e.target.value })}
                          />
                          {row.date && <span className="outline-date-hint">{fmtOutlineDate(row.date)}</span>}
                        </td>
                        <td>
                          <textarea
                            className="outline-cell-input outline-location-input"
                            value={row.location || ''}
                            placeholder={tp('tour-design', 'outlineLocationPlaceholder')}
                            rows={2}
                            onChange={(e) => onUpdateRow(row.id, { location: e.target.value })}
                          />
                        </td>
                        <td className="outline-rich-td">
                          <OutlineRichCell
                            value={row.activities || ''}
                            placeholder={tp('tour-design', 'outlineActivitiesPlaceholder')}
                            minRows={4}
                            onChange={(html) => onUpdateRow(row.id, { activities: html })}
                            disabled={!canWrite}
                          />
                        </td>
                        <td className="outline-rich-td">
                          <OutlineRichCell
                            value={row.hotels || ''}
                            placeholder={tp('tour-design', 'outlineHotelsPlaceholder')}
                            minRows={4}
                            onChange={(html) => onUpdateRow(row.id, { hotels: html })}
                            disabled={!canWrite}
                          />
                        </td>
                        <td className="outline-actions-cell">
                          <button
                            className="outline-remove-btn"
                            type="button"
                            title={tp('tour-design', 'outlineRemoveDay')}
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
              <span>{tp('tour-design', 'outlineGuestPreview')}</span>
              <span className="outline-preview-chevron">{showPreview ? '▾' : '▸'}</span>
            </button>
            {showPreview && (
              <div className="outline-preview-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            )}
          </div>
        )}

        <div className="outline-actions-bar">
          <button className="btn btn-s btn-sm" type="button" onClick={onAddDay} disabled={!canWrite}>
            {tp('tour-design', 'outlineAddDay')}
          </button>
          {hasRows && (
            <button className="btn btn-s btn-sm" type="button" onClick={onPrint}>
              {tp('tour-design', 'exportPrintSavePdf')}
            </button>
          )}
          {hasRows && (
            <span className="outline-print-tip">{tp('tour-design', 'outlinePrintTip')}</span>
          )}
        </div>

      </div>

      <div className="td-nav" style={{ padding: '0 16px 16px' }}>
        <button className="btn btn-s" type="button" onClick={onBack}>
          {tp('tour-design', 'outlineBack')}
        </button>
        <button className="btn btn-p" type="button" onClick={onNext} disabled={!canWrite}>
          {tp('tour-design', 'outlineNextExperiences')}
        </button>
      </div>
    </div>
  );
}

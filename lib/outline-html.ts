/** Shared palette — matches Material/OUTLINE TO SEND TO GUESTS.pdf */
export const OUTLINE_HEADER_BG = '#00CCFF';
export const OUTLINE_BORDER = '#BFBFBF';
export const OUTLINE_TEXT = '#000000';
export const OUTLINE_BODY_BG = '#FFFFFF';
export const OUTLINE_ROW_ALT = '#F7F9FA';

export type OutlineRow = {
  dayNumber: number;
  date?: string;
  location?: string;
  activities?: string;
  hotels?: string;
};

export type OutlineDoc = {
  clientName?: string;
  rows: OutlineRow[];
};

export function fmtOutlineDate(iso?: string): string {
  if (!iso?.trim()) return '';
  const trimmed = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const [y, m, d] = trimmed.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

import { outlineCellHtml } from './outline-rich-text';
import { openPrintWindow } from './print-window';

const thStyle = `padding:7px 8px;border:1px solid ${OUTLINE_BORDER};text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;background:${OUTLINE_HEADER_BG};color:${OUTLINE_TEXT};-webkit-print-color-adjust:exact;print-color-adjust:exact`;

const tdStyle = `padding:7px 8px;border:1px solid ${OUTLINE_BORDER};vertical-align:top;font-size:11px;color:${OUTLINE_TEXT};background:${OUTLINE_BODY_BG};line-height:1.45`;

export function buildOutlineHTML(doc: OutlineDoc, forPrint = false): string {
  const sorted = [...doc.rows].sort((a, b) => a.dayNumber - b.dayNumber);

  const rows = sorted
    .map(
      (row, i) => `
    <tr style="page-break-inside:avoid">
      <td style="${tdStyle};font-weight:700;white-space:nowrap;background:${i % 2 === 1 ? OUTLINE_ROW_ALT : OUTLINE_BODY_BG}"><strong>Day ${row.dayNumber}</strong></td>
      <td style="${tdStyle};white-space:nowrap;background:${i % 2 === 1 ? OUTLINE_ROW_ALT : OUTLINE_BODY_BG}">${outlineCellHtml(fmtOutlineDate(row.date))}</td>
      <td style="${tdStyle};background:${i % 2 === 1 ? OUTLINE_ROW_ALT : OUTLINE_BODY_BG}">${outlineCellHtml(row.location)}</td>
      <td style="${tdStyle};background:${i % 2 === 1 ? OUTLINE_ROW_ALT : OUTLINE_BODY_BG}">${outlineCellHtml(row.activities)}</td>
      <td style="${tdStyle};background:${i % 2 === 1 ? OUTLINE_ROW_ALT : OUTLINE_BODY_BG}">${outlineCellHtml(row.hotels)}</td>
    </tr>`
    )
    .join('');

  const printStyles = forPrint
    ? `<style>
  @page { size: landscape; margin: 8mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { height: 100%; }
  body { font-family: Calibri, Arial, Helvetica, sans-serif; font-size: 11px; color: ${OUTLINE_TEXT}; margin: 0; padding: 0; }
  table { border-collapse: collapse; width: 100%; }
  b, strong { font-weight: 700; }
  i, em { font-style: italic; }
  u { text-decoration: underline; }
</style>`
    : '';

  return `${printStyles}
<div class="outline-guest-doc" style="font-family:Calibri,Arial,Helvetica,sans-serif;font-size:11px;color:${OUTLINE_TEXT};max-width:100%">
  <div style="text-align:center;font-weight:700;font-size:13px;margin-bottom:14px;letter-spacing:0.2px;text-transform:uppercase">
    OUTLINE TO SEND TO GUESTS
  </div>
  <table style="border-collapse:collapse;width:100%;table-layout:fixed;border:1px solid ${OUTLINE_BORDER}">
    <colgroup>
      <col style="width:6%" />
      <col style="width:10%" />
      <col style="width:13%" />
      <col style="width:46%" />
      <col style="width:25%" />
    </colgroup>
    <thead>
      <tr>
        <th style="${thStyle}">DAY</th>
        <th style="${thStyle}">DATE</th>
        <th style="${thStyle}">LOCATION</th>
        <th style="${thStyle}">ITINERARY</th>
        <th style="${thStyle}">HOTELS</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="5" style="${tdStyle};text-align:center;color:#666">No days in outline</td></tr>`}
    </tbody>
  </table>
</div>`;
}

export function printOutline(doc: OutlineDoc): void {
  const bodyHtml = buildOutlineHTML(doc, true);
  openPrintWindow(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title></title></head><body>${bodyHtml}</body></html>`
  );
}

export function outlineDocFromRows(
  rows: { dayNumber: number; date?: string; location?: string; activities?: string; hotels?: string }[],
  clientName?: string
): OutlineDoc {
  return {
    clientName,
    rows: rows.map((r) => ({
      dayNumber: r.dayNumber,
      date: r.date,
      location: r.location,
      activities: r.activities,
      hotels: r.hotels,
    })),
  };
}

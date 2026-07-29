import { openPrintWindow } from '../core/print-window';
import type { PricingTableRow } from '../products/product-pricing-helpers';
import type { PricingExportOptions } from './pricing-export';
import { paxColumnLabel } from './pricing-export';
import {
  ICO_KEYS,
  ICO_LABELS,
  type PlCurrency,
  fmtPx,
  getCostUSD,
  getSpUSD,
  mkPct,
} from './pricing-utils';

const PAX_TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const BRAND = '#2E7D52';
const BRAND_DARK = '#1a5c38';
const MUTED = '#6B7F74';
const BORDER = '#E2E8E4';

export interface PricingHtmlMeta extends PricingExportOptions {
  logoUrl?: string;
  filterSummary?: string;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function thCell(text: string, align: 'left' | 'right' | 'center' = 'left', bg = BRAND): string {
  return `<th style="padding:5px 7px;border:1px solid ${BORDER};text-align:${align};font-weight:700;font-size:9px;background:${bg};color:#fff;white-space:nowrap">${esc(text)}</th>`;
}

function tdCell(text: string, opts?: { align?: string; bg?: string; bold?: boolean }): string {
  const align = opts?.align || 'left';
  const bg = opts?.bg || '#fff';
  const weight = opts?.bold ? 'font-weight:700;' : '';
  return `<td style="padding:4px 6px;border:1px solid ${BORDER};font-size:9px;${weight}text-align:${align};background:${bg};vertical-align:top">${text}</td>`;
}

function inclSummary(row: PricingTableRow): string {
  return ICO_KEYS.map((k, j) => (row.pricing.incl[k] ? ICO_LABELS[j][0] : '—')).join('/');
}

function buildTableBody(rows: PricingTableRow[], currency: PlCurrency, showCost: boolean): string {
  return rows
    .map((t, i) => {
      const bg = i % 2 === 0 ? '#fff' : '#FAFBF9';
      const paxCells = PAX_TIERS.map((n) => {
        const sp = getSpUSD(t.pricing, n);
        const co = getCostUSD(t.pricing, n);
        const mk = mkPct(sp, co);
        const sellBg = n === 1 ? '#FFFBF2' : n === 10 ? '#F3FAF6' : bg;
        let inner = `<span style="font-weight:700;color:${n === 1 ? '#D97706' : '#2E7D52'}">${esc(fmtPx(sp, currency))}</span>`;
        if (showCost && sp && co) {
          inner += `<div style="font-size:8px;color:#9CA3AF;margin-top:1px">C: ${esc(fmtPx(co, currency))} · ${mk}%</div>`;
        }
        return tdCell(inner, { align: 'right', bg: sellBg });
      }).join('');

      return `<tr>
        ${tdCell(`<code style="font-size:8.5px">${esc(t.productCode)}</code>`, { bg })}
        ${tdCell(esc(t.name), { bg })}
        ${tdCell(esc(t.duration), { bg })}
        ${tdCell(esc(t.region), { bg })}
        ${tdCell(esc(t.category), { bg })}
        ${tdCell(esc(inclSummary(t)), { align: 'center', bg })}
        ${paxCells}
      </tr>`;
    })
    .join('');
}

export function buildPricingHTML(
  rows: PricingTableRow[],
  meta: PricingHtmlMeta,
  origin = ''
): string {
  const logoUrl = meta.logoUrl?.startsWith('http')
    ? meta.logoUrl
    : `${origin.replace(/\/$/, '')}${meta.logoUrl || '/Logo-3.svg'}`;

  const exported = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const paxHeaders = PAX_TIERS.map((n) => thCell(paxColumnLabel(n), 'right', n === 1 ? '#D97706' : n === 10 ? BRAND_DARK : BRAND)).join('');

  const filterLine = meta.filterSummary
    ? `<div style="font-size:10px;color:${MUTED};margin-top:4px">${esc(meta.filterSummary)}</div>`
    : '';

  const body = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div>
        <img src="${esc(logoUrl)}" alt="The Ant Adventures" style="height:44px;margin-bottom:6px" />
        <div style="font-size:16px;font-weight:700;color:${BRAND_DARK}">Price List by Pax — 2026</div>
        <div style="font-size:10px;color:${MUTED}">${rows.length} products · ${meta.currency} · Exported ${exported}${meta.showCost ? ' · incl. cost' : ''}</div>
        ${filterLine}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          ${thCell('Tour ID')}
          ${thCell('Tour Name')}
          ${thCell('Duration')}
          ${thCell('Region')}
          ${thCell('Category')}
          ${thCell('Incl.', 'center')}
          ${paxHeaders}
        </tr>
      </thead>
      <tbody>
        ${buildTableBody(rows, meta.currency, meta.showCost)}
      </tbody>
    </table>
    <div style="margin-top:10px;font-size:9px;color:${MUTED};text-align:center">The Ant Adventures · Confidential internal price list</div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>TAA Price List 2026 — ${esc(meta.currency)}</title>
<style>
  @page { size: A4 landscape; margin: 10mm 8mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  body { font-family: Calibri, 'DM Sans', Arial, Helvetica, sans-serif; font-size: 10px; color: #1a2e23; line-height: 1.4; margin: 0; padding: 0; }
  table { border-collapse: collapse; }
  code { font-family: Consolas, monospace; }
</style>
</head>
<body>
<div style="padding:4px 0">${body}</div>
</body>
</html>`;
}

export function printPricing(
  rows: PricingTableRow[],
  meta: PricingHtmlMeta,
  origin = ''
): void {
  const html = buildPricingHTML(rows, meta, origin);
  openPrintWindow(html, `TAA Price List 2026 — ${meta.currency}`);
}

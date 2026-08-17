import { fmt } from '../../constants';
import { buildLegalSections } from '../proposal-html-closing';
import {
  buildBriefItinerary,
  buildB2BPricing,
  buildDayNarrative,
  buildFlightsTable,
  coverBookingRows,
  resolveOverviewRows,
  specialNotesBlock,
} from '../proposal-html-sections';
import { proposalRichHtml } from '../proposal-rich-text';
import { PROPOSAL_TAGLINE_B2C } from '../proposal-boilerplate';
import {
  CSS_PL_ACCENT,
  CSS_PL_ACCENT_SOFT,
  CSS_PL_BORDER,
  CSS_PL_FONT_MONO,
  CSS_PL_INK,
  CSS_PL_INK_MUTED,
  CSS_PL_RADIUS,
  CSS_PL_SURFACE_ALT,
  CSS_TABLE_HEADER,
  MUTED,
  editField,
  esc,
  isProposalHtmlEditable,
  sectionTitle,
  templateAnchorAttr,
} from '../proposal-html-shared';
import type { ProposalDoc } from '../proposal-types';

/** Dense two-column header: logo + meta | booking grid. */
export function buildCompactHeader(doc: ProposalDoc): string {
  const isB2c = doc.variant === 'b2c';
  const bookingRows = coverBookingRows(doc);
  const mid = Math.ceil(bookingRows.length / 2);
  const left = bookingRows.slice(0, mid);
  const right = bookingRows.slice(mid);

  const kv = (rows: [string, string][]) =>
    rows
      .map(
        ([l, v]) =>
          `<tr${templateAnchorAttr(`booking.${l}`)}>
            <td style="padding:2px 6px 2px 0;font-size:9.5px;font-weight:700;color:${CSS_PL_INK_MUTED};white-space:nowrap;vertical-align:top">${esc(l)}</td>
            <td style="padding:2px 0;font-size:9.5px;color:${CSS_PL_INK};vertical-align:top">${editField(`bookingFields.${encodeURIComponent(l)}`, esc(v))}</td>
          </tr>`
      )
      .join('');

  return `
  <div class="proposal-cover-compact" style="margin-bottom:10px;padding:10px 12px;border:1px solid ${CSS_PL_BORDER};border-radius:${CSS_PL_RADIUS};background:${CSS_PL_SURFACE_ALT}">
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="width:38%;vertical-align:top;padding-right:12px;border-right:1px solid ${CSS_PL_BORDER}">
          ${isB2c ? `<div style="font-size:9px;color:${CSS_PL_INK_MUTED};letter-spacing:0.4px;margin-bottom:4px">${PROPOSAL_TAGLINE_B2C}</div>` : ''}
          <img src="${esc(doc.logoUrl)}" alt="The Ant Adventures"${isProposalHtmlEditable() ? ' contenteditable="false"' : ''} style="height:36px;margin-bottom:6px" />
          <div style="font-size:13px;font-weight:700;color:${CSS_PL_INK};line-height:1.25;margin-bottom:4px">${editField('tourTitle', esc(doc.tourTitle))}</div>
          <div style="font-size:9.5px;color:${CSS_PL_INK_MUTED};margin-bottom:4px">${esc(doc.durationLabel)} · ${esc(doc.route)}</div>
          <div${templateAnchorAttr('tagline')} style="font-size:9.5px;color:${CSS_PL_INK};line-height:1.4;font-style:italic">${editField('tagline', proposalRichHtml(doc.tagline), { rich: true })}</div>
          <div style="font-size:9px;color:${CSS_PL_INK_MUTED};margin-top:6px;font-family:${CSS_PL_FONT_MONO}">${esc(doc.quoteRef)}</div>
        </td>
        <td style="width:62%;vertical-align:top;padding-left:12px">
          <div style="font-size:9.5px;font-weight:700;color:#fff;background:${CSS_PL_ACCENT};display:inline-block;padding:2px 8px;border-radius:${CSS_PL_RADIUS};margin-bottom:6px;letter-spacing:0.5px">${isB2c ? 'BOOKING DETAILS' : 'CLIENT & BOOKING'}</div>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="width:50%;vertical-align:top;padding-right:8px"><table style="width:100%;border-collapse:collapse">${kv(left)}</table></td>
              <td style="width:50%;vertical-align:top"><table style="width:100%;border-collapse:collapse">${kv(right)}</table></td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  ${specialNotesBlock(doc)}`;
}

function buildCompactOverviewBeside(doc: ProposalDoc): string {
  const rows = resolveOverviewRows(doc);
  const body = rows
    .map(
      ([label, a, b], i) =>
        `<tr style="background:${i % 2 ? CSS_PL_SURFACE_ALT : '#fff'}">
          <td style="padding:3px 6px;border-bottom:1px solid ${CSS_PL_BORDER};font-weight:600;font-size:9.5px;width:22%">${editField(`overviewRows.${i}.label`, esc(label))}</td>
          <td style="padding:3px 6px;border-bottom:1px solid ${CSS_PL_BORDER};font-size:9.5px">${editField(`overviewRows.${i}.optionA`, esc(a))}</td>
          <td style="padding:3px 6px;border-bottom:1px solid ${CSS_PL_BORDER};font-size:9.5px">${editField(`overviewRows.${i}.optionB`, esc(b))}</td>
        </tr>`
    )
    .join('');

  return `${sectionTitle('Tour Overview')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:4px;font-size:9.5px">
    <thead><tr style="background:${CSS_TABLE_HEADER};color:#fff">
      <th style="padding:4px 6px;text-align:left;font-size:9.5px">Detail</th>
      <th style="padding:4px 6px;text-align:left;font-size:9.5px">Option A — 4★</th>
      <th style="padding:4px 6px;text-align:left;font-size:9.5px">Option B — 5★</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

/** Single striped programme table — no photos. */
export function buildCompactProgramTable(doc: ProposalDoc): string {
  if (!doc.days.length) return '';

  const rows = doc.days
    .map((d, i) => {
      const narrative = buildDayNarrative(d);
      const meta = `<div style="font-size:9px;color:${CSS_PL_INK_MUTED};margin-top:4px"><b>Hotel:</b> ${editField(`days.${d.dayNumber}.hotel`, esc(d.hotel))} · <b>Meals:</b> ${editField(`days.${d.dayNumber}.meals`, esc(d.meals))}</div>`;
      return `<tr style="background:${i % 2 ? CSS_PL_SURFACE_ALT : '#fff'}">
        <td style="padding:5px 6px;border-bottom:1px solid ${CSS_PL_BORDER};font-weight:700;font-family:${CSS_PL_FONT_MONO};font-size:10px;text-align:center;vertical-align:top;width:36px">${d.dayNumber}</td>
        <td style="padding:5px 6px;border-bottom:1px solid ${CSS_PL_BORDER};font-size:9.5px;white-space:nowrap;vertical-align:top">${esc(d.dateLabel)}</td>
        <td style="padding:5px 6px;border-bottom:1px solid ${CSS_PL_BORDER};font-size:9.5px;font-weight:600;vertical-align:top">${esc(d.destination)}</td>
        <td style="padding:5px 6px;border-bottom:1px solid ${CSS_PL_BORDER};font-size:9.5px;line-height:1.4;vertical-align:top">${narrative}${meta}</td>
      </tr>`;
    })
    .join('');

  return `${sectionTitle('Detailed Program')}
  <table class="proposal-compact-program" style="width:100%;border-collapse:collapse;margin-bottom:6px;font-size:9.5px">
    <thead><tr style="background:${CSS_PL_ACCENT};color:#fff">
      <th style="padding:5px 6px;text-align:center;font-size:9.5px">Day</th>
      <th style="padding:5px 6px;text-align:left;font-size:9.5px">Date</th>
      <th style="padding:5px 6px;text-align:left;font-size:9.5px">Destination</th>
      <th style="padding:5px 6px;text-align:left;font-size:9.5px">Programme / Hotel &amp; Meals</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildCompactInclusions(doc: ProposalDoc): string {
  const list = (items: string[], field: 'inclusions' | 'exclusions') =>
    items
      .map(
        (item, i) =>
          `<li style="margin:0 0 3px;padding-left:2px;font-size:9.5px;line-height:1.35;list-style:disc;margin-left:14px">${editField(`${field}.${i}`, proposalRichHtml(item), { rich: true })}</li>`
      )
      .join('');

  return `<div class="proposal-keep">
  ${sectionTitle('Inclusions & Exclusions')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
    <tr>
      <td${templateAnchorAttr('inclusions')} style="width:50%;vertical-align:top;padding:6px 8px 6px 0;border-right:1px solid ${CSS_PL_BORDER}">
        <div style="font-size:9.5px;font-weight:700;color:${CSS_PL_ACCENT};margin-bottom:4px">INCLUSIONS</div>
        <ul style="margin:0;padding:0">${list(doc.inclusions, 'inclusions') || `<li style="list-style:none;color:${MUTED};font-size:9.5px">—</li>`}</ul>
      </td>
      <td${templateAnchorAttr('exclusions')} style="width:50%;vertical-align:top;padding:6px 0 6px 8px">
        <div style="font-size:9.5px;font-weight:700;color:${CSS_PL_INK_MUTED};margin-bottom:4px">EXCLUSIONS</div>
        <ul style="margin:0;padding:0">${list(doc.exclusions, 'exclusions') || `<li style="list-style:none;color:${MUTED};font-size:9.5px">—</li>`}</ul>
      </td>
    </tr>
  </table>
  </div>`;
}

function buildCompactB2CPricing(doc: ProposalDoc): string {
  if (doc.pricing.kind !== 'b2c') return '';
  const p = doc.pricing;
  const packageLabel = doc.pricingText?.packageLabel ?? p.packageLabel;
  const footnote =
    doc.pricingText?.footnote ??
    'All prices are quoted in USD and include applicable taxes. Rates are valid for the travel dates specified and subject to availability at time of booking confirmation.';

  return `<div${templateAnchorAttr('pricing')} class="proposal-keep">
  ${sectionTitle('Quoting Pricing')}
  <div style="font-size:9.5px;color:${CSS_PL_INK_MUTED};margin-bottom:4px">All prices USD · ${esc(p.seasonNote)}</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:6px;font-size:10px">
    <thead><tr style="background:${CSS_TABLE_HEADER};color:#fff">
      <th style="padding:4px 8px;text-align:left;font-size:9.5px">Package</th>
      <th style="padding:4px 8px;text-align:right;font-size:9.5px">Per Person</th>
      <th style="padding:4px 8px;text-align:right;font-size:9.5px">Total ${p.pax} Pax</th>
    </tr></thead>
    <tbody>
      <tr style="background:${CSS_PL_ACCENT_SOFT}">
        <td style="padding:6px 8px;border-bottom:1px solid ${CSS_PL_BORDER}">${editField('pricingText.packageLabel', `<b>${esc(packageLabel)}</b>`, { rich: true })}<br><span style="font-size:9px;color:${CSS_PL_INK_MUTED}">${esc(doc.accommodationOptionA)}</span></td>
        <td style="padding:6px 8px;border-bottom:1px solid ${CSS_PL_BORDER};text-align:right;font-family:${CSS_PL_FONT_MONO};font-weight:700">$${fmt(p.perPerson)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid ${CSS_PL_BORDER};text-align:right;font-family:${CSS_PL_FONT_MONO};font-weight:700">$${fmt(p.groupTotal)}</td>
      </tr>
    </tbody>
  </table>
  <div${templateAnchorAttr('pricing.footnote')} style="font-size:9px;color:${CSS_PL_INK_MUTED};font-style:italic">${editField('pricingText.footnote', proposalRichHtml(footnote), { rich: true })}</div>
  </div>`;
}

export function buildCompactBody(doc: ProposalDoc): string {
  return [
    buildCompactHeader(doc),
    buildCompactOverviewBeside(doc),
    buildFlightsTable(doc, 'compact'),
    buildBriefItinerary(doc, 'compact'),
    buildCompactProgramTable(doc),
    buildCompactInclusions(doc),
    doc.variant === 'b2c' ? buildCompactB2CPricing(doc) : buildB2BPricing(doc),
    doc.variant === 'b2c' ? buildLegalSections(doc) : '',
  ].join('\n');
}

export function compactExtraStyles(): string {
  return `
  .proposal-layout-compact { font-size: 10.5px; line-height: 1.35; }
  .proposal-layout-compact .proposal-section-title--compact { margin: 10px 0 5px; }
  .proposal-layout-compact .proposal-photo-col { display: none !important; }
  .proposal-layout-compact .proposal-compact-program { break-inside: auto; }
  .proposal-layout-compact .proposal-compact-program tr { break-inside: avoid; page-break-inside: avoid; }
  .proposal-layout-compact .proposal-day-body { font-size: 9.5px !important; line-height: 1.35 !important; }
`;
}

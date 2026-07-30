import { fmt } from '../constants';
import {
  defaultBookingFields,
  defaultLegalText,
  defaultOverviewRows,
} from './proposal-content-overrides';
import { proposalRichHtml } from './proposal-rich-text';
import type { ProposalDoc } from './proposal-types';
import {
  PROPOSAL_AMENDMENT_POLICY,
  PROPOSAL_B2B_FOOTER_NOTE,
  PROPOSAL_CANCELLATION_POLICY,
  PROPOSAL_FLIGHT_NOTE,
  PROPOSAL_IMPORTANT_NOTES,
  PROPOSAL_PAYMENT_TERMS,
  PROPOSAL_TAGLINE_B2C,
} from './proposal-boilerplate';

const BRAND = '#2E7D52';
const BRAND_DARK = '#1a5c38';
const MUTED = '#6B7F74';
const BORDER = '#E2E8E4';
const EXCL_HEADER = '#545454';
const FLIGHTS_HEADER = '#4A6FA5';
const HOTELS_B_HEADER = '#8B6913';
const ROW_ALT = '#F6F6F6';
const ROW_GREEN = '#ECF6F0';
const ROW_GREEN_ALT = '#D5E9D9';
const ROW_BLUE = '#E7ECF5';

/** When true, narrative/table value cells are wrapped for in-document editing. */
let EDITABLE = false;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Wrap content for in-doc editing; no-op when building export HTML. */
function editField(path: string, inner: string, opts?: { rich?: boolean; tag?: 'span' | 'div' }): string {
  if (!EDITABLE) return inner;
  const rich = opts?.rich;
  const tag = opts?.tag ?? (rich ? 'div' : 'span');
  const mode = rich ? 'data-rich="1"' : 'data-plain="1"';
  return `<${tag} contenteditable="true" data-proposal-field="${esc(path)}" ${mode} class="proposal-edit-field">${inner}</${tag}>`;
}

function sectionTitle(title: string): string {
  return `<div style="font-weight:700;font-size:13px;color:${BRAND_DARK};text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px;padding-bottom:5px;border-bottom:2px solid ${BRAND}">${esc(title)}</div>`;
}

function thCell(text: string, align: 'left' | 'right' | 'center' = 'left'): string {
  return `<th style="padding:7px 10px;border:1px solid ${BORDER};text-align:${align};font-weight:700;font-size:11px;background:${BRAND};color:#fff">${esc(text)}</th>`;
}

function tdCell(text: string, opts?: { bold?: boolean; align?: string; bg?: string }): string {
  const align = opts?.align || 'left';
  const bg = opts?.bg || '#fff';
  const weight = opts?.bold ? 'font-weight:700;' : '';
  return `<td style="padding:7px 10px;border:1px solid ${BORDER};vertical-align:top;font-size:11.5px;${weight}text-align:${align};background:${bg}">${text}</td>`;
}

function coverBookingRows(doc: ProposalDoc): [string, string][] {
  const isB2c = doc.variant === 'b2c';
  const fields = doc.bookingFields ?? defaultBookingFields(doc);
  const order = isB2c
    ? [
        'Quote Ref.',
        'Travel Dates',
        'Guest Name(s)',
        'Your Consultant',
        'Nationality',
        'Prepared Date',
        'No. of Guests',
        'Valid Until',
        'Rooming',
        'Payment Terms',
      ]
    : [
        'Quote Ref.',
        'Agent / Company',
        'Guest Name(s)',
        'Sales Person',
        'Nationality',
        'Prepared Date',
        'No. of Passengers',
        'Valid Until',
        'Rooming',
        'Commission',
        'Travel Dates',
      ];
  return order.filter((label) => fields[label] != null).map((label) => [label, fields[label]!]);
}

function buildCover(doc: ProposalDoc): string {
  const isB2c = doc.variant === 'b2c';
  const bookingTitle = isB2c ? 'YOUR BOOKING DETAILS' : 'CLIENT &amp; BOOKING DETAILS';
  const bookingRows = coverBookingRows(doc);

  const bookingTable = bookingRows
    .map(
      ([l, v]) =>
        `<tr><td style="padding:6px 10px;border:1px solid ${BORDER};font-weight:600;width:28%;background:#F7F8F6">${esc(l)}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${editField(`bookingFields.${encodeURIComponent(l)}`, esc(v))}</td></tr>`
    )
    .join('');

  return `
  <div style="text-align:center;margin-bottom:18px">
    ${isB2c ? `<div style="font-size:11px;color:${MUTED};font-style:italic;margin-bottom:8px;letter-spacing:0.3px">${PROPOSAL_TAGLINE_B2C}</div>` : ''}
    <img src="${esc(doc.logoUrl)}" alt="The Ant Adventures"${EDITABLE ? ' contenteditable="false"' : ''} style="height:56px;margin-bottom:10px" />
    <div style="font-size:10px;color:${MUTED};margin-bottom:14px">www.theantadventures.com</div>
    <div style="font-size:20px;font-weight:700;color:${BRAND_DARK};letter-spacing:0.4px;margin-bottom:6px">${editField('tourTitle', esc(doc.tourTitle))}</div>
    <div style="font-size:12px;color:${MUTED};margin-bottom:4px">${esc(doc.durationLabel)} | ${esc(doc.route)}</div>
    <div style="font-size:12px;color:#1a2e23;line-height:1.6;max-width:620px;margin:0 auto;font-style:italic">${editField('tagline', proposalRichHtml(doc.tagline), { rich: true })}</div>
  </div>
  ${sectionTitle(bookingTitle)}
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">${bookingTable}</table>
  <div style="margin-top:10px">
    <div style="font-weight:600;font-size:11px;color:${BRAND_DARK};margin-bottom:4px">Special Notes / Requirements</div>
    <div style="font-size:11.5px;color:${MUTED};line-height:1.55;padding:8px 10px;border:1px dashed ${BORDER};border-radius:6px;background:#FAFBFA">${editField('specialNotes', proposalRichHtml(doc.specialNotes), { rich: true })}</div>
  </div>`;
}

function buildOverview(doc: ProposalDoc): string {
  const rows = (doc.overviewRows ?? defaultOverviewRows(doc)).map((r) => [r.label, r.optionA, r.optionB]);

  const body = rows
    .map(
      ([label, a, b], i) =>
        `<tr style="background:${i % 2 ? '#F7F8F6' : '#fff'}"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:600;width:22%">${editField(`overviewRows.${i}.label`, esc(label))}</td><td style="padding:7px 10px;border:1px solid ${BORDER}">${editField(`overviewRows.${i}.optionA`, esc(a))}</td><td style="padding:7px 10px;border:1px solid ${BORDER}">${editField(`overviewRows.${i}.optionB`, esc(b))}</td></tr>`
    )
    .join('');

  return `${sectionTitle('Tour Overview')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
    <thead><tr>${thCell('Detail')}${thCell('Option A — 4★')}${thCell('Option B — 5★')}</tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function buildFlightsTable(doc: ProposalDoc): string {
  if (!doc.flights.length) return '';
  const rows = doc.flights
    .map(
      (f) =>
        `<tr><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:center">${f.index}</td><td style="padding:7px 10px;border:1px solid ${BORDER}"><b>${esc(f.route)}</b></td><td style="padding:7px 10px;border:1px solid ${BORDER}">${esc(f.sector)}</td><td style="padding:7px 10px;border:1px solid ${BORDER}">${esc(f.airline)}</td><td style="padding:7px 10px;border:1px solid ${BORDER}">${esc(f.dateLabel)}</td></tr>`
    )
    .join('');

  return `${sectionTitle('Domestic Flights Included')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
    <thead><tr>${thCell('#', 'center')}${thCell('Route')}${thCell('Sector')}${thCell('Airline')}${thCell('Date')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="font-size:10.5px;color:${MUTED};font-style:italic;margin-bottom:8px">${PROPOSAL_FLIGHT_NOTE}</div>`;
}

function buildBriefItinerary(doc: ProposalDoc): string {
  if (!doc.itineraryGlance.length) return '';
  const rows = doc.itineraryGlance
    .map(
      (r, i) =>
        `<tr style="background:${i % 2 ? '#F7F8F6' : '#fff'}"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700;text-align:center">${r.dayNumber}</td><td style="padding:7px 10px;border:1px solid ${BORDER};white-space:nowrap">${esc(r.dateLabel)}</td><td style="padding:7px 10px;border:1px solid ${BORDER}">${editField(`itineraryGlance.${i}.destination`, esc(r.destination))}</td><td style="padding:7px 10px;border:1px solid ${BORDER}">${editField(`itineraryGlance.${i}.theme`, esc(r.theme))}</td><td style="padding:7px 10px;border:1px solid ${BORDER}">${editField(`itineraryGlance.${i}.hotel`, esc(r.hotel))}</td></tr>`
    )
    .join('');

  return `${sectionTitle('Brief Itinerary at a Glance')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
    <thead><tr>${thCell('Day', 'center')}${thCell('Date')}${thCell('Destination')}${thCell('Theme')}${thCell('Hotel (4★)')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function absolutizeUrl(url: string, base: string): string {
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

function buildPhotoImgs(urls: string[], maxHeight = 118): string {
  return urls
    .map(
      (url) =>
        `<img class="proposal-sidebar-img" src="${esc(url)}" alt="" style="width:100%;height:auto;max-height:${maxHeight}px;object-fit:cover;border-radius:2px;display:block;margin:0 0 8px" />`
    )
    .join('');
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function buildPhotoStack(urls: string[], maxHeight = 102): string {
  const imgs = buildPhotoImgs(uniqueUrls(urls).slice(0, 2), maxHeight);
  return imgs ? `<div class="proposal-photo-stack">${imgs}</div>` : '';
}

function buildSegmentPhotoSidebar(urls: string[]): string {
  const photos = buildPhotoStack(urls, 102);
  return `<td class="proposal-segment-photos" style="width:28%;vertical-align:top;background:#E8F5EE;border-left:1px solid ${BORDER};padding:12px 10px 6px;text-align:center">
      ${photos}
    </td>`;
}

function buildDayPhotoSidebar(d: import('./proposal-types').ProposalDayDetail): string {
  const urls = uniqueUrls((d.imageUrls || []).slice(0, 2));
  const photos = buildPhotoStack(urls, 108);
  if (!photos) {
    return `<td style="width:28%;vertical-align:top;background:#E8F5EE;border-left:1px solid ${BORDER};padding:12px 10px;text-align:center">
      <div style="font-weight:700;font-size:12px;color:${BRAND_DARK}">Day ${d.dayNumber}</div>
    </td>`;
  }
  return `<td style="width:28%;vertical-align:top;background:#E8F5EE;border-left:1px solid ${BORDER};padding:12px 10px 6px;text-align:center">
      <div style="font-weight:700;font-size:12px;color:${BRAND_DARK};margin-bottom:8px">Day ${d.dayNumber}</div>
      ${photos}
    </td>`;
}

function buildSegmentSidebarRow(seg: import('./proposal-types').ProposalDaySegment, dayNumber: number, segIdx: number): string {
  const dn = dayNumber;
  const title = `<div style="font-weight:600;font-size:12px;margin-bottom:6px;color:${BRAND_DARK}">${editField(`days.${dn}.segments.${segIdx}.title`, esc(seg.title))}</div>`;
  const body = `<div style="font-size:11.5px;line-height:1.65;color:#1a2e23">${editField(`days.${dn}.segments.${segIdx}.body`, proposalRichHtml(seg.body), { rich: true })}</div>`;
  return `<tr class="proposal-segment-row">
          <td style="width:72%;vertical-align:top;padding:10px 14px 10px 14px;border-top:1px solid ${BORDER}">
            ${title}${body}
          </td>
          ${buildSegmentPhotoSidebar(seg.imageUrls || [])}
        </tr>`;
}

function buildDayMeta(d: import('./proposal-types').ProposalDayDetail): string {
  const dn = d.dayNumber;
  return `<div style="margin-top:4px;font-size:11px;color:#1a2e23"><b style="color:${BRAND_DARK}">Hotel:</b> ${editField(`days.${dn}.hotel`, esc(d.hotel))}</div>
      <div style="font-size:11px;color:#1a2e23"><b style="color:${BRAND_DARK}">Meals:</b> ${editField(`days.${dn}.meals`, esc(d.meals))}</div>`;
}

function buildSegmentPhotoInline(urls: string[]): string {
  if (!urls.length) return '';
  const images = urls
    .map(
      (url) =>
        `<img src="${esc(url)}" alt="" style="width:100%;height:140px;object-fit:cover;border-radius:4px;display:block" />`
    )
    .join('');
  return `<div style="display:grid;grid-template-columns:repeat(${urls.length},1fr);gap:8px;margin:10px 0 4px">${images}</div>`;
}

function buildDayPhotoInline(d: import('./proposal-types').ProposalDayDetail): string {
  return buildSegmentPhotoInline((d.imageUrls || []).slice(0, 2));
}

function buildDayContentBody(d: import('./proposal-types').ProposalDayDetail, layout: 'sidebar' | 'inline'): string {
  const dn = d.dayNumber;
  if (d.segments?.length) {
    return d.segments
      .map((seg, i) => {
        const title = `<div style="font-weight:600;font-size:12px;margin-bottom:6px;color:${BRAND_DARK}">${editField(`days.${dn}.segments.${i}.title`, esc(seg.title))}</div>`;
        const body = `<div style="font-size:11.5px;line-height:1.65;color:#1a2e23">${editField(`days.${dn}.segments.${i}.body`, proposalRichHtml(seg.body), { rich: true })}</div>`;
        const gap = i > 0 ? 'margin-top:14px;' : '';
        const photos =
          layout === 'inline' ? buildSegmentPhotoInline((seg.imageUrls || []).slice(0, 2)) : '';
        return `<div style="${gap}">${title}${body}${photos}</div>`;
      })
      .join('');
  }

  const title = `<div style="font-weight:600;font-size:12px;margin-bottom:8px;color:${BRAND_DARK}">${editField(`days.${dn}.title`, esc(d.title))}</div>`;
  const body = `<div style="font-size:11.5px;line-height:1.65;color:#1a2e23">${editField(`days.${dn}.body`, proposalRichHtml(d.body), { rich: true })}</div>`;
  const photos = layout === 'inline' ? buildDayPhotoInline(d) : '';
  return `${title}${body}${photos}`;
}

function buildDetailedProgram(doc: ProposalDoc): string {
  if (!doc.days.length) return '';
  const layout = doc.detailedProgramLayout === 'inline' ? 'inline' : 'sidebar';

  const blocks = doc.days
    .map((d) => {
      const header = `<div style="font-weight:700;font-size:13px;color:${BRAND_DARK};margin-bottom:6px">DAY ${d.dayNumber} | ${esc(d.dateLabel)} | ${esc(d.destination)}</div>`;
      const content = buildDayContentBody(d, layout);
      const meta = buildDayMeta(d);

      if (layout === 'inline') {
        return `
    <div class="proposal-day proposal-day--inline" style="margin-bottom:14px;border:1px solid ${BORDER};border-radius:4px;padding:14px 14px 12px;background:#fff">
      ${header}
      ${content}
      ${meta}
    </div>`;
      }

      if (d.segments?.length) {
        const segmentRows = d.segments.map((seg, si) => buildSegmentSidebarRow(seg, d.dayNumber, si)).join('');
        return `
    <div class="proposal-day proposal-day--segments" style="margin-bottom:14px;border:1px solid ${BORDER};border-radius:4px;overflow:hidden;background:#fff">
      <table style="width:100%;border-collapse:collapse">
        <tr class="proposal-day-header-row">
          <td colspan="2" style="padding:14px 14px 8px">${header}</td>
        </tr>
        ${segmentRows}
        <tr class="proposal-day-meta-row">
          <td colspan="2" class="proposal-day-meta" style="padding:8px 14px 12px;border-top:1px solid ${BORDER}">${meta}</td>
        </tr>
      </table>
    </div>`;
      }

      const photoCol = buildDayPhotoSidebar(d);
      return `
    <div class="proposal-day proposal-day--single" style="margin-bottom:14px;border:1px solid ${BORDER};border-radius:4px;overflow:hidden;background:#fff">
      <table style="width:100%;border-collapse:collapse">
        <tr class="proposal-day-single-row">
          <td style="width:72%;vertical-align:top;padding:14px 14px 12px">
            ${header}
            ${content}
            ${meta}
          </td>
          ${photoCol}
        </tr>
      </table>
    </div>`;
    })
    .join('');

  return `${sectionTitle('Detailed Program')}${blocks}`;
}

function buildInclusions(doc: ProposalDoc): string {
  const inclRows = doc.inclusions
    .map(
      (item, i) => `<tr style="background:${i % 2 ? ROW_ALT : '#fff'}">
      <td style="padding:6px 8px;border:1px solid ${BORDER};width:24px;color:${BRAND};font-weight:700;vertical-align:top;text-align:center">✓</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:11px;vertical-align:top;line-height:1.5">${editField(`inclusions.${i}`, proposalRichHtml(item), { rich: true })}</td>
    </tr>`
    )
    .join('');
  const exclRows = doc.exclusions
    .map(
      (item, i) => `<tr style="background:${i % 2 ? '#F3F7F4' : '#ECF3EE'}">
      <td style="padding:6px 8px;border:1px solid ${BORDER};width:24px;color:#c0392b;font-weight:700;vertical-align:top;text-align:center">✗</td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:11px;vertical-align:top;line-height:1.5">${editField(`exclusions.${i}`, proposalRichHtml(item), { rich: true })}</td>
    </tr>`
    )
    .join('');

  return `${sectionTitle('Inclusions &amp; Exclusions')}
  <table style="width:100%;border-collapse:separate;border-spacing:0;margin-bottom:8px;table-layout:fixed">
    <thead>
      <tr>
        <th style="width:50%;padding:0;border:0;border-right:6px solid #fff;vertical-align:top">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr><th colspan="2" style="padding:8px 10px;border:1px solid ${BORDER};background:${BRAND};color:#fff;font-size:11px;font-weight:700;text-align:left;letter-spacing:0.4px">INCLUSIONS</th></tr></thead>
            <tbody>${inclRows}</tbody>
          </table>
        </th>
        <th style="width:50%;padding:0;border:0;vertical-align:top">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr><th colspan="2" style="padding:8px 10px;border:1px solid ${BORDER};background:${EXCL_HEADER};color:#fff;font-size:11px;font-weight:700;text-align:left;letter-spacing:0.4px">EXCLUSIONS</th></tr></thead>
            <tbody>${exclRows}</tbody>
          </table>
        </th>
      </tr>
    </thead>
  </table>`;
}

function buildB2CPricing(doc: ProposalDoc): string {
  if (doc.pricing.kind !== 'b2c') return '';
  const p = doc.pricing;
  const packageLabel = doc.pricingText?.packageLabel ?? p.packageLabel;
  const footnote =
    doc.pricingText?.footnote ??
    'All prices are quoted in USD and include applicable taxes. Rates are valid for the travel dates specified and subject to availability at time of booking confirmation.';
  return `${sectionTitle('Quoting Pricing')}
  <div style="font-size:11px;color:${MUTED};margin-bottom:8px">All prices USD · ${esc(p.seasonNote)}</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${thCell('Package')}${thCell('Per Person (USD)', 'right')}${thCell(`Total ${p.pax} Pax (USD)`, 'right')}</tr></thead>
    <tbody>
      <tr style="background:${ROW_GREEN_ALT}">
        ${tdCell(`${editField('pricingText.packageLabel', `<b>${esc(packageLabel)}</b>`, { rich: true })}<br><span style="font-size:10.5px;color:${MUTED}">${esc(doc.accommodationOptionA)} · Private Touring · Domestic Flights · All Taxes Included</span>`)}
        ${tdCell(`$${fmt(p.perPerson)}`, { align: 'right', bold: true, bg: ROW_GREEN_ALT })}
        ${tdCell(`$${fmt(p.groupTotal)}`, { align: 'right', bold: true, bg: ROW_GREEN_ALT })}
      </tr>
    </tbody>
  </table>
  <div style="font-size:10.5px;color:${MUTED};font-style:italic">${editField('pricingText.footnote', proposalRichHtml(footnote), { rich: true })}</div>`;
}

function thCellColored(text: string, bg: string, align: 'left' | 'right' | 'center' = 'left'): string {
  return `<th style="padding:7px 10px;border:1px solid ${BORDER};text-align:${align};font-weight:700;font-size:11px;background:${bg};color:#fff">${esc(text)}</th>`;
}

function buildHotelRatesTable(
  rates: import('./proposal-types').ProposalHotelRate[],
  total: number,
  emptyHint: string,
  headerBg = BRAND
): string {
  const hotelRows = rates
    .map(
      (h, i) =>
        `<tr style="background:${i % 2 ? ROW_ALT : '#fff'}"><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(h.hotelName || 'TBC')}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(h.location)}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(h.stayFrom)} – ${esc(h.stayTo)}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(h.roomType)}</td><td style="padding:6px 10px;border:1px solid ${BORDER};text-align:center">${h.nights}</td><td style="padding:6px 10px;border:1px solid ${BORDER};text-align:right">$${fmt(h.ratePerNight)}</td><td style="padding:6px 10px;border:1px solid ${BORDER};text-align:right"><b>$${fmt(h.ratePerNight * h.nights)}</b></td></tr>`
    )
    .join('');

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:11px">
    <thead><tr>${thCellColored('Hotel', headerBg)}${thCellColored('Location', headerBg)}${thCellColored('Stay', headerBg)}${thCellColored('Room Type', headerBg)}${thCellColored('Nts', headerBg, 'center')}${thCellColored('Price/Night', headerBg, 'right')}${thCellColored('Total (USD)', headerBg, 'right')}</tr></thead>
    <tbody>${hotelRows || `<tr><td colspan="7" style="padding:10px;color:${MUTED}">${esc(emptyHint)}</td></tr>`}</tbody>
    <tfoot><tr style="background:${ROW_GREEN}"><td colspan="6" style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700">TOTAL HOTELS</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right;font-weight:700">$${fmt(total)}</td></tr></tfoot>
  </table>`;
}

function buildB2BPricing(doc: ProposalDoc): string {
  if (doc.pricing.kind !== 'b2b') return '';
  const p = doc.pricing;
  const optionALabel = /4/.test(doc.accommodationOptionA)
    ? doc.accommodationOptionA.includes('Boutique') || doc.accommodationOptionA.includes('★')
      ? doc.accommodationOptionA
      : '4-Star Boutique'
    : '4-Star Boutique';
  const optionBLabel = /5/.test(doc.accommodationOptionB)
    ? doc.accommodationOptionB.includes('Luxury') || doc.accommodationOptionB.includes('★')
      ? doc.accommodationOptionB
      : '5-Star Luxury'
    : '5-Star Luxury';
  const groundDesc =
    doc.pricingText?.b2bGroundDesc ??
    'Ground arrangements — private tour (transfers, guide, vehicle, activities & entrance fees as per program)';
  const flightsDesc = doc.pricingText?.b2bFlightsDesc ?? 'Domestic flights as per program · Economy class';
  const footnote = doc.pricingText?.footnote ?? PROPOSAL_B2B_FOOTER_NOTE;

  return `${sectionTitle('Sample Quotation — B2B Net Rates')}
  <div style="font-size:11px;color:${MUTED};margin-bottom:10px">All prices USD · ${esc(p.seasonNote)}</div>

  <div style="font-weight:700;font-size:11.5px;color:${BRAND_DARK};margin:12px 0 6px">A. TOURINGS</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${thCellColored('Service Description', BRAND)}${thCellColored('Per Pax (USD)', BRAND, 'right')}${thCellColored(`Total ${p.pax} Pax (USD)`, BRAND, 'right')}</tr></thead>
    <tbody>
      <tr><td style="padding:7px 10px;border:1px solid ${BORDER}">${editField('pricingText.b2bGroundDesc', proposalRichHtml(groundDesc), { rich: true })}</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right">$${fmt(p.touringsPerPax)}</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right"><b>$${fmt(p.touringsTotal)}</b></td></tr>
      <tr style="background:${ROW_GREEN}"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700" colspan="2">TOTAL TOURINGS</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right;font-weight:700">$${fmt(p.touringsTotal)}</td></tr>
    </tbody>
  </table>

  <div style="font-weight:700;font-size:11.5px;color:${FLIGHTS_HEADER};margin:12px 0 6px">B. DOMESTIC FLIGHTS</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${thCellColored('Service Description', FLIGHTS_HEADER)}${thCellColored('Per Pax (USD)', FLIGHTS_HEADER, 'right')}${thCellColored(`Total ${p.pax} Pax (USD)`, FLIGHTS_HEADER, 'right')}</tr></thead>
    <tbody>
      <tr><td style="padding:7px 10px;border:1px solid ${BORDER}">${editField('pricingText.b2bFlightsDesc', proposalRichHtml(flightsDesc), { rich: true })}</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right">$${fmt(p.flightsPerPax)}</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right"><b>$${fmt(p.flightsTotal)}</b></td></tr>
      <tr style="background:${ROW_BLUE}"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700" colspan="2">TOTAL FLIGHTS</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right;font-weight:700">$${fmt(p.flightsTotal)}</td></tr>
    </tbody>
  </table>

  <div style="font-weight:700;font-size:11.5px;color:${BRAND_DARK};margin:12px 0 6px">C. HOTELS — OPTION A (${esc(optionALabel)})</div>
  ${buildHotelRatesTable(p.hotelRatesOptionA, p.hotelsTotalOptionA, 'Add hotel rates in the Export step.', BRAND)}

  <div style="font-weight:700;font-size:11.5px;color:${HOTELS_B_HEADER};margin:12px 0 6px">C. HOTELS — OPTION B (${esc(optionBLabel)})</div>
  ${buildHotelRatesTable(p.hotelRatesOptionB, p.hotelsTotalOptionB, 'Enter Option B (5★) hotel names and net rates in the Export step.', HOTELS_B_HEADER)}

  <div style="font-size:10.5px;color:${MUTED};font-style:italic;margin-top:10px">${editField('pricingText.footnote', proposalRichHtml(footnote), { rich: true })}</div>
  <div style="margin-top:16px;text-align:center;font-size:10px;color:${MUTED}">THE ANT ADVENTURES · sales@theantadventures.com · www.theantadventures.com</div>`;
}

function kvTable(rows: [string, string][], labelWidth = '30%'): string {
  return `<table style="width:100%;border-collapse:collapse;margin-bottom:14px">${rows
    .map(
      ([l, v], i) =>
        `<tr style="background:${i % 2 ? ROW_ALT : '#fff'}"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700;width:${labelWidth};color:${BRAND_DARK};vertical-align:top;font-size:11px">${esc(l)}</td><td style="padding:7px 10px;border:1px solid ${BORDER};font-size:11px;vertical-align:top;line-height:1.55">${esc(v)}</td></tr>`
    )
    .join('')}</table>`;
}


function legalSectionBlock(title: string, customHtml: string | undefined, fallbackTable: string, editKey?: string): string {
  if (EDITABLE && editKey) {
    const content = customHtml?.trim() || '';
    return `${sectionTitle(title)}<div style="font-size:11px;line-height:1.55;margin-bottom:14px">${editField(`legalText.${editKey}`, proposalRichHtml(content), { rich: true })}</div>`;
  }
  if (customHtml?.trim()) {
    return `${sectionTitle(title)}<div style="font-size:11px;line-height:1.55;margin-bottom:14px">${proposalRichHtml(customHtml)}</div>`;
  }
  return `${sectionTitle(title)}${fallbackTable}`;
}

function buildLegalSections(doc: ProposalDoc): string {
  const paymentRows: [string, string][] = PROPOSAL_PAYMENT_TERMS.map((r) => [r.label, r.detail]);
  const cancelRows: [string, string][] = [
    ['Notice Required', 'Notice must be submitted in writing to sales@theantadventures.com.'],
    ...PROPOSAL_CANCELLATION_POLICY.map((r) => [r.notice, r.charge] as [string, string]),
  ];
  const amendRows: [string, string][] = PROPOSAL_AMENDMENT_POLICY.map((r) => [r.label, r.detail]);
  const noteRows: [string, string][] = PROPOSAL_IMPORTANT_NOTES.map((n) => [n.title, n.body]);
  const lt = doc.legalText;
  const defaults = defaultLegalText();

  return `
  ${legalSectionBlock('Payment Terms', lt?.paymentTerms ?? defaults.paymentTerms, kvTable(paymentRows), 'paymentTerms')}
  ${legalSectionBlock('Cancellation Policy', lt?.cancellation ?? defaults.cancellation, kvTable(cancelRows, '34%'), 'cancellation')}
  ${legalSectionBlock('Amendment Policy', lt?.amendment ?? defaults.amendment, kvTable(amendRows, '34%'), 'amendment')}
  ${legalSectionBlock('Important Notes', lt?.importantNotes ?? defaults.importantNotes, kvTable(noteRows, '28%'), 'importantNotes')}
  <div style="margin-top:16px;text-align:center;font-size:10px;color:${MUTED}">THE ANT ADVENTURES · sales@theantadventures.com · www.theantadventures.com</div>`;
}

export function buildProposalHTML(doc: ProposalDoc, origin = ''): string {
  return buildProposalDocumentHTML(doc, origin, false);
}

/** In-document editor canvas: same Material layout with contenteditable fields. */
export function buildProposalEditableHTML(doc: ProposalDoc, origin = ''): string {
  return buildProposalDocumentHTML(doc, origin, true);
}

function buildProposalDocumentHTML(doc: ProposalDoc, origin: string, editableMode: boolean): string {
  const prevEditable = EDITABLE;
  EDITABLE = editableMode;
  try {
  const base = origin.replace(/\/$/, '');
  const logoUrl = doc.logoUrl.startsWith('http') ? doc.logoUrl : `${base}${doc.logoUrl}`;
  const days = doc.days.map((d) => ({
    ...d,
    imageUrls: (d.imageUrls || []).map((url) => absolutizeUrl(url, base)),
    segments: d.segments?.map((seg) => ({
      ...seg,
      imageUrls: (seg.imageUrls || []).map((url) => absolutizeUrl(url, base)),
    })),
  }));
  const docWithLogo = { ...doc, logoUrl, days };

  const body = [
    buildCover(docWithLogo),
    buildOverview(docWithLogo),
    buildFlightsTable(docWithLogo),
    buildBriefItinerary(docWithLogo),
    buildDetailedProgram(docWithLogo),
    buildInclusions(docWithLogo),
    doc.variant === 'b2c' ? buildB2CPricing(docWithLogo) : buildB2BPricing(docWithLogo),
    doc.variant === 'b2c' ? buildLegalSections(docWithLogo) : '',
  ].join('\n');

  const editorStyles = editableMode
    ? `
  .proposal-doc-page { max-width:760px;margin:0 auto;padding:24px 20px 32px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12);min-height:600px; }
  .proposal-edit-field { outline:none;border-radius:2px;transition:box-shadow .12s,background .12s; }
  .proposal-edit-field:hover { box-shadow:0 0 0 1px rgba(46,125,82,.35); }
  .proposal-edit-field:focus { box-shadow:0 0 0 2px rgba(46,125,82,.55);background:rgba(236,246,240,.35); }
  img[contenteditable=false] { user-select:none; pointer-events:none; }
`
    : '';

  const pageWrap = editableMode
    ? `<div class="proposal-doc-page">\n${body}\n</div>`
    : `<div style="max-width:760px;margin:0 auto;padding:4px 0 8px">\n${body}\n</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title></title>
<style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Calibri, 'DM Sans', Arial, Helvetica, sans-serif; font-size: 12px; color: #1a2e23; line-height: 1.45;${editableMode ? ' background:#e8eaed;' : ''} }
  table { border-collapse: collapse; }
  .proposal-day--segments { break-inside: auto; page-break-inside: auto; }
  .proposal-segment-row,
  .proposal-day-single-row,
  .proposal-day--inline { break-inside: avoid; page-break-inside: avoid; }
  .proposal-day-meta { break-before: avoid; page-break-before: avoid; }
  .proposal-day-header-row { break-after: avoid; page-break-after: avoid; }
  ${editorStyles}
  @media print {
    a[href]::after { content: none !important; }
    .proposal-day { margin-bottom: 8px !important; }
    .proposal-segment-row td { padding-top: 8px !important; padding-bottom: 8px !important; }
    .proposal-segment-photos { padding: 8px 10px 4px !important; }
    .proposal-sidebar-img { max-height: 90px !important; }
    .proposal-segment-row td div[style*="white-space:pre-wrap"],
    .proposal-day-single-row td div[style*="white-space:pre-wrap"] {
      orphans: 2;
      widows: 2;
    }
  }
</style>
</head>
<body>
${pageWrap}
</body>
</html>`;
  } finally {
    EDITABLE = prevEditable;
  }
}

export function downloadProposalWord(doc: ProposalDoc, origin = ''): void {
  const html = buildProposalHTML(doc, origin);
  const wordDoc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'></head><body>${html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] || html}</body></html>`;
  const blob = new Blob(['\ufeff', wordDoc], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.quoteRef}-${doc.customerName.replace(/\s+/g, '_')}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

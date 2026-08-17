import { fmt } from '../constants';
import { defaultBookingFields, defaultOverviewRows } from './proposal-content-overrides';
import { proposalRichHtml } from './proposal-rich-text';
import type { ProposalDayDetail, ProposalDaySegment, ProposalDoc, ProposalHotelRate } from './proposal-types';
import {
  PROPOSAL_B2B_FOOTER_NOTE,
  PROPOSAL_FLIGHT_NOTE,
  PROPOSAL_TAGLINE_B2C,
} from './proposal-boilerplate';
import {
  BORDER,
  CSS_BRAND_DARK,
  CSS_FLIGHTS_HEADER,
  CSS_HOTELS_B_HEADER,
  CSS_ROW_ALT,
  CSS_ROW_BLUE,
  CSS_ROW_GREEN,
  CSS_ROW_GREEN_ALT,
  CSS_TABLE_HEADER,
  MUTED,
  editField,
  esc,
  isProposalHtmlEditable,
  sectionTitle,
  templateAnchorAttr,
} from './proposal-html-shared';
import type { ProposalLayoutId } from './proposal-layouts';

export function absolutizeProposalUrl(url: string, base: string): string {
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function prepareProposalDocForRender(doc: ProposalDoc, origin: string): ProposalDoc {
  const base = origin.replace(/\/$/, '');
  const logoUrl = doc.logoUrl.startsWith('http') ? doc.logoUrl : `${base}${doc.logoUrl}`;
  const days = doc.days.map((d) => ({
    ...d,
    imageUrls: (d.imageUrls || []).map((url) => absolutizeProposalUrl(url, base)),
    segments: d.segments?.map((seg) => ({
      ...seg,
      imageUrls: (seg.imageUrls || []).map((url) => absolutizeProposalUrl(url, base)),
    })),
  }));
  return { ...doc, logoUrl, days };
}

function thCell(text: string, align: 'left' | 'right' | 'center' = 'left'): string {
  return `<th style="padding:7px 10px;border:1px solid ${BORDER};text-align:${align};font-weight:700;font-size:11px;background:${CSS_TABLE_HEADER};color:#fff">${esc(text)}</th>`;
}

function tdCell(text: string, opts?: { bold?: boolean; align?: string; bg?: string }): string {
  const align = opts?.align || 'left';
  const bg = opts?.bg || '#fff';
  const weight = opts?.bold ? 'font-weight:700;' : '';
  return `<td style="padding:7px 10px;border:1px solid ${BORDER};vertical-align:top;font-size:11.5px;${weight}text-align:${align};background:${bg}">${text}</td>`;
}

function thCellColored(text: string, bg: string, align: 'left' | 'right' | 'center' = 'left'): string {
  return `<th style="padding:7px 10px;border:1px solid ${BORDER};text-align:${align};font-weight:700;font-size:11px;background:${bg};color:#fff">${esc(text)}</th>`;
}

export function coverBookingRows(doc: ProposalDoc): [string, string][] {
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

export function resolveOverviewRows(doc: ProposalDoc): [string, string, string][] {
  return (doc.overviewRows ?? defaultOverviewRows(doc)).map((r) => [r.label, r.optionA, r.optionB]);
}

export function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export function bookingTableHtml(doc: ProposalDoc, opts?: { compact?: boolean }): string {
  const pad = opts?.compact ? '4px 8px' : '6px 10px';
  const bookingRows = coverBookingRows(doc);
  return bookingRows
    .map(
      ([l, v]) =>
        `<tr${templateAnchorAttr(`booking.${l}`)}><td style="padding:${pad};border:1px solid ${BORDER};font-weight:600;width:28%;background:${CSS_ROW_ALT}">${esc(l)}</td><td style="padding:${pad};border:1px solid ${BORDER}">${editField(`bookingFields.${encodeURIComponent(l)}`, esc(v))}</td></tr>`
    )
    .join('');
}

export function specialNotesBlock(doc: ProposalDoc): string {
  return `<div style="margin-top:10px">
    <div style="font-weight:600;font-size:11px;color:${CSS_BRAND_DARK};margin-bottom:4px">Special Notes / Requirements</div>
    <div style="font-size:11.5px;color:${MUTED};line-height:1.55;padding:8px 10px;border:1px dashed ${BORDER};border-radius:6px;background:#FAFBFA">${editField('specialNotes', proposalRichHtml(doc.specialNotes), { rich: true })}</div>
  </div>`;
}

/** Classic corporate cover — logo centered + booking table. */
export function buildCover(doc: ProposalDoc): string {
  const isB2c = doc.variant === 'b2c';
  const bookingTitle = isB2c ? 'YOUR BOOKING DETAILS' : 'CLIENT & BOOKING DETAILS';
  const bookingTable = bookingTableHtml(doc);

  return `
  <div class="proposal-cover-classic" style="text-align:center;margin-bottom:20px;padding-bottom:4px">
    ${isB2c ? `<div style="font-size:11px;color:${MUTED};font-style:italic;margin-bottom:8px;letter-spacing:0.3px">${PROPOSAL_TAGLINE_B2C}</div>` : ''}
    <img src="${esc(doc.logoUrl)}" alt="The Ant Adventures"${isProposalHtmlEditable() ? ' contenteditable="false"' : ''} style="height:56px;margin-bottom:10px" />
    <div style="font-size:10px;color:${MUTED};margin-bottom:14px">www.theantadventures.com</div>
    <div style="font-size:20px;font-weight:700;color:${CSS_BRAND_DARK};letter-spacing:0.4px;margin-bottom:6px">${editField('tourTitle', esc(doc.tourTitle))}</div>
    <div style="font-size:12px;color:${MUTED};margin-bottom:4px">${esc(doc.durationLabel)} | ${esc(doc.route)}</div>
    <div${templateAnchorAttr('tagline')} style="font-size:12px;color:#1a2e23;line-height:1.6;max-width:620px;margin:0 auto;font-style:italic">${editField('tagline', proposalRichHtml(doc.tagline), { rich: true })}</div>
  </div>
  ${sectionTitle(bookingTitle)}
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">${bookingTable}</table>
  ${specialNotesBlock(doc)}`;
}

export function buildOverview(doc: ProposalDoc, layoutId: ProposalLayoutId = 'classic'): string {
  const rows = resolveOverviewRows(doc);
  const cellPad = layoutId === 'compact' ? '4px 7px' : '7px 10px';
  const borderStyle = layoutId === 'modern' ? `border-bottom:1px solid ${BORDER};border-top:none;border-left:none;border-right:none` : `border:1px solid ${BORDER}`;
  const body = rows
    .map(
      ([label, a, b], i) =>
        `<tr style="background:${i % 2 ? CSS_ROW_ALT : '#fff'}"><td style="padding:${cellPad};${borderStyle};font-weight:600;width:22%">${editField(`overviewRows.${i}.label`, esc(label))}</td><td style="padding:${cellPad};${borderStyle}">${editField(`overviewRows.${i}.optionA`, esc(a))}</td><td style="padding:${cellPad};${borderStyle}">${editField(`overviewRows.${i}.optionB`, esc(b))}</td></tr>`
    )
    .join('');

  const headBorder = layoutId === 'modern' ? 'border:none' : `border:1px solid ${BORDER}`;
  return `${sectionTitle('Tour Overview')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
    <thead><tr>
      <th style="padding:${cellPad};${headBorder};text-align:left;font-weight:700;font-size:11px;background:${CSS_TABLE_HEADER};color:#fff">Detail</th>
      <th style="padding:${cellPad};${headBorder};text-align:left;font-weight:700;font-size:11px;background:${CSS_TABLE_HEADER};color:#fff">Option A — 4★</th>
      <th style="padding:${cellPad};${headBorder};text-align:left;font-weight:700;font-size:11px;background:${CSS_TABLE_HEADER};color:#fff">Option B — 5★</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

export function buildFlightsTable(doc: ProposalDoc, layoutId: ProposalLayoutId = 'classic'): string {
  if (!doc.flights.length) return '';
  const cellPad = layoutId === 'compact' ? '5px 8px' : '7px 10px';
  const rows = doc.flights
    .map(
      (f) =>
        `<tr><td style="padding:${cellPad};border:1px solid ${BORDER};text-align:center">${f.index}</td><td style="padding:${cellPad};border:1px solid ${BORDER}"><b>${esc(f.route)}</b></td><td style="padding:${cellPad};border:1px solid ${BORDER}">${esc(f.sector)}</td><td style="padding:${cellPad};border:1px solid ${BORDER}">${esc(f.airline)}</td><td style="padding:${cellPad};border:1px solid ${BORDER}">${esc(f.dateLabel)}</td></tr>`
    )
    .join('');

  return `${sectionTitle('Domestic Flights Included')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:6px">
    <thead><tr>${thCell('#', 'center')}${thCell('Route')}${thCell('Sector')}${thCell('Airline')}${thCell('Date')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div style="font-size:10.5px;color:${MUTED};font-style:italic;margin-bottom:8px">${PROPOSAL_FLIGHT_NOTE}</div>`;
}

export function buildBriefItinerary(doc: ProposalDoc, layoutId: ProposalLayoutId = 'classic'): string {
  if (!doc.itineraryGlance.length) return '';
  const cellPad = layoutId === 'compact' ? '4px 7px' : '7px 10px';
  const fontSize = layoutId === 'compact' ? '10.5px' : '11.5px';
  const rows = doc.itineraryGlance
    .map(
      (r, i) =>
        `<tr style="background:${i % 2 ? '#F7F8F6' : '#fff'}"><td style="padding:${cellPad};border:1px solid ${BORDER};font-weight:700;text-align:center;font-size:${fontSize}">${r.dayNumber}</td><td style="padding:${cellPad};border:1px solid ${BORDER};white-space:nowrap;font-size:${fontSize}">${esc(r.dateLabel)}</td><td style="padding:${cellPad};border:1px solid ${BORDER};font-size:${fontSize}">${editField(`itineraryGlance.${i}.destination`, esc(r.destination))}</td><td style="padding:${cellPad};border:1px solid ${BORDER};font-size:${fontSize}">${editField(`itineraryGlance.${i}.theme`, esc(r.theme))}</td><td style="padding:${cellPad};border:1px solid ${BORDER};font-size:${fontSize}">${editField(`itineraryGlance.${i}.hotel`, esc(r.hotel))}</td></tr>`
    )
    .join('');

  return `${sectionTitle('Brief Itinerary at a Glance')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
    <thead><tr>${thCell('Day', 'center')}${thCell('Date')}${thCell('Destination')}${thCell('Theme')}${thCell('Hotel (4★)')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildPhotoImgs(urls: string[]): string {
  return urls.map((url) => `<img class="proposal-sidebar-img" src="${esc(url)}" alt="" />`).join('');
}

function buildPhotoFill(urls: string[], limit = 2): string {
  const picked = uniqueUrls(urls).slice(0, limit);
  if (!picked.length) return '';
  return `<div class="proposal-photo-stack">${buildPhotoImgs(picked)}</div>`;
}

function buildSegmentPhotoSidebar(
  urls: string[],
  dayNumber: number | undefined,
  showLabel: boolean,
  layoutId: ProposalLayoutId,
  photoLimit: number
): string {
  if (photoLimit === 0) return '';
  const photos = buildPhotoFill(urls, photoLimit);
  const label =
    showLabel && dayNumber != null
      ? `<div class="proposal-photo-day-label">Day ${dayNumber}</div>`
      : '';
  return `<td class="proposal-segment-photos proposal-photo-col">
      <div class="proposal-photo-col-inner">${label}${photos}</div>
    </td>`;
}

function buildDayPhotoSidebar(d: ProposalDayDetail, layoutId: ProposalLayoutId, photoLimit: number): string {
  if (photoLimit === 0) return '';
  const urls = uniqueUrls(d.imageUrls || []);
  const photos = buildPhotoFill(urls, photoLimit);
  const label = `<div class="proposal-photo-day-label">Day ${d.dayNumber}</div>`;
  if (!photos) {
    return `<td class="proposal-photo-col">
      <div class="proposal-photo-col-inner">${label}</div>
    </td>`;
  }
  return `<td class="proposal-photo-col">
      <div class="proposal-photo-col-inner">${label}${photos}</div>
    </td>`;
}

function buildSegmentSidebarRow(
  seg: ProposalDaySegment,
  dayNumber: number,
  segIdx: number,
  layoutId: ProposalLayoutId,
  photoLimit: number
): string {
  const dn = dayNumber;
  const bodySize = layoutId === 'compact' ? '10.5px' : '11.5px';
  const title = `<div style="font-weight:600;font-size:12px;margin-bottom:6px;color:${CSS_BRAND_DARK}">${editField(`days.${dn}.segments.${segIdx}.title`, esc(seg.title))}</div>`;
  const body = `<div class="proposal-day-body" style="font-size:${bodySize};line-height:1.65;color:#1a2e23">${editField(`days.${dn}.segments.${segIdx}.body`, proposalRichHtml(seg.body), { rich: true })}</div>`;
  const photoCol = buildSegmentPhotoSidebar(seg.imageUrls || [], dayNumber, segIdx === 0, layoutId, photoLimit);
  const contentWidth = photoCol ? '72%' : '100%';
  return `<tr class="proposal-segment-row">
          <td style="width:${contentWidth};vertical-align:top;padding:10px 14px 10px 14px;border-top:1px solid ${BORDER}">
            ${title}${body}
          </td>
          ${photoCol}
        </tr>`;
}

function buildDayMeta(d: ProposalDayDetail, layoutId: ProposalLayoutId): string {
  const dn = d.dayNumber;
  const size = layoutId === 'compact' ? '10px' : '11px';
  return `<div style="margin-top:4px;font-size:${size};color:#1a2e23"><b style="color:${CSS_BRAND_DARK}">Hotel:</b> ${editField(`days.${dn}.hotel`, esc(d.hotel))}</div>
      <div style="font-size:${size};color:#1a2e23"><b style="color:${CSS_BRAND_DARK}">Meals:</b> ${editField(`days.${dn}.meals`, esc(d.meals))}</div>`;
}

function buildDayContentBody(d: ProposalDayDetail, layoutId: ProposalLayoutId): string {
  const dn = d.dayNumber;
  const bodySize = layoutId === 'compact' ? '10.5px' : '11.5px';
  if (d.segments?.length) {
    return d.segments
      .map((seg, i) => {
        const title = `<div style="font-weight:600;font-size:12px;margin-bottom:6px;color:${CSS_BRAND_DARK}">${editField(`days.${dn}.segments.${i}.title`, esc(seg.title))}</div>`;
        const body = `<div class="proposal-day-body" style="font-size:${bodySize};line-height:1.65;color:#1a2e23">${editField(`days.${dn}.segments.${i}.body`, proposalRichHtml(seg.body), { rich: true })}</div>`;
        const gap = i > 0 ? 'margin-top:14px;' : '';
        return `<div style="${gap}">${title}${body}</div>`;
      })
      .join('');
  }

  const title = `<div style="font-weight:600;font-size:12px;margin-bottom:8px;color:${CSS_BRAND_DARK}">${editField(`days.${dn}.title`, esc(d.title))}</div>`;
  const body = `<div class="proposal-day-body" style="font-size:${bodySize};line-height:1.65;color:#1a2e23">${editField(`days.${dn}.body`, proposalRichHtml(d.body), { rich: true })}</div>`;
  return `${title}${body}`;
}

/** Classic detailed program — text + sidebar photos. */
export function buildDetailedProgram(doc: ProposalDoc, layoutId: ProposalLayoutId = 'classic'): string {
  if (!doc.days.length) return '';

  const photoLimit = 2;
  const dayMargin = '14px';
  const dayRadius = '4px';

  const blocks = doc.days
    .map((d) => {
      const header = `<div style="font-weight:700;font-size:13px;color:${CSS_BRAND_DARK};margin-bottom:6px">DAY ${d.dayNumber} | ${esc(d.dateLabel)} | ${esc(d.destination)}</div>`;
      const content = buildDayContentBody(d, layoutId);
      const meta = buildDayMeta(d, layoutId);

      if (d.segments?.length) {
        const segmentRows = d.segments
          .map((seg, si) => buildSegmentSidebarRow(seg, d.dayNumber, si, layoutId, photoLimit))
          .join('');
        return `
    <div class="proposal-day proposal-day--segments" style="margin-bottom:${dayMargin};border:1px solid ${BORDER};border-radius:${dayRadius};overflow:hidden;background:#fff">
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

      const photoCol = buildDayPhotoSidebar(d, layoutId, photoLimit);
      return `
    <div class="proposal-day proposal-day--single" style="margin-bottom:${dayMargin};border:1px solid ${BORDER};border-radius:${dayRadius};overflow:hidden;background:#fff">
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

export function buildDayNarrative(d: ProposalDayDetail): string {
  return buildDayContentBody(d, 'classic');
}

export function buildDayMetaLines(d: ProposalDayDetail): string {
  return buildDayMeta(d, 'classic');
}

function buildHotelRatesTable(
  rates: ProposalHotelRate[],
  total: number,
  emptyHint: string,
  headerBg = CSS_TABLE_HEADER
): string {
  const hotelRows = rates
    .map(
      (h, i) =>
        `<tr style="background:${i % 2 ? CSS_ROW_ALT : '#fff'}"><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(h.hotelName || 'TBC')}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(h.location)}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(h.stayFrom)} – ${esc(h.stayTo)}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(h.roomType)}</td><td style="padding:6px 10px;border:1px solid ${BORDER};text-align:center">${h.nights}</td><td style="padding:6px 10px;border:1px solid ${BORDER};text-align:right">$${fmt(h.ratePerNight)}</td><td style="padding:6px 10px;border:1px solid ${BORDER};text-align:right"><b>$${fmt(h.ratePerNight * h.nights)}</b></td></tr>`
    )
    .join('');

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:11px">
    <thead><tr>${thCellColored('Hotel', headerBg)}${thCellColored('Location', headerBg)}${thCellColored('Stay', headerBg)}${thCellColored('Room Type', headerBg)}${thCellColored('Nts', headerBg, 'center')}${thCellColored('Price/Night', headerBg, 'right')}${thCellColored('Total (USD)', headerBg, 'right')}</tr></thead>
    <tbody>${hotelRows || `<tr><td colspan="7" style="padding:10px;color:${MUTED}">${esc(emptyHint)}</td></tr>`}</tbody>
    <tfoot><tr style="background:${CSS_ROW_GREEN}"><td colspan="6" style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700">TOTAL HOTELS</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right;font-weight:700">$${fmt(total)}</td></tr></tfoot>
  </table>`;
}

export function buildB2CPricing(doc: ProposalDoc): string {
  if (doc.pricing.kind !== 'b2c') return '';
  const p = doc.pricing;
  const packageLabel = doc.pricingText?.packageLabel ?? p.packageLabel;
  const footnote =
    doc.pricingText?.footnote ??
    'All prices are quoted in USD and include applicable taxes. Rates are valid for the travel dates specified and subject to availability at time of booking confirmation.';
  return `<div${templateAnchorAttr('pricing')}>${sectionTitle('Quoting Pricing')}
  <div style="font-size:11px;color:${MUTED};margin-bottom:8px">All prices USD · ${esc(p.seasonNote)}</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${thCell('Package')}${thCell('Per Person (USD)', 'right')}${thCell(`Total ${p.pax} Pax (USD)`, 'right')}</tr></thead>
    <tbody>
      <tr style="background:${CSS_ROW_GREEN_ALT}">
        ${tdCell(`${editField('pricingText.packageLabel', `<b>${esc(packageLabel)}</b>`, { rich: true })}<br><span style="font-size:10.5px;color:${MUTED}">${esc(doc.accommodationOptionA)} · Private Touring · Domestic Flights · All Taxes Included</span>`)}
        ${tdCell(`$${fmt(p.perPerson)}`, { align: 'right', bold: true, bg: CSS_ROW_GREEN_ALT })}
        ${tdCell(`$${fmt(p.groupTotal)}`, { align: 'right', bold: true, bg: CSS_ROW_GREEN_ALT })}
      </tr>
    </tbody>
  </table>
  <div${templateAnchorAttr('pricing.footnote')} style="font-size:10.5px;color:${MUTED};font-style:italic">${editField('pricingText.footnote', proposalRichHtml(footnote), { rich: true })}</div></div>`;
}

export function buildB2BPricing(doc: ProposalDoc): string {
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

  return `<div${templateAnchorAttr('pricing')}>${sectionTitle('Sample Quotation — B2B Net Rates')}
  <div style="font-size:11px;color:${MUTED};margin-bottom:10px">All prices USD · ${esc(p.seasonNote)}</div>

  <div style="font-weight:700;font-size:11.5px;color:${CSS_BRAND_DARK};margin:12px 0 6px">A. TOURINGS</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${thCellColored('Service Description', CSS_TABLE_HEADER)}${thCellColored('Per Pax (USD)', CSS_TABLE_HEADER, 'right')}${thCellColored(`Total ${p.pax} Pax (USD)`, CSS_TABLE_HEADER, 'right')}</tr></thead>
    <tbody>
      <tr><td${templateAnchorAttr('pricing.b2bGroundDesc')} style="padding:7px 10px;border:1px solid ${BORDER}">${editField('pricingText.b2bGroundDesc', proposalRichHtml(groundDesc), { rich: true })}</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right">$${fmt(p.touringsPerPax)}</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right"><b>$${fmt(p.touringsTotal)}</b></td></tr>
      <tr style="background:${CSS_ROW_GREEN}"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700" colspan="2">TOTAL TOURINGS</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right;font-weight:700">$${fmt(p.touringsTotal)}</td></tr>
    </tbody>
  </table>

  <div style="font-weight:700;font-size:11.5px;color:${CSS_FLIGHTS_HEADER};margin:12px 0 6px">B. DOMESTIC FLIGHTS</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${thCellColored('Service Description', CSS_FLIGHTS_HEADER)}${thCellColored('Per Pax (USD)', CSS_FLIGHTS_HEADER, 'right')}${thCellColored(`Total ${p.pax} Pax (USD)`, CSS_FLIGHTS_HEADER, 'right')}</tr></thead>
    <tbody>
      <tr><td${templateAnchorAttr('pricing.b2bFlightsDesc')} style="padding:7px 10px;border:1px solid ${BORDER}">${editField('pricingText.b2bFlightsDesc', proposalRichHtml(flightsDesc), { rich: true })}</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right">$${fmt(p.flightsPerPax)}</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right"><b>$${fmt(p.flightsTotal)}</b></td></tr>
      <tr style="background:${CSS_ROW_BLUE}"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700" colspan="2">TOTAL FLIGHTS</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right;font-weight:700">$${fmt(p.flightsTotal)}</td></tr>
    </tbody>
  </table>

  <div style="font-weight:700;font-size:11.5px;color:${CSS_BRAND_DARK};margin:12px 0 6px">C. HOTELS — OPTION A (${esc(optionALabel)})</div>
  ${buildHotelRatesTable(p.hotelRatesOptionA, p.hotelsTotalOptionA, 'Add hotel rates in the Export step.', CSS_TABLE_HEADER)}

  <div style="font-weight:700;font-size:11.5px;color:${CSS_HOTELS_B_HEADER};margin:12px 0 6px">C. HOTELS — OPTION B (${esc(optionBLabel)})</div>
  ${buildHotelRatesTable(p.hotelRatesOptionB, p.hotelsTotalOptionB, 'Enter Option B (5★) hotel names and net rates in the Export step.', CSS_HOTELS_B_HEADER)}

  <div${templateAnchorAttr('pricing.footnote')} style="font-size:10.5px;color:${MUTED};font-style:italic;margin-top:10px">${editField('pricingText.footnote', proposalRichHtml(footnote), { rich: true })}</div>
  <div style="margin-top:16px;text-align:center;font-size:10px;color:${MUTED}">THE ANT ADVENTURES · sales@theantadventures.com · www.theantadventures.com</div></div>`;
}

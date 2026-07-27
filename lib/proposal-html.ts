import { fmt } from './constants';
import { openPrintWindow } from './print-window';
import type { ProposalDoc, ProposalVariant } from './proposal-types';
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

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

function buildCover(doc: ProposalDoc): string {
  const isB2c = doc.variant === 'b2c';
  const bookingTitle = isB2c ? 'YOUR BOOKING DETAILS' : 'CLIENT &amp; BOOKING DETAILS';

  const bookingRows: [string, string][] = [
    ['Quote Ref.', doc.quoteRef],
    ...(isB2c
      ? [['Travel Dates', doc.travelDateRange] as [string, string]]
      : [['Agent / Company', doc.agentName || 'To be confirmed'] as [string, string]]),
    ['Guest Name(s)', doc.customerName],
    ...(isB2c
      ? [[`Your Consultant`, `${doc.consultant.name} | ${doc.consultant.email}`] as [string, string]]
      : [[`Sales Person`, `${doc.consultant.name} | ${doc.consultant.email}`] as [string, string]]),
    ['Nationality', doc.brief.nationality || 'To be confirmed'],
    ['Prepared Date', doc.preparedDate],
    [isB2c ? 'No. of Guests' : 'No. of Passengers', doc.guestCountLabel],
    ['Valid Until', doc.validUntil],
    ['Rooming', doc.rooming],
    ...(isB2c
      ? [['Payment Terms', '30% deposit to confirm · Balance 60 days prior to departure'] as [string, string]]
      : [['Commission', 'As per agent agreement'] as [string, string]]),
    ...(!isB2c ? [['Travel Dates', doc.travelDateRange] as [string, string]] : []),
  ];

  const bookingTable = bookingRows
    .map(
      ([l, v]) =>
        `<tr><td style="padding:6px 10px;border:1px solid ${BORDER};font-weight:600;width:28%;background:#F7F8F6">${esc(l)}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(v)}</td></tr>`
    )
    .join('');

  return `
  <div style="text-align:center;margin-bottom:18px">
    ${isB2c ? `<div style="font-size:11px;color:${MUTED};font-style:italic;margin-bottom:8px;letter-spacing:0.3px">${PROPOSAL_TAGLINE_B2C}</div>` : ''}
    <img src="${esc(doc.logoUrl)}" alt="The Ant Adventures" style="height:56px;margin-bottom:10px" />
    <div style="font-size:10px;color:${MUTED};margin-bottom:14px">www.theantadventures.com</div>
    <div style="font-size:20px;font-weight:700;color:${BRAND_DARK};letter-spacing:0.4px;margin-bottom:6px">${esc(doc.tourTitle)}</div>
    <div style="font-size:12px;color:${MUTED};margin-bottom:4px">${esc(doc.durationLabel)} | ${esc(doc.route)}</div>
    <div style="font-size:12px;color:#1a2e23;line-height:1.6;max-width:620px;margin:0 auto;font-style:italic">${esc(doc.tagline)}</div>
  </div>
  ${sectionTitle(bookingTitle)}
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">${bookingTable}</table>
  <div style="margin-top:10px">
    <div style="font-weight:600;font-size:11px;color:${BRAND_DARK};margin-bottom:4px">Special Notes / Requirements</div>
    <div style="font-size:11.5px;color:${MUTED};line-height:1.55;padding:8px 10px;border:1px dashed ${BORDER};border-radius:6px;background:#FAFBFA">${esc(doc.specialNotes)}</div>
  </div>`;
}

function buildOverview(doc: ProposalDoc): string {
  const rows = [
    ['Duration', doc.durationLabel, doc.durationLabel],
    ['Travel Dates', doc.travelDateRange, doc.travelDateRange],
    ['Season', doc.season, doc.season],
    ['Guests', `${doc.guestCountLabel} (private tour)`, `${doc.guestCountLabel} (private tour)`],
    ['Route', doc.route, doc.route],
    [
      'Domestic Flights',
      doc.flights.length ? doc.flights.map((f) => f.route).join(' + ') + ' included' : 'Land only / TBC',
      doc.flights.length ? doc.flights.map((f) => f.route).join(' + ') + ' included' : 'Land only / TBC',
    ],
    ['Accommodation', doc.accommodationOptionA, doc.accommodationOptionB],
    ['Guide', `${doc.brief.language}-speaking, private, per region`, `${doc.brief.language}-speaking, private, per region`],
    ['Transport', 'Private A/C vehicle throughout', 'Private A/C vehicle throughout'],
    ['Format', 'Private, fully customisable', 'Private, fully customisable'],
  ];

  const body = rows
    .map(
      ([label, a, b], i) =>
        `<tr style="background:${i % 2 ? '#F7F8F6' : '#fff'}"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:600;width:22%">${esc(label)}</td><td style="padding:7px 10px;border:1px solid ${BORDER}">${esc(a)}</td><td style="padding:7px 10px;border:1px solid ${BORDER}">${esc(b)}</td></tr>`
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
        `<tr style="background:${i % 2 ? '#F7F8F6' : '#fff'}"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700;text-align:center">${r.dayNumber}</td><td style="padding:7px 10px;border:1px solid ${BORDER};white-space:nowrap">${esc(r.dateLabel)}</td><td style="padding:7px 10px;border:1px solid ${BORDER}">${esc(r.destination)}</td><td style="padding:7px 10px;border:1px solid ${BORDER}">${esc(r.theme)}</td><td style="padding:7px 10px;border:1px solid ${BORDER}">${esc(r.hotel)}</td></tr>`
    )
    .join('');

  return `${sectionTitle('Brief Itinerary at a Glance')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
    <thead><tr>${thCell('Day', 'center')}${thCell('Date')}${thCell('Destination')}${thCell('Theme')}${thCell('Hotel (4★)')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildDayPhotoSidebar(d: import('./proposal-types').ProposalDayDetail): string {
  const urls = (d.imageUrls || []).slice(0, 2);
  if (!urls.length) {
    return `<td style="width:28%;vertical-align:top;background:#E8F5EE;border-left:1px solid ${BORDER};padding:12px 10px;text-align:center">
      <div style="font-weight:700;font-size:12px;color:${BRAND_DARK}">Day ${d.dayNumber}</div>
    </td>`;
  }
  const imgs = urls
    .map(
      (url) =>
        `<img src="${esc(url)}" alt="" style="width:100%;height:auto;max-height:118px;object-fit:cover;border-radius:2px;display:block;margin:0 0 8px" />`
    )
    .join('');
  return `<td style="width:28%;vertical-align:top;background:#E8F5EE;border-left:1px solid ${BORDER};padding:12px 10px 6px;text-align:center">
      <div style="font-weight:700;font-size:12px;color:${BRAND_DARK};margin-bottom:8px">Day ${d.dayNumber}</div>
      ${imgs}
    </td>`;
}

function buildDayPhotoInline(d: import('./proposal-types').ProposalDayDetail): string {
  const urls = (d.imageUrls || []).slice(0, 2);
  if (!urls.length) return '';
  const images = urls
    .map(
      (url) =>
        `<img src="${esc(url)}" alt="" style="width:100%;height:140px;object-fit:cover;border-radius:4px;display:block" />`
    )
    .join('');
  return `<div style="display:grid;grid-template-columns:repeat(${urls.length},1fr);gap:8px;margin:10px 0 4px">${images}</div>`;
}

function buildDetailedProgram(doc: ProposalDoc): string {
  if (!doc.days.length) return '';
  const layout = doc.detailedProgramLayout === 'inline' ? 'inline' : 'sidebar';

  const blocks = doc.days
    .map((d) => {
      const header = `<div style="font-weight:700;font-size:13px;color:${BRAND_DARK};margin-bottom:6px">DAY ${d.dayNumber} | ${esc(d.dateLabel)} | ${esc(d.destination)}</div>`;
      const title = `<div style="font-weight:600;font-size:12px;margin-bottom:8px;color:${BRAND_DARK}">${esc(d.title)}</div>`;
      const body = `<div style="font-size:11.5px;line-height:1.65;color:#1a2e23;white-space:pre-wrap">${esc(d.body)}</div>`;
      const meta = `<div style="margin-top:10px;font-size:11px;color:#1a2e23"><b style="color:${BRAND_DARK}">Hotel:</b> ${esc(d.hotel)}</div>
      <div style="font-size:11px;color:#1a2e23"><b style="color:${BRAND_DARK}">Meals:</b> ${esc(d.meals)}</div>`;

      if (layout === 'inline') {
        return `
    <div style="page-break-inside:avoid;margin-bottom:14px;border:1px solid ${BORDER};border-radius:4px;padding:14px 14px 12px;background:#fff">
      ${header}
      ${title}
      ${body}
      ${buildDayPhotoInline(d)}
      ${meta}
    </div>`;
      }

      const photoCol = buildDayPhotoSidebar(d);
      return `
    <div style="page-break-inside:avoid;margin-bottom:14px;border:1px solid ${BORDER};border-radius:4px;overflow:hidden;background:#fff">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="width:72%;vertical-align:top;padding:14px 14px 12px">
            ${header}
            ${title}
            ${body}
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
  const max = Math.max(doc.inclusions.length, doc.exclusions.length);
  const rows: string[] = [];
  for (let i = 0; i < max; i++) {
    const incl = doc.inclusions[i];
    const excl = doc.exclusions[i];
    const bg = i % 2 ? ROW_ALT : '#fff';
    rows.push(`<tr>
      <td style="padding:7px 10px;border:1px solid ${BORDER};background:${bg};width:24px;color:${BRAND};font-weight:700;vertical-align:top">${incl ? '✓' : ''}</td>
      <td style="padding:7px 10px;border:1px solid ${BORDER};background:${bg};font-size:11px;vertical-align:top;width:46%">${incl ? esc(incl) : ''}</td>
      <td style="padding:7px 10px;border:1px solid ${BORDER};background:${ROW_GREEN};width:24px;color:#c0392b;font-weight:700;vertical-align:top">${excl ? '✗' : ''}</td>
      <td style="padding:7px 10px;border:1px solid ${BORDER};background:${ROW_GREEN};font-size:11px;vertical-align:top">${excl ? esc(excl) : ''}</td>
    </tr>`);
  }

  return `${sectionTitle('Inclusions &amp; Exclusions')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead>
      <tr>
        <th colspan="2" style="padding:8px 10px;border:1px solid ${BORDER};background:${BRAND};color:#fff;font-size:11px;font-weight:700;text-align:left;letter-spacing:0.4px">INCLUSIONS</th>
        <th colspan="2" style="padding:8px 10px;border:1px solid ${BORDER};background:${EXCL_HEADER};color:#fff;font-size:11px;font-weight:700;text-align:left;letter-spacing:0.4px">EXCLUSIONS</th>
      </tr>
    </thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

function buildB2CPricing(doc: ProposalDoc): string {
  if (doc.pricing.kind !== 'b2c') return '';
  const p = doc.pricing;
  return `${sectionTitle('Quoting Pricing')}
  <div style="font-size:11px;color:${MUTED};margin-bottom:8px">All prices USD · ${esc(p.seasonNote)}</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${thCell('Package')}${thCell('Per Person (USD)', 'right')}${thCell(`Total ${p.pax} Pax (USD)`, 'right')}</tr></thead>
    <tbody>
      <tr style="background:${ROW_GREEN_ALT}">
        ${tdCell(`<b>${esc(p.packageLabel)}</b><br><span style="font-size:10.5px;color:${MUTED}">${esc(doc.accommodationOptionA)} · Private Touring · Domestic Flights · All Taxes Included</span>`)}
        ${tdCell(`$${fmt(p.perPerson)}`, { align: 'right', bold: true, bg: ROW_GREEN_ALT })}
        ${tdCell(`$${fmt(p.groupTotal)}`, { align: 'right', bold: true, bg: ROW_GREEN_ALT })}
      </tr>
    </tbody>
  </table>
  <div style="font-size:10.5px;color:${MUTED};font-style:italic">All prices are quoted in USD and include applicable taxes. Rates are valid for the travel dates specified and subject to availability at time of booking confirmation.</div>`;
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

  return `${sectionTitle('Sample Quotation — B2B Net Rates')}
  <div style="font-size:11px;color:${MUTED};margin-bottom:10px">All prices USD · ${esc(p.seasonNote)}</div>

  <div style="font-weight:700;font-size:11.5px;color:${BRAND_DARK};margin:12px 0 6px">A. TOURINGS</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${thCellColored('Service Description', BRAND)}${thCellColored('Per Pax (USD)', BRAND, 'right')}${thCellColored(`Total ${p.pax} Pax (USD)`, BRAND, 'right')}</tr></thead>
    <tbody>
      <tr><td style="padding:7px 10px;border:1px solid ${BORDER}">Ground arrangements — private tour (transfers, guide, vehicle, activities &amp; entrance fees as per program)</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right">$${fmt(p.touringsPerPax)}</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right"><b>$${fmt(p.touringsTotal)}</b></td></tr>
      <tr style="background:${ROW_GREEN}"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700" colspan="2">TOTAL TOURINGS</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right;font-weight:700">$${fmt(p.touringsTotal)}</td></tr>
    </tbody>
  </table>

  <div style="font-weight:700;font-size:11.5px;color:${FLIGHTS_HEADER};margin:12px 0 6px">B. DOMESTIC FLIGHTS</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${thCellColored('Service Description', FLIGHTS_HEADER)}${thCellColored('Per Pax (USD)', FLIGHTS_HEADER, 'right')}${thCellColored(`Total ${p.pax} Pax (USD)`, FLIGHTS_HEADER, 'right')}</tr></thead>
    <tbody>
      <tr><td style="padding:7px 10px;border:1px solid ${BORDER}">Domestic flights as per program · Economy class</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right">$${fmt(p.flightsPerPax)}</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right"><b>$${fmt(p.flightsTotal)}</b></td></tr>
      <tr style="background:${ROW_BLUE}"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700" colspan="2">TOTAL FLIGHTS</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right;font-weight:700">$${fmt(p.flightsTotal)}</td></tr>
    </tbody>
  </table>

  <div style="font-weight:700;font-size:11.5px;color:${BRAND_DARK};margin:12px 0 6px">C. HOTELS — OPTION A (${esc(optionALabel)})</div>
  ${buildHotelRatesTable(p.hotelRatesOptionA, p.hotelsTotalOptionA, 'Add hotel rates in the Export step.', BRAND)}

  <div style="font-weight:700;font-size:11.5px;color:${HOTELS_B_HEADER};margin:12px 0 6px">C. HOTELS — OPTION B (${esc(optionBLabel)})</div>
  ${buildHotelRatesTable(p.hotelRatesOptionB, p.hotelsTotalOptionB, 'Enter Option B (5★) hotel names and net rates in the Export step.', HOTELS_B_HEADER)}

  <div style="font-size:10.5px;color:${MUTED};font-style:italic;margin-top:10px">${PROPOSAL_B2B_FOOTER_NOTE}</div>
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

function buildLegalSections(): string {
  const paymentRows: [string, string][] = PROPOSAL_PAYMENT_TERMS.map((r) => [r.label, r.detail]);
  const cancelRows: [string, string][] = [
    ['Notice Required', 'Notice must be submitted in writing to sales@theantadventures.com.'],
    ...PROPOSAL_CANCELLATION_POLICY.map((r) => [r.notice, r.charge] as [string, string]),
  ];
  const amendRows: [string, string][] = PROPOSAL_AMENDMENT_POLICY.map((r) => [r.label, r.detail]);
  const noteRows: [string, string][] = PROPOSAL_IMPORTANT_NOTES.map((n) => [n.title, n.body]);

  return `
  ${sectionTitle('Payment Terms')}
  ${kvTable(paymentRows)}
  ${sectionTitle('Cancellation Policy')}
  ${kvTable(cancelRows, '34%')}
  ${sectionTitle('Amendment Policy')}
  ${kvTable(amendRows, '34%')}
  ${sectionTitle('Important Notes')}
  ${kvTable(noteRows, '28%')}
  <div style="margin-top:16px;text-align:center;font-size:10px;color:${MUTED}">THE ANT ADVENTURES · sales@theantadventures.com · www.theantadventures.com</div>`;
}

export function buildProposalHTML(doc: ProposalDoc, origin = ''): string {
  const base = origin.replace(/\/$/, '');
  const logoUrl = doc.logoUrl.startsWith('http') ? doc.logoUrl : `${base}${doc.logoUrl}`;
  const days = doc.days.map((d) => ({
    ...d,
    imageUrls: (d.imageUrls || []).map((url) =>
      url.startsWith('http') || url.startsWith('data:') ? url : `${base}${url.startsWith('/') ? '' : '/'}${url}`
    ),
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
    doc.variant === 'b2c' ? buildLegalSections() : '',
  ].join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title></title>
<style>
  @page { size: A4; margin: 14mm 12mm 16mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Calibri, 'DM Sans', Arial, Helvetica, sans-serif; font-size: 12px; color: #1a2e23; line-height: 1.5; }
  table { border-collapse: collapse; }
  @media print {
    a[href]::after { content: none !important; }
  }
</style>
</head>
<body>
<div style="max-width:760px;margin:0 auto;padding:4px 0 8px">
${body}
</div>
</body>
</html>`;
}

export function printProposal(doc: ProposalDoc, origin = ''): void {
  openPrintWindow(buildProposalHTML(doc, origin), '');
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

export function proposalVariantFromClientType(clientType: 'b2c' | 'b2b'): ProposalVariant {
  return clientType === 'b2b' ? 'b2b' : 'b2c';
}

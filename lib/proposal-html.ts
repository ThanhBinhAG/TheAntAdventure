import { fmt } from './constants';
import { openPrintWindow } from './print-window';
import type { ProposalDoc, ProposalVariant } from './proposal-types';
import {
  PROPOSAL_AMENDMENT_POLICY,
  PROPOSAL_B2B_FOOTER_NOTE,
  PROPOSAL_CANCELLATION_POLICY,
  PROPOSAL_FLIGHT_NOTE,
  PROPOSAL_FOOTER,
  PROPOSAL_IMPORTANT_NOTES,
  PROPOSAL_PAYMENT_TERMS,
  PROPOSAL_TAGLINE_B2C,
} from './proposal-boilerplate';

const BRAND = '#2E7D52';
const BRAND_DARK = '#1a5c38';
const MUTED = '#6B7F74';
const BORDER = '#E2E8E4';

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

  return `${sectionTitle('Brief Itinerary')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:10px">
    <thead><tr>${thCell('Day', 'center')}${thCell('Date')}${thCell('Destination')}${thCell('Theme')}${thCell('Hotel (4★)')}</tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function buildDetailedProgram(doc: ProposalDoc): string {
  if (!doc.days.length) return '';
  const blocks = doc.days
    .map(
      (d) => `
    <div style="page-break-inside:avoid;margin-bottom:18px;border-bottom:1px solid ${BORDER};padding-bottom:14px">
      <div style="font-weight:700;font-size:13px;color:${BRAND_DARK};margin-bottom:6px">DAY ${d.dayNumber} | ${esc(d.dateLabel)} | ${esc(d.destination)}</div>
      <div style="font-weight:600;font-size:12px;margin-bottom:8px;color:#1a2e23">${esc(d.title)}</div>
      <div style="font-size:11.5px;line-height:1.65;color:#1a2e23;white-space:pre-wrap">${esc(d.body)}</div>
      <div style="margin-top:8px;font-size:11px;color:${MUTED}"><b>Hotel:</b> ${esc(d.hotel)}</div>
      <div style="font-size:11px;color:${MUTED}"><b>Meals:</b> ${esc(d.meals)}</div>
    </div>`
    )
    .join('');

  return `${sectionTitle('Detailed Program')}${blocks}`;
}

function buildInclusions(doc: ProposalDoc): string {
  const incl = doc.inclusions.map((l) => `<tr><td style="padding:5px 8px;border-bottom:1px solid ${BORDER};color:${BRAND};width:24px">✓</td><td style="padding:5px 8px;border-bottom:1px solid ${BORDER}">${esc(l)}</td></tr>`).join('');
  const excl = doc.exclusions.map((l) => `<tr><td style="padding:5px 8px;border-bottom:1px solid ${BORDER};color:#c0392b;width:24px">✗</td><td style="padding:5px 8px;border-bottom:1px solid ${BORDER}">${esc(l)}</td></tr>`).join('');

  return `${sectionTitle('Inclusions &amp; Exclusions')}
  <table style="width:100%;border-collapse:collapse">
    <tr>
      <td style="width:50%;vertical-align:top;padding-right:12px">
        <div style="font-weight:700;font-size:11px;margin-bottom:6px;color:${BRAND_DARK}">INCLUSIONS</div>
        <table style="width:100%">${incl}</table>
      </td>
      <td style="width:50%;vertical-align:top;padding-left:12px">
        <div style="font-weight:700;font-size:11px;margin-bottom:6px;color:${BRAND_DARK}">EXCLUSIONS</div>
        <table style="width:100%">${excl}</table>
      </td>
    </tr>
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
      <tr style="background:#F7F8F6">
        ${tdCell(`<b>${esc(p.packageLabel)}</b><br><span style="font-size:10.5px;color:${MUTED}">${esc(doc.accommodationOptionA)} · Private Touring · Domestic Flights · All Taxes Included</span>`)}
        ${tdCell(`$${fmt(p.perPerson)}`, { align: 'right', bold: true })}
        ${tdCell(`$${fmt(p.groupTotal)}`, { align: 'right', bold: true })}
      </tr>
    </tbody>
  </table>
  <div style="font-size:10.5px;color:${MUTED};font-style:italic">All prices are quoted in USD and include applicable taxes. Rates are valid for the travel dates specified and subject to availability at time of booking confirmation.</div>`;
}

function buildB2BPricing(doc: ProposalDoc): string {
  if (doc.pricing.kind !== 'b2b') return '';
  const p = doc.pricing;
  const hotelRows = p.hotelRates
    .map(
      (h) =>
        `<tr><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(h.hotelName)}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(h.location)}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(h.stayFrom)} – ${esc(h.stayTo)}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(h.roomType)}</td><td style="padding:6px 10px;border:1px solid ${BORDER};text-align:center">${h.nights}</td><td style="padding:6px 10px;border:1px solid ${BORDER};text-align:right">$${fmt(h.ratePerNight)}</td><td style="padding:6px 10px;border:1px solid ${BORDER};text-align:right"><b>$${fmt(h.ratePerNight * h.nights)}</b></td></tr>`
    )
    .join('');

  return `${sectionTitle('Sample Quotation — B2B Net Rates')}
  <div style="font-size:11px;color:${MUTED};margin-bottom:10px">All prices USD · ${esc(p.seasonNote)}</div>

  <div style="font-weight:700;font-size:11.5px;color:${BRAND_DARK};margin:12px 0 6px">A. TOURINGS</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${thCell('Service Description')}${thCell('Per Pax (USD)', 'right')}${thCell(`Total ${p.pax} Pax (USD)`, 'right')}</tr></thead>
    <tbody>
      <tr><td style="padding:7px 10px;border:1px solid ${BORDER}">Ground arrangements — private tour (transfers, guide, vehicle, activities &amp; entrance fees as per program)</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right">$${fmt(p.touringsPerPax)}</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right"><b>$${fmt(p.touringsTotal)}</b></td></tr>
      <tr style="background:#E8F5EE"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700" colspan="2">TOTAL TOURINGS</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right;font-weight:700">$${fmt(p.touringsTotal)}</td></tr>
    </tbody>
  </table>

  <div style="font-weight:700;font-size:11.5px;color:${BRAND_DARK};margin:12px 0 6px">B. DOMESTIC FLIGHTS</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px">
    <thead><tr>${thCell('Service Description')}${thCell('Per Pax (USD)', 'right')}${thCell(`Total ${p.pax} Pax (USD)`, 'right')}</tr></thead>
    <tbody>
      <tr><td style="padding:7px 10px;border:1px solid ${BORDER}">Domestic flights as per program · Economy class</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right">$${fmt(p.flightsPerPax)}</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right"><b>$${fmt(p.flightsTotal)}</b></td></tr>
      <tr style="background:#E8F5EE"><td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700" colspan="2">TOTAL FLIGHTS</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right;font-weight:700">$${fmt(p.flightsTotal)}</td></tr>
    </tbody>
  </table>

  <div style="font-weight:700;font-size:11.5px;color:${BRAND_DARK};margin:12px 0 6px">C. HOTELS — OPTION A (${esc(doc.accommodationOptionA)})</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:8px;font-size:11px">
    <thead><tr>${thCell('Hotel')}${thCell('Location')}${thCell('Stay')}${thCell('Room Type')}${thCell('Nts', 'center')}${thCell('Price/Night', 'right')}${thCell('Total (USD)', 'right')}</tr></thead>
    <tbody>${hotelRows || `<tr><td colspan="7" style="padding:10px;color:${MUTED}">Add hotel rates in the Export step.</td></tr>`}</tbody>
    <tfoot><tr style="background:#E8F5EE"><td colspan="6" style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700">TOTAL HOTELS</td><td style="padding:7px 10px;border:1px solid ${BORDER};text-align:right;font-weight:700">$${fmt(p.hotelsTotal)}</td></tr></tfoot>
  </table>
  <div style="font-size:10.5px;color:${MUTED};font-style:italic;margin-top:6px">${PROPOSAL_B2B_FOOTER_NOTE}</div>`;
}

function buildLegalSections(): string {
  const payment = PROPOSAL_PAYMENT_TERMS.map(
    (r) => `<tr><td style="padding:6px 10px;border:1px solid ${BORDER};font-weight:600;width:30%">${esc(r.label)}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(r.detail)}</td></tr>`
  ).join('');

  const cancel = PROPOSAL_CANCELLATION_POLICY.map(
    (r) => `<tr><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(r.notice)}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(r.charge)}</td></tr>`
  ).join('');

  const amend = PROPOSAL_AMENDMENT_POLICY.map(
    (r) => `<tr><td style="padding:6px 10px;border:1px solid ${BORDER};font-weight:600;width:34%">${esc(r.label)}</td><td style="padding:6px 10px;border:1px solid ${BORDER}">${esc(r.detail)}</td></tr>`
  ).join('');

  const notes = PROPOSAL_IMPORTANT_NOTES.map(
    (n) => `<div style="margin-bottom:10px"><div style="font-weight:700;font-size:11.5px;color:${BRAND_DARK}">${esc(n.title)}</div><div style="font-size:11px;line-height:1.6;color:#1a2e23">${esc(n.body)}</div></div>`
  ).join('');

  return `
  ${sectionTitle('Payment Terms')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:14px">${payment}</table>
  ${sectionTitle('Cancellation Policy')}
  <div style="font-size:11px;margin-bottom:6px">Notice must be submitted in writing to sales@theantadventures.com.</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:14px">
    <thead><tr>${thCell('Notice Required')}${thCell('Charge')}</tr></thead>
    <tbody>${cancel}</tbody>
  </table>
  ${sectionTitle('Amendment Policy')}
  <table style="width:100%;border-collapse:collapse;margin-bottom:14px">${amend}</table>
  ${sectionTitle('Important Notes')}
  ${notes}`;
}

export function buildProposalHTML(doc: ProposalDoc, origin = ''): string {
  const logoUrl = doc.logoUrl.startsWith('http') ? doc.logoUrl : `${origin.replace(/\/$/, '')}${doc.logoUrl}`;
  const docWithLogo = { ...doc, logoUrl };

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
<title>${esc(doc.quoteRef)} — ${esc(doc.tourTitle)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm 18mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  body { font-family: Calibri, 'DM Sans', Arial, Helvetica, sans-serif; font-size: 12px; color: #1a2e23; line-height: 1.5; margin: 0; padding: 0; }
  table { border-collapse: collapse; }
</style>
</head>
<body>
<div style="max-width:760px;margin:0 auto;padding:8px 0 24px">
${body}
<div style="margin-top:28px;padding-top:12px;border-top:2px solid ${BRAND};text-align:center;font-size:10px;color:${MUTED}">${PROPOSAL_FOOTER}</div>
</div>
</body>
</html>`;
}

export function printProposal(doc: ProposalDoc, origin = ''): void {
  openPrintWindow(buildProposalHTML(doc, origin), `${doc.quoteRef} — ${doc.tourTitle}`);
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

import { fmt } from '../../constants';
import { buildLegalSections } from '../proposal-html-closing';
import {
  bookingTableHtml,
  buildBriefItinerary,
  buildB2BPricing,
  buildDayMetaLines,
  buildDayNarrative,
  buildFlightsTable,
  buildOverview,
  specialNotesBlock,
  uniqueUrls,
} from '../proposal-html-sections';
import { proposalRichHtml } from '../proposal-rich-text';
import { PROPOSAL_TAGLINE_B2C } from '../proposal-boilerplate';
import {
  CSS_PL_ACCENT,
  CSS_PL_ACCENT_SOFT,
  CSS_PL_BORDER,
  CSS_PL_FONT_DISPLAY,
  CSS_PL_FONT_MONO,
  CSS_PL_INK,
  CSS_PL_INK_MUTED,
  CSS_PL_RADIUS,
  CSS_PL_SURFACE_ALT,
  MUTED,
  editField,
  esc,
  isProposalHtmlEditable,
  sectionTitle,
  templateAnchorAttr,
} from '../proposal-html-shared';
import type { ProposalDoc } from '../proposal-types';

function heroImageUrl(doc: ProposalDoc): string | null {
  for (const d of doc.days) {
    const urls = uniqueUrls(d.imageUrls || []);
    if (urls[0]) return urls[0];
    if (d.segments) {
      for (const seg of d.segments) {
        const su = uniqueUrls(seg.imageUrls || []);
        if (su[0]) return su[0];
      }
    }
  }
  return null;
}

/** Full-page editorial cover with optional hero photo wash. */
export function buildModernHeroCover(doc: ProposalDoc): string {
  const isB2c = doc.variant === 'b2c';
  const hero = heroImageUrl(doc);
  const bgLayer = hero
    ? `<div style="position:absolute;inset:0;background:url('${esc(hero)}') center/cover no-repeat;opacity:0.22"></div>
       <div style="position:absolute;inset:0;background:linear-gradient(165deg, color-mix(in srgb, ${CSS_PL_ACCENT} 82%, #0a1f18) 0%, color-mix(in srgb, ${CSS_PL_ACCENT} 35%, #1A2824) 55%, #1A2824 100%)"></div>`
    : `<div style="position:absolute;inset:0;background:linear-gradient(165deg, ${CSS_PL_ACCENT} 0%, color-mix(in srgb, ${CSS_PL_ACCENT} 40%, #1A2824) 55%, #1A2824 100%)"></div>`;

  return `
  <div class="proposal-cover-modern proposal-cover-hero" style="position:relative;min-height:620px;margin:0 0 0;padding:48px 36px 40px;border-radius:${CSS_PL_RADIUS};overflow:hidden;color:#fff;break-after:page;page-break-after:always">
    ${bgLayer}
    <div style="position:relative;z-index:1;text-align:center;display:flex;flex-direction:column;justify-content:center;min-height:540px">
      ${isB2c ? `<div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;opacity:0.85;margin-bottom:18px">${PROPOSAL_TAGLINE_B2C}</div>` : ''}
      <img src="${esc(doc.logoUrl)}" alt="The Ant Adventures"${isProposalHtmlEditable() ? ' contenteditable="false"' : ''} style="height:72px;margin:0 auto 18px;filter:brightness(0) invert(1)" />
      <div style="font-size:10px;letter-spacing:1.5px;opacity:0.75;margin-bottom:28px">www.theantadventures.com</div>
      <div style="font-family:${CSS_PL_FONT_DISPLAY};font-size:34px;font-weight:600;letter-spacing:0.3px;line-height:1.2;margin-bottom:14px;max-width:640px;margin-left:auto;margin-right:auto">${editField('tourTitle', esc(doc.tourTitle))}</div>
      <div style="width:48px;height:2px;background:#fff;opacity:0.55;margin:0 auto 16px"></div>
      <div style="font-size:13px;letter-spacing:0.4px;opacity:0.9;margin-bottom:12px">${esc(doc.durationLabel)} · ${esc(doc.route)}</div>
      <div${templateAnchorAttr('tagline')} style="font-family:${CSS_PL_FONT_DISPLAY};font-size:14px;font-style:italic;line-height:1.7;max-width:560px;margin:0 auto;opacity:0.92">${editField('tagline', proposalRichHtml(doc.tagline), { rich: true })}</div>
      <div style="margin-top:36px;font-size:11px;letter-spacing:1px;opacity:0.7">${esc(doc.quoteRef)} · ${esc(doc.preparedDate)}</div>
    </div>
  </div>`;
}

function buildModernBooking(doc: ProposalDoc): string {
  const isB2c = doc.variant === 'b2c';
  const bookingTitle = isB2c ? 'YOUR BOOKING DETAILS' : 'CLIENT & BOOKING DETAILS';
  const rows = bookingTableHtml(doc);
  return `
  ${sectionTitle(bookingTitle)}
  <table class="proposal-modern-booking" style="width:100%;border-collapse:collapse;margin-bottom:8px">${rows}</table>
  ${specialNotesBlock(doc)}`;
}

function dayPhotoUrls(d: ProposalDoc['days'][number]): string[] {
  const fromDay = uniqueUrls(d.imageUrls || []);
  if (fromDay.length) return fromDay;
  const fromSegs: string[] = [];
  for (const seg of d.segments || []) {
    fromSegs.push(...uniqueUrls(seg.imageUrls || []));
  }
  return uniqueUrls(fromSegs);
}

/** Zig-zag day blocks: large image alternating left/right. */
export function buildModernDetailedProgram(doc: ProposalDoc): string {
  if (!doc.days.length) return '';

  const blocks = doc.days
    .map((d, idx) => {
      const photos = dayPhotoUrls(d);
      const img = photos[0];
      const imageLeft = idx % 2 === 0;
      const narrative = buildDayNarrative(d);
      const meta = buildDayMetaLines(d);
      const header = `<div style="font-family:${CSS_PL_FONT_DISPLAY};font-weight:600;font-size:18px;color:${CSS_PL_INK};margin-bottom:8px">Day ${d.dayNumber} <span style="font-weight:400;color:${CSS_PL_INK_MUTED};font-size:14px">· ${esc(d.dateLabel)} · ${esc(d.destination)}</span></div>`;

      const textCol = `
        <td style="width:${img ? '52%' : '100%'};vertical-align:top;padding:18px 20px">
          ${header}
          ${narrative}
          <div style="margin-top:12px;padding-top:10px;border-top:1px solid ${CSS_PL_BORDER}">${meta}</div>
        </td>`;
      const photoCol = img
        ? `<td style="width:48%;vertical-align:stretch;padding:0;background:${CSS_PL_SURFACE_ALT}">
            <img src="${esc(img)}" alt="" style="width:100%;height:100%;min-height:220px;object-fit:cover;display:block" />
          </td>`
        : '';

      return `
    <div class="proposal-day proposal-day--modern proposal-day-single-row" style="margin-bottom:22px;border:1px solid ${CSS_PL_BORDER};border-radius:${CSS_PL_RADIUS};overflow:hidden;background:#fff;box-shadow:0 4px 18px rgba(26,40,36,.06)">
      <table style="width:100%;border-collapse:collapse;height:100%">
        <tr class="proposal-day-single-row">
          ${imageLeft && photoCol ? `${photoCol}${textCol}` : `${textCol}${photoCol}`}
        </tr>
      </table>
    </div>`;
    })
    .join('');

  return `${sectionTitle('Detailed Program')}${blocks}`;
}

function buildModernInclusions(doc: ProposalDoc): string {
  const incl = doc.inclusions
    .map(
      (item, i) =>
        `<li style="margin:0 0 8px;padding:8px 12px;background:${CSS_PL_ACCENT_SOFT};border-radius:999px;font-size:11.5px;line-height:1.45;list-style:none">${editField(`inclusions.${i}`, proposalRichHtml(item), { rich: true })}</li>`
    )
    .join('');
  const excl = doc.exclusions
    .map(
      (item, i) =>
        `<li style="margin:0 0 8px;padding:8px 12px;background:${CSS_PL_SURFACE_ALT};border-radius:999px;font-size:11.5px;line-height:1.45;list-style:none;color:${CSS_PL_INK_MUTED}">${editField(`exclusions.${i}`, proposalRichHtml(item), { rich: true })}</li>`
    )
    .join('');

  return `<div class="proposal-keep">
  ${sectionTitle('Inclusions & Exclusions')}
  <table style="width:100%;border-collapse:separate;border-spacing:12px 0;margin-bottom:8px">
    <tr>
      <td${templateAnchorAttr('inclusions')} style="width:50%;vertical-align:top;padding:16px;border:1px solid ${CSS_PL_BORDER};border-radius:${CSS_PL_RADIUS};background:#fff">
        <div style="font-family:${CSS_PL_FONT_DISPLAY};font-size:14px;font-weight:600;color:${CSS_PL_ACCENT};margin-bottom:12px">Inclusions</div>
        <ul style="margin:0;padding:0">${incl || `<li style="list-style:none;color:${MUTED}">—</li>`}</ul>
      </td>
      <td${templateAnchorAttr('exclusions')} style="width:50%;vertical-align:top;padding:16px;border:1px solid ${CSS_PL_BORDER};border-radius:${CSS_PL_RADIUS};background:#fff">
        <div style="font-family:${CSS_PL_FONT_DISPLAY};font-size:14px;font-weight:600;color:${CSS_PL_INK_MUTED};margin-bottom:12px">Exclusions</div>
        <ul style="margin:0;padding:0">${excl || `<li style="list-style:none;color:${MUTED}">—</li>`}</ul>
      </td>
    </tr>
  </table>
  </div>`;
}

function buildModernB2CPricing(doc: ProposalDoc): string {
  if (doc.pricing.kind !== 'b2c') return '';
  const p = doc.pricing;
  const packageLabel = doc.pricingText?.packageLabel ?? p.packageLabel;
  const footnote =
    doc.pricingText?.footnote ??
    'All prices are quoted in USD and include applicable taxes. Rates are valid for the travel dates specified and subject to availability at time of booking confirmation.';

  return `<div${templateAnchorAttr('pricing')} class="proposal-keep">
  ${sectionTitle('Quoting Pricing')}
  <div style="padding:22px 24px;border-radius:${CSS_PL_RADIUS};background:linear-gradient(135deg, ${CSS_PL_ACCENT} 0%, color-mix(in srgb, ${CSS_PL_ACCENT} 70%, #1A2824) 100%);color:#fff;margin-bottom:10px">
    <div style="font-size:11px;opacity:0.85;margin-bottom:6px;letter-spacing:0.6px;text-transform:uppercase">All prices USD · ${esc(p.seasonNote)}</div>
    <div style="font-family:${CSS_PL_FONT_DISPLAY};font-size:16px;margin-bottom:14px">${editField('pricingText.packageLabel', esc(packageLabel), { rich: true })}</div>
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:8px 0;font-size:12px;opacity:0.9">Per person</td>
        <td style="padding:8px 0;text-align:right;font-family:${CSS_PL_FONT_MONO};font-size:22px;font-weight:700">$${fmt(p.perPerson)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.25);font-size:12px;opacity:0.9">Total ${p.pax} pax</td>
        <td style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.25);text-align:right;font-family:${CSS_PL_FONT_MONO};font-size:22px;font-weight:700">$${fmt(p.groupTotal)}</td>
      </tr>
    </table>
    <div style="font-size:10.5px;opacity:0.8;margin-top:10px">${esc(doc.accommodationOptionA)} · Private Touring · Domestic Flights · All Taxes Included</div>
  </div>
  <div${templateAnchorAttr('pricing.footnote')} style="font-size:10.5px;color:${CSS_PL_INK_MUTED};font-style:italic">${editField('pricingText.footnote', proposalRichHtml(footnote), { rich: true })}</div>
  </div>`;
}

export function buildModernBody(doc: ProposalDoc): string {
  return [
    buildModernHeroCover(doc),
    buildModernBooking(doc),
    buildOverview(doc, 'modern'),
    buildFlightsTable(doc, 'modern'),
    buildBriefItinerary(doc, 'modern'),
    buildModernDetailedProgram(doc),
    buildModernInclusions(doc),
    doc.variant === 'b2c' ? buildModernB2CPricing(doc) : buildB2BPricing(doc),
    doc.variant === 'b2c' ? buildLegalSections(doc) : '',
  ].join('\n');
}

export function modernExtraStyles(): string {
  return `
  .proposal-layout-modern { background: var(--pl-surface, #ffffff); }
  .proposal-layout-modern .proposal-modern-booking td { border-color: transparent !important; border-bottom: 1px solid var(--pl-border, #E3E8E5) !important; }
  .proposal-layout-modern .proposal-modern-booking tr:first-child td { border-top: none !important; }
  .proposal-layout-modern .proposal-cover-hero { break-after: page; page-break-after: always; }
  .proposal-layout-modern .proposal-section-title--modern { margin: 28px 0 14px; }
  .proposal-layout-modern .proposal-day--modern { break-inside: avoid; page-break-inside: avoid; }
  .proposal-layout-modern .proposal-photo-col { display: none; }
`;
}

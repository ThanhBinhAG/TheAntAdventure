import {
  defaultLegalText,
  isUnchangedLegalText,
} from './proposal-content-overrides';
import { proposalRichHtml } from './proposal-rich-text';
import type { ProposalDoc, ProposalLegalText } from './proposal-types';
import {
  PROPOSAL_AMENDMENT_POLICY,
  PROPOSAL_CANCELLATION_POLICY,
  PROPOSAL_IMPORTANT_NOTES,
  PROPOSAL_PAYMENT_TERMS,
} from './proposal-boilerplate';
import {
  BORDER,
  CSS_BRAND,
  CSS_BRAND_DARK,
  CSS_ROW_ALT,
  CSS_TABLE_HEADER,
  EXCL_HEADER,
  MUTED,
  editField,
  esc,
  isProposalHtmlEditable,
  sectionTitle,
  templateAnchorAttr,
} from './proposal-html-shared';

const CANCEL_NOTICE = 'Notice must be submitted in writing to sales@theantadventures.com.';

function wrapKeep(inner: string, anchor?: string): string {
  return `<div class="proposal-keep"${anchor ? templateAnchorAttr(anchor) : ''}>${inner}</div>`;
}

function inclExclPairCell(
  kind: 'incl' | 'excl',
  item: string | undefined,
  index: number,
  alt: boolean
): string {
  const field = kind === 'incl' ? 'inclusions' : 'exclusions';
  const icon = kind === 'incl' ? '✓' : '✗';
  const iconColor = kind === 'incl' ? CSS_BRAND : '#c0392b';
  const filledBg = kind === 'incl' ? (alt ? CSS_ROW_ALT : '#fff') : alt ? '#F3F7F4' : '#ECF3EE';
  if (item == null) {
    return `<td style="padding:6px 6px;border:1px solid ${BORDER};width:22px;background:#FAFBFA"></td>
      <td style="padding:6px 8px;border:1px solid ${BORDER};background:#FAFBFA"></td>`;
  }
  return `<td style="padding:6px 6px;border:1px solid ${BORDER};width:22px;color:${iconColor};font-weight:700;vertical-align:top;text-align:center;background:${filledBg}">${icon}</td>
    <td style="padding:6px 8px;border:1px solid ${BORDER};font-size:11px;vertical-align:top;line-height:1.5;text-align:left;background:${filledBg}">${editField(`${field}.${index}`, proposalRichHtml(item), { rich: true })}</td>`;
}

export function buildInclusions(doc: ProposalDoc): string {
  const incl = doc.inclusions;
  const excl = doc.exclusions;
  const rows = Math.max(incl.length, excl.length);
  const body = Array.from({ length: rows }, (_, i) => {
    const alt = i % 2 === 1;
    return `<tr>
      ${inclExclPairCell('incl', incl[i], i, alt)}
      <td class="proposal-incl-gutter" style="width:4px;padding:0;border:0;background:#fff"></td>
      ${inclExclPairCell('excl', excl[i], i, alt)}
    </tr>`;
  }).join('');

  return wrapKeep(`${sectionTitle('Inclusions & Exclusions')}
  <table class="proposal-incl-excl" style="width:100%;border-collapse:separate;border-spacing:0;margin-bottom:8px;table-layout:fixed">
    <colgroup>
      <col style="width:22px" />
      <col />
      <col style="width:4px" />
      <col style="width:22px" />
      <col />
    </colgroup>
    <thead>
      <tr>
        <th colspan="2"${templateAnchorAttr('inclusions')} style="padding:8px 10px;border:1px solid ${BORDER};background:${CSS_TABLE_HEADER};color:#fff;font-size:11px;font-weight:700;text-align:left;letter-spacing:0.4px">INCLUSIONS</th>
        <th style="width:4px;padding:0;border:0;background:#fff"></th>
        <th colspan="2"${templateAnchorAttr('exclusions')} style="padding:8px 10px;border:1px solid ${BORDER};background:${EXCL_HEADER};color:#fff;font-size:11px;font-weight:700;text-align:left;letter-spacing:0.4px">EXCLUSIONS</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>`);
}

function legalKvTable(rows: [string, string][], labelWidth = '28%'): string {
  return `<table class="proposal-legal-table" style="width:100%;border-collapse:collapse;margin-bottom:14px;table-layout:fixed">
    <colgroup><col style="width:${labelWidth}" /><col /></colgroup>
    <tbody>${rows
      .map(
        ([label, detail], i) =>
          `<tr style="background:${i % 2 ? CSS_ROW_ALT : '#fff'}">
            <td style="padding:7px 10px;border:1px solid ${BORDER};font-weight:700;color:${CSS_BRAND_DARK};vertical-align:top;font-size:11px">${esc(label)}</td>
            <td style="padding:7px 10px;border:1px solid ${BORDER};font-size:11px;vertical-align:top;line-height:1.55">${esc(detail)}</td>
          </tr>`
      )
      .join('')}
    </tbody>
  </table>`;
}

function legalCustomBlock(title: string, html: string, editKey?: keyof ProposalLegalText): string {
  const inner = proposalRichHtml(html);
  const content =
    isProposalHtmlEditable() && editKey
      ? editField(`legalText.${editKey}`, inner, { rich: true })
      : inner;
  return wrapKeep(
    `${sectionTitle(title)}<div class="proposal-legal-prose">${content}</div>`,
    editKey ? `legal.${editKey}` : undefined
  );
}

function legalStructuredBlock(title: string, rows: [string, string][], editKey?: keyof ProposalLegalText): string {
  if (isProposalHtmlEditable() && editKey) {
    const defaults = defaultLegalText();
    return legalCustomBlock(title, defaults[editKey] || '', editKey);
  }
  const labelWidth = title === 'Cancellation Policy' ? '32%' : title === 'Important Notes' ? '28%' : '30%';
  return wrapKeep(
    `${sectionTitle(title)}${legalKvTable(rows, labelWidth)}`,
    editKey ? `legal.${editKey}` : undefined
  );
}

function legalSection(
  title: string,
  key: keyof ProposalLegalText,
  rows: [string, string][],
  custom: string | undefined
): string {
  if (isProposalHtmlEditable()) {
    return legalCustomBlock(title, custom?.trim() || defaultLegalText()[key] || '', key);
  }
  if (!isUnchangedLegalText(custom, key)) {
    return legalCustomBlock(title, custom || '');
  }
  return legalStructuredBlock(title, rows, key);
}

export function buildLegalSections(doc: ProposalDoc): string {
  const paymentRows: [string, string][] = PROPOSAL_PAYMENT_TERMS.map((r) => [r.label, r.detail]);
  const cancelRows: [string, string][] = [
    ['Notice Required', CANCEL_NOTICE],
    ...PROPOSAL_CANCELLATION_POLICY.map((r) => [r.notice, r.charge] as [string, string]),
  ];
  const amendRows: [string, string][] = PROPOSAL_AMENDMENT_POLICY.map((r) => [r.label, r.detail]);
  const noteRows: [string, string][] = PROPOSAL_IMPORTANT_NOTES.map((n) => [n.title, n.body]);
  const lt = doc.legalText;

  return `
  ${legalSection('Payment Terms', 'paymentTerms', paymentRows, lt?.paymentTerms)}
  ${legalSection('Cancellation Policy', 'cancellation', cancelRows, lt?.cancellation)}
  ${legalSection('Amendment Policy', 'amendment', amendRows, lt?.amendment)}
  ${legalSection('Important Notes', 'importantNotes', noteRows, lt?.importantNotes)}
  <div style="margin-top:16px;text-align:center;font-size:10px;color:${MUTED}">THE ANT ADVENTURES · sales@theantadventures.com · www.theantadventures.com</div>`;
}

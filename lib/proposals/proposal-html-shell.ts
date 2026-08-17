import {
  BORDER,
  CSS_BRAND_DARK,
  isProposalHtmlEditable,
  proposalLayout,
  setProposalHtmlEditable,
  setProposalLayout,
} from './proposal-html-shared';
import { buildLayoutBody, layoutExtraStyles } from './layouts';
import { layoutBodyCss } from './layouts/layout-tokens';
import { normalizeProposalLayoutId } from './proposal-layouts';
import { prepareProposalDocForRender } from './proposal-html-sections';
import type { ProposalDoc } from './proposal-types';
import { proposalThemeCssVars } from './proposal-theme';

export interface ProposalHtmlOptions {
  preview?: boolean;
}

function baseStyles(
  editableMode: boolean,
  previewMode: boolean,
  layoutId: ReturnType<typeof normalizeProposalLayoutId>
): string {
  const editorStyles = editableMode
    ? `
  .proposal-doc-page { max-width:760px;margin:0 auto;padding:24px 20px 32px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.12);min-height:600px; }
  .proposal-edit-field { outline:none;border-radius:2px;transition:box-shadow .12s,background .12s; }
  .proposal-edit-field:hover { box-shadow:0 0 0 1px rgba(46,125,82,.35); }
  .proposal-edit-field:focus { box-shadow:0 0 0 2px rgba(46,125,82,.55);background:rgba(236,246,240,.35); }
  img[contenteditable=false] { user-select:none; pointer-events:none; }
`
    : '';

  const previewStyles = previewMode
    ? `
  [data-template-anchor].proposal-anchor-flash {
    outline: 2px solid var(--p-brand, #2E7D52);
    outline-offset: 3px;
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--p-brand, #2E7D52) 22%, transparent);
    border-radius: 3px;
    transition: box-shadow .25s ease, outline-color .25s ease;
  }
`
    : '';

  const bodyCss = layoutBodyCss(layoutId);

  return `
  @page { size: A4; margin: 14mm 12mm 16mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { ${bodyCss}${editableMode ? ' background:#e8eaed;' : ''} }
  table { border-collapse: collapse; }
  .proposal-day--segments { break-inside: auto; page-break-inside: auto; }
  .proposal-segment-row,
  .proposal-day-single-row { break-inside: avoid; page-break-inside: avoid; }
  .proposal-day--single table,
  .proposal-day-single-row { height: 100%; }
  .proposal-day-meta { break-before: avoid; page-break-before: avoid; }
  .proposal-day-header-row { break-after: avoid; page-break-after: avoid; }
  .proposal-photo-col {
    width: 28%;
    vertical-align: top;
    background: var(--pl-accent-soft, #E8F5EE);
    border-left: 1px solid ${BORDER};
    padding: 12px 10px 8px;
    height: 100%;
    text-align: center;
  }
  .proposal-photo-col-inner {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 160px;
    gap: 8px;
  }
  .proposal-day-body { text-align: justify; text-justify: inter-word; }
  .proposal-photo-day-label {
    font-weight: 700;
    font-size: 12px;
    color: ${CSS_BRAND_DARK};
    flex: 0 0 auto;
  }
  .proposal-photo-stack {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-height: 0;
    gap: 6px;
  }
  .proposal-sidebar-img {
    width: 100%;
    height: 100%;
    min-height: 88px;
    object-fit: cover;
    border-radius: 3px;
    display: block;
    flex: 1 1 0;
  }
  .proposal-section-title { margin: 22px 0 10px; }
  .proposal-keep { break-inside: avoid; page-break-inside: avoid; }
  .proposal-keep .proposal-section-title {
    break-after: avoid;
    page-break-after: avoid;
    margin-top: 14px;
  }
  .proposal-legal-table {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .proposal-legal-prose {
    font-size: 11px;
    line-height: 1.55;
    margin-bottom: 14px;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  ${layoutExtraStyles(layoutId)}
  ${editorStyles}
  ${previewStyles}
  @media print {
    a[href]::after { content: none !important; }
    .proposal-day { margin-bottom: 8px !important; }
    .proposal-segment-row td { padding-top: 8px !important; padding-bottom: 8px !important; }
    .proposal-segment-photos { padding: 8px 10px 4px !important; }
    .proposal-segment-row td div[style*="white-space:pre-wrap"],
    .proposal-day-single-row td div[style*="white-space:pre-wrap"] {
      orphans: 2;
      widows: 2;
    }
  }`;
}

export function buildProposalDocumentHTML(
  doc: ProposalDoc,
  origin: string,
  editableMode: boolean,
  previewMode: boolean
): string {
  const prevEditable = isProposalHtmlEditable();
  const prevLayout = proposalLayout();
  const layoutId = normalizeProposalLayoutId(doc.layoutId);
  setProposalHtmlEditable(editableMode);
  setProposalLayout(layoutId);
  try {
    const docWithLogo = prepareProposalDocForRender(doc, origin);
    const body = buildLayoutBody(docWithLogo, layoutId);

    const pageWrap = editableMode
      ? `<div class="proposal-doc-page proposal-layout-${layoutId}">\n${body}\n</div>`
      : `<div class="proposal-layout-${layoutId}" style="max-width:760px;margin:0 auto;padding:4px 0 8px">\n${body}\n</div>`;

    const themeVars = proposalThemeCssVars(doc.theme);

    return `<!DOCTYPE html>
<html lang="en" style="${themeVars}">
<head>
<meta charset="utf-8" />
<title></title>
<style>${baseStyles(editableMode, previewMode, layoutId)}</style>
</head>
<body>
${pageWrap}
</body>
</html>`;
  } finally {
    setProposalHtmlEditable(prevEditable);
    setProposalLayout(prevLayout);
  }
}

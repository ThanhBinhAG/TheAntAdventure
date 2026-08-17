import type { ProposalDoc } from './proposal-types';
import { buildProposalDocumentHTML } from './proposal-html-shell';

export function buildProposalHTML(
  doc: ProposalDoc,
  origin = '',
  opts?: { preview?: boolean }
): string {
  return buildProposalDocumentHTML(doc, origin, false, opts?.preview === true);
}

/** In-document editor canvas: same Material layout with contenteditable fields. */
export function buildProposalEditableHTML(doc: ProposalDoc, origin = ''): string {
  return buildProposalDocumentHTML(doc, origin, true, false);
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

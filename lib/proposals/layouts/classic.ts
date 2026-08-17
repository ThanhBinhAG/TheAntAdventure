import { buildInclusions, buildLegalSections } from '../proposal-html-closing';
import {
  buildBriefItinerary,
  buildB2BPricing,
  buildB2CPricing,
  buildCover,
  buildDetailedProgram,
  buildFlightsTable,
  buildOverview,
} from '../proposal-html-sections';
import type { ProposalDoc } from '../proposal-types';

/** Classic — corporate report: familiar tables, sidebar photos, brand underline titles. */
export function buildClassicBody(doc: ProposalDoc): string {
  return [
    buildCover(doc),
    buildOverview(doc, 'classic'),
    buildFlightsTable(doc, 'classic'),
    buildBriefItinerary(doc, 'classic'),
    buildDetailedProgram(doc, 'classic'),
    buildInclusions(doc),
    doc.variant === 'b2c' ? buildB2CPricing(doc) : buildB2BPricing(doc),
    doc.variant === 'b2c' ? buildLegalSections(doc) : '',
  ].join('\n');
}

export function classicExtraStyles(): string {
  return `
  .proposal-layout-classic .proposal-section-title { margin: 22px 0 10px; }
  .proposal-layout-classic .proposal-cover-classic { border-bottom: 1px solid var(--pl-border, #E2E8E4); }
`;
}

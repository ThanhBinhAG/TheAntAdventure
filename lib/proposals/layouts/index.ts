import type { ProposalDoc } from '../proposal-types';
import type { ProposalLayoutId } from '../proposal-layouts';
import { buildClassicBody, classicExtraStyles } from './classic';
import { buildModernBody, modernExtraStyles } from './modern';
import { buildCompactBody, compactExtraStyles } from './compact';
import { layoutTokenCssVars } from './layout-tokens';

export function buildLayoutBody(doc: ProposalDoc, layoutId: ProposalLayoutId): string {
  switch (layoutId) {
    case 'modern':
      return buildModernBody(doc);
    case 'compact':
      return buildCompactBody(doc);
    default:
      return buildClassicBody(doc);
  }
}

export function layoutExtraStyles(layoutId: ProposalLayoutId): string {
  const tokenVars = `.proposal-layout-${layoutId} { ${layoutTokenCssVars(layoutId)} }`;
  switch (layoutId) {
    case 'modern':
      return `${tokenVars}\n${modernExtraStyles()}`;
    case 'compact':
      return `${tokenVars}\n${compactExtraStyles()}`;
    default:
      return `${tokenVars}\n${classicExtraStyles()}`;
  }
}

export { buildClassicBody } from './classic';
export { buildModernBody } from './modern';
export { buildCompactBody } from './compact';

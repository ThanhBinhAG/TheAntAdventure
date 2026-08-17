export type ProposalLayoutId = 'classic' | 'modern' | 'compact';

export const DEFAULT_PROPOSAL_LAYOUT_ID: ProposalLayoutId = 'classic';

export interface ProposalLayoutMeta {
  id: ProposalLayoutId;
  label: string;
  description: string;
}

export const PROPOSAL_LAYOUTS: ProposalLayoutMeta[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Corporate report — balanced tables, sidebar photos, familiar brand structure.',
  },
  {
    id: 'modern',
    label: 'Modern',
    description: 'Editorial magazine — full-page hero, serif titles, large zig-zag day imagery.',
  },
  {
    id: 'compact',
    label: 'Compact',
    description: 'Executive brief — dense header, striped programme table, mono figures, fewer pages.',
  },
];

export function normalizeProposalLayoutId(value: unknown): ProposalLayoutId {
  if (value === 'modern' || value === 'compact') return value;
  return DEFAULT_PROPOSAL_LAYOUT_ID;
}

export function getProposalLayoutMeta(id: ProposalLayoutId): ProposalLayoutMeta {
  return PROPOSAL_LAYOUTS.find((layout) => layout.id === id) ?? PROPOSAL_LAYOUTS[0];
}

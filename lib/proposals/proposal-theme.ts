export type ProposalTemplateTheme = {
  brand?: string;
  brandDark?: string;
  tableHeader?: string;
  rowAlt?: string;
};

export const DEFAULT_PROPOSAL_THEME: Required<ProposalTemplateTheme> = {
  brand: '#2E7D52',
  brandDark: '#1A5C38',
  tableHeader: '#2E7D52',
  rowAlt: '#F6F6F6',
};

const HEX = /^#([0-9a-fA-F]{6})$/;

export function parseThemeHex(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return HEX.test(trimmed) ? trimmed.toUpperCase() : undefined;
}

export function pickProposalTheme(raw?: ProposalTemplateTheme | null): ProposalTemplateTheme | undefined {
  if (!raw) return undefined;
  const out: ProposalTemplateTheme = {};
  const brand = parseThemeHex(raw.brand);
  const brandDark = parseThemeHex(raw.brandDark);
  const tableHeader = parseThemeHex(raw.tableHeader);
  const rowAlt = parseThemeHex(raw.rowAlt);
  if (brand) out.brand = brand;
  if (brandDark) out.brandDark = brandDark;
  if (tableHeader) out.tableHeader = tableHeader;
  if (rowAlt) out.rowAlt = rowAlt;
  return Object.keys(out).length ? out : undefined;
}

export function resolveProposalTheme(theme?: ProposalTemplateTheme | null): Required<ProposalTemplateTheme> {
  const picked = pickProposalTheme(theme);
  return {
    brand: picked?.brand ?? DEFAULT_PROPOSAL_THEME.brand,
    brandDark: picked?.brandDark ?? DEFAULT_PROPOSAL_THEME.brandDark,
    tableHeader: picked?.tableHeader ?? picked?.brand ?? DEFAULT_PROPOSAL_THEME.tableHeader,
    rowAlt: picked?.rowAlt ?? DEFAULT_PROPOSAL_THEME.rowAlt,
  };
}

export function isCustomProposalTheme(theme?: ProposalTemplateTheme | null): boolean {
  const picked = pickProposalTheme(theme);
  if (!picked) return false;
  const resolved = resolveProposalTheme(picked);
  return (
    resolved.brand !== DEFAULT_PROPOSAL_THEME.brand ||
    resolved.brandDark !== DEFAULT_PROPOSAL_THEME.brandDark ||
    resolved.tableHeader !== DEFAULT_PROPOSAL_THEME.tableHeader ||
    resolved.rowAlt !== DEFAULT_PROPOSAL_THEME.rowAlt
  );
}

/**
 * Emit only company-customized theme vars so layout `--pl-*` tokens can win
 * when the company has not set a colour. If only `brand` is set, also emit
 * `--p-table-header` from that brand so retint behaviour stays intact.
 */
export function proposalThemeCssVars(theme?: ProposalTemplateTheme | null): string {
  const picked = pickProposalTheme(theme);
  if (!picked) return '';
  const parts: string[] = [];
  if (picked.brand) parts.push(`--p-brand:${picked.brand}`);
  if (picked.brandDark) parts.push(`--p-brand-dark:${picked.brandDark}`);
  if (picked.tableHeader) {
    parts.push(`--p-table-header:${picked.tableHeader}`);
  } else if (picked.brand) {
    parts.push(`--p-table-header:${picked.brand}`);
  }
  if (picked.rowAlt) parts.push(`--p-row-alt:${picked.rowAlt}`);
  return parts.join(';');
}

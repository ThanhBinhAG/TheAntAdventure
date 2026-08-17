import type { ProposalLayoutId } from '../proposal-layouts';

/** Layout-only visual tokens. Do not override --p-brand* (company theme wins). */
export type LayoutTokens = {
  id: ProposalLayoutId;
  /** Body / UI sans */
  fontSans: string;
  /** Display / headings */
  fontDisplay: string;
  /** Numbers / dense tables */
  fontMono: string;
  accent: string;
  accentSoft: string;
  accentMuted: string;
  ink: string;
  inkMuted: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  radius: string;
  bodySize: string;
  lineHeight: string;
  sectionTitleSize: string;
  /** Primary table header (tourings / option A). */
  tableHeader: string;
  /** Flights section header accent. */
  tableHeaderFlights: string;
  /** Hotels option B header accent. */
  tableHeaderHotelsB: string;
  /** Soft total-row tint (tourings / hotels). */
  rowSoft: string;
  /** Stronger total-row tint (pricing highlight). */
  rowAccent: string;
  /** Flights total-row tint. */
  rowFlights: string;
};

export const LAYOUT_TOKENS: Record<ProposalLayoutId, LayoutTokens> = {
  classic: {
    id: 'classic',
    fontSans: "Calibri, 'DM Sans', Arial, Helvetica, sans-serif",
    fontDisplay: "Calibri, 'DM Sans', Arial, Helvetica, sans-serif",
    fontMono: "'Liberation Mono', 'Courier New', monospace",
    accent: '#2E7D52',
    accentSoft: '#ECF6F0',
    accentMuted: '#6B7F74',
    ink: '#1a2e23',
    inkMuted: '#6B7F74',
    surface: '#ffffff',
    surfaceAlt: '#F6F6F6',
    border: '#E2E8E4',
    radius: '4px',
    bodySize: '12px',
    lineHeight: '1.45',
    sectionTitleSize: '13px',
    tableHeader: '#2E7D52',
    tableHeaderFlights: '#4A6FA5',
    tableHeaderHotelsB: '#8B6913',
    rowSoft: '#ECF6F0',
    rowAccent: '#D5E9D9',
    rowFlights: '#E7ECF5',
  },
  modern: {
    id: 'modern',
    fontSans: "Calibri, 'DM Sans', Arial, Helvetica, sans-serif",
    fontDisplay: "'Liberation Serif', Georgia, 'Times New Roman', serif",
    fontMono: "'Liberation Mono', 'Courier New', monospace",
    accent: '#1B5E4A',
    accentSoft: '#E8F2EE',
    accentMuted: '#6A7F76',
    ink: '#1A2824',
    inkMuted: '#5C6F6A',
    surface: '#ffffff',
    surfaceAlt: '#F3F6F4',
    border: '#E3E8E5',
    radius: '10px',
    bodySize: '12px',
    lineHeight: '1.55',
    sectionTitleSize: '15px',
    tableHeader: '#1B5E4A',
    tableHeaderFlights: '#2A6B58',
    tableHeaderHotelsB: '#3D7A66',
    rowSoft: '#E8F2EE',
    rowAccent: '#D4E8DF',
    rowFlights: '#E4EEEA',
  },
  compact: {
    id: 'compact',
    fontSans: "Calibri, 'DM Sans', Arial, Helvetica, sans-serif",
    fontDisplay: "Calibri, 'DM Sans', Arial, Helvetica, sans-serif",
    fontMono: "'Liberation Mono', 'Courier New', monospace",
    accent: '#2E7D52',
    accentSoft: '#EEF2EF',
    accentMuted: '#6B7280',
    ink: '#1F2933',
    inkMuted: '#6B7280',
    surface: '#ffffff',
    surfaceAlt: '#F3F4F6',
    border: '#D1D5DB',
    radius: '2px',
    bodySize: '10.5px',
    lineHeight: '1.35',
    sectionTitleSize: '11px',
    tableHeader: '#2E7D52',
    tableHeaderFlights: '#4A6FA5',
    tableHeaderHotelsB: '#8B6913',
    rowSoft: '#ECF6F0',
    rowAccent: '#D5E9D9',
    rowFlights: '#E7ECF5',
  },
};

export function getLayoutTokens(id: ProposalLayoutId): LayoutTokens {
  return LAYOUT_TOKENS[id] ?? LAYOUT_TOKENS.classic;
}

/** CSS custom properties scoped under layout class — never overwrite --p-brand*. */
export function layoutTokenCssVars(id: ProposalLayoutId): string {
  const t = getLayoutTokens(id);
  return [
    `--pl-accent:${t.accent}`,
    `--pl-accent-soft:${t.accentSoft}`,
    `--pl-accent-muted:${t.accentMuted}`,
    `--pl-ink:${t.ink}`,
    `--pl-ink-muted:${t.inkMuted}`,
    `--pl-surface:${t.surface}`,
    `--pl-surface-alt:${t.surfaceAlt}`,
    `--pl-border:${t.border}`,
    `--pl-radius:${t.radius}`,
    `--pl-font-sans:${t.fontSans}`,
    `--pl-font-display:${t.fontDisplay}`,
    `--pl-font-mono:${t.fontMono}`,
    `--pl-table-header:${t.tableHeader}`,
    `--pl-table-header-flights:${t.tableHeaderFlights}`,
    `--pl-table-header-hotels-b:${t.tableHeaderHotelsB}`,
    `--pl-row-soft:${t.rowSoft}`,
    `--pl-row-accent:${t.rowAccent}`,
    `--pl-row-flights:${t.rowFlights}`,
  ].join(';');
}

export function layoutBodyCss(id: ProposalLayoutId): string {
  const t = getLayoutTokens(id);
  return `font-family:${t.fontSans};font-size:${t.bodySize};color:${t.ink};line-height:${t.lineHeight};`;
}

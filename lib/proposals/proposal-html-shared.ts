import { isTemplateEditPath } from './proposal-content-overrides';
import {
  DEFAULT_PROPOSAL_LAYOUT_ID,
  type ProposalLayoutId,
} from './proposal-layouts';

export const BRAND = '#2E7D52';
export const BRAND_DARK = '#1a5c38';
export const MUTED = '#6B7F74';
export const BORDER = '#E2E8E4';
export const EXCL_HEADER = '#545454';
export const FLIGHTS_HEADER = '#4A6FA5';
export const HOTELS_B_HEADER = '#8B6913';
export const ROW_ALT = '#F6F6F6';
export const ROW_GREEN = '#ECF6F0';
export const ROW_GREEN_ALT = '#D5E9D9';
export const ROW_BLUE = '#E7ECF5';

/** CSS variables so company theme can retint tables without changing layout. */
export const CSS_BRAND = 'var(--p-brand, #2E7D52)';
export const CSS_BRAND_DARK = 'var(--p-brand-dark, #1a5c38)';
/** Company `--p-table-header` wins; else layout `--pl-table-header`; else brand green. */
export const CSS_TABLE_HEADER = 'var(--p-table-header, var(--pl-table-header, #2E7D52))';
export const CSS_ROW_ALT = 'var(--p-row-alt, var(--pl-surface-alt, #F6F6F6))';
export const CSS_FLIGHTS_HEADER = 'var(--pl-table-header-flights, #4A6FA5)';
export const CSS_HOTELS_B_HEADER = 'var(--pl-table-header-hotels-b, #8B6913)';
export const CSS_ROW_GREEN = 'var(--pl-row-soft, #ECF6F0)';
export const CSS_ROW_GREEN_ALT = 'var(--pl-row-accent, #D5E9D9)';
export const CSS_ROW_BLUE = 'var(--pl-row-flights, #E7ECF5)';

/** Layout accent tokens (set via --pl-* on the document). */
export const CSS_PL_ACCENT = 'var(--pl-accent, var(--p-brand, #2E7D52))';
export const CSS_PL_ACCENT_SOFT = 'var(--pl-accent-soft, #ECF6F0)';
export const CSS_PL_INK = 'var(--pl-ink, #1a2e23)';
export const CSS_PL_INK_MUTED = 'var(--pl-ink-muted, #6B7F74)';
export const CSS_PL_BORDER = 'var(--pl-border, #E2E8E4)';
export const CSS_PL_SURFACE_ALT = 'var(--pl-surface-alt, #F6F6F6)';
export const CSS_PL_RADIUS = 'var(--pl-radius, 4px)';
export const CSS_PL_FONT_DISPLAY = "var(--pl-font-display, Calibri, 'DM Sans', Arial, sans-serif)";
export const CSS_PL_FONT_MONO = "var(--pl-font-mono, 'Liberation Mono', 'Courier New', monospace)";

/** When true, template commercial fields are wrapped for in-document editing. */
let editable = false;

export function setProposalHtmlEditable(value: boolean): void {
  editable = value;
}

export function isProposalHtmlEditable(): boolean {
  return editable;
}

/** Active layout for sectionTitle / closing builders (set by HTML shell). */
let currentLayout: ProposalLayoutId = DEFAULT_PROPOSAL_LAYOUT_ID;
let sectionCounter = 0;

export function setProposalLayout(id: ProposalLayoutId): void {
  currentLayout = id;
  sectionCounter = 0;
}

export function proposalLayout(): ProposalLayoutId {
  return currentLayout;
}

export function nextSectionNumber(): number {
  sectionCounter += 1;
  return sectionCounter;
}

export function resetSectionCounter(): void {
  sectionCounter = 0;
}

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Wrap template fields for in-doc editing; tour narrative stays plain even in edit mode. */
export function editField(path: string, inner: string, opts?: { rich?: boolean; tag?: 'span' | 'div' }): string {
  if (!editable || !isTemplateEditPath(path)) return inner;
  const rich = opts?.rich;
  const tag = opts?.tag ?? (rich ? 'div' : 'span');
  const mode = rich ? 'data-rich="1"' : 'data-plain="1"';
  return `<${tag} contenteditable="true" data-proposal-field="${esc(path)}" ${mode} class="proposal-edit-field">${inner}</${tag}>`;
}

export function sectionTitle(title: string): string {
  const layout = currentLayout;
  if (layout === 'modern') {
    const n = nextSectionNumber();
    const num = String(n).padStart(2, '0');
    return `<div class="proposal-section-title proposal-section-title--modern" style="display:flex;align-items:baseline;gap:14px;margin:28px 0 14px;padding-bottom:10px;border-bottom:1px solid ${CSS_PL_BORDER}">
      <span style="font-family:${CSS_PL_FONT_DISPLAY};font-size:28px;font-weight:400;color:${CSS_PL_ACCENT};opacity:0.35;line-height:1;letter-spacing:-0.5px">${num}</span>
      <span style="font-family:${CSS_PL_FONT_DISPLAY};font-weight:600;font-size:15px;color:${CSS_PL_INK};text-transform:none;letter-spacing:0.8px">${esc(title)}</span>
    </div>`;
  }
  if (layout === 'compact') {
    return `<div class="proposal-section-title proposal-section-title--compact" style="font-weight:700;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.8px;padding:5px 10px;margin:12px 0 6px;background:${CSS_PL_ACCENT};border-radius:${CSS_PL_RADIUS}">${esc(title)}</div>`;
  }
  return `<div class="proposal-section-title" style="font-weight:700;font-size:13px;color:${CSS_BRAND_DARK};text-transform:uppercase;letter-spacing:0.6px;padding-bottom:5px;border-bottom:2px solid ${CSS_BRAND}">${esc(title)}</div>`;
}

export function templateAnchorAttr(id: string): string {
  return ` data-template-anchor="${esc(id)}"`;
}

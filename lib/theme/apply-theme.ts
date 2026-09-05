import type { CSSProperties } from 'react';
import { getFontSizeOption, type CrmFontSizeId } from './font-size';
import { getThemePreset, type CrmThemeCssVars, type CrmThemeId } from './presets';

const THEME_VAR_KEYS = [
  '--g',
  '--gl',
  '--gd',
  '--gm',
  '--gold',
  '--gold-l',
  '--bg',
  '--s',
  '--b',
  '--t',
  '--td',
  '--m',
] as const satisfies readonly (keyof CrmThemeCssVars)[];

/** Inline style object for scoped color-preview wrappers. */
export function themeCssVars(themeId: CrmThemeId): CSSProperties {
  const { vars } = getThemePreset(themeId);
  return vars as CSSProperties;
}

/** Apply color preset tokens on `document.documentElement`. */
export function applyThemeToDocument(themeId: CrmThemeId): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const { vars } = getThemePreset(themeId);
  for (const key of THEME_VAR_KEYS) {
    root.style.setProperty(key, vars[key]);
  }
  root.dataset.crmTheme = themeId;
}

/** Apply base font size + UI scale on `document.documentElement`. */
export function applyFontSizeToDocument(fontSizeId: CrmFontSizeId): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const { px, scale } = getFontSizeOption(fontSizeId);
  root.style.setProperty('--crm-font-size', px);
  root.style.setProperty('--crm-ui-scale', String(scale));
  root.dataset.crmFontSize = fontSizeId;
}

/** Apply both color theme and font size from the given ids. */
export function applyAppearanceToDocument(
  themeId: CrmThemeId,
  fontSizeId: CrmFontSizeId,
): void {
  applyThemeToDocument(themeId);
  applyFontSizeToDocument(fontSizeId);
}

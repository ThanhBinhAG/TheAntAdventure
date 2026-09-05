import { CRM_THEME_IDS, type CrmThemeId } from './presets';
import {
  isCrmFontSizeId,
  type CrmFontSizeId,
} from './font-size';

export type { CrmThemeId, CrmFontSizeId };

export const THEME_STORAGE_KEY = 'crm.theme';
export const FONT_SIZE_STORAGE_KEY = 'crm.fontSize';

/** Legacy combined preset that bundled larger type — migrate to default + large. */
const LEGACY_COMFORTABLE = 'comfortable';

export function isCrmThemeId(value: string | null | undefined): value is CrmThemeId {
  return (
    typeof value === 'string' &&
    (CRM_THEME_IDS as readonly string[]).includes(value)
  );
}

export function readStoredTheme(): CrmThemeId {
  if (typeof window === 'undefined') return 'default';
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === LEGACY_COMFORTABLE) return 'default';
    return isCrmThemeId(raw) ? raw : 'default';
  } catch {
    return 'default';
  }
}

export function writeStoredTheme(themeId: CrmThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readStoredFontSize(): CrmFontSizeId {
  if (typeof window === 'undefined') return 'medium';
  try {
    const raw = window.localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (isCrmFontSizeId(raw)) return raw;
    // One-time migrate: old "comfortable" theme → large font
    const themeRaw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (themeRaw === LEGACY_COMFORTABLE) return 'large';
    return 'medium';
  } catch {
    return 'medium';
  }
}

export function writeStoredFontSize(fontSizeId: CrmFontSizeId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FONT_SIZE_STORAGE_KEY, fontSizeId);
  } catch {
    /* ignore quota / private mode */
  }
}

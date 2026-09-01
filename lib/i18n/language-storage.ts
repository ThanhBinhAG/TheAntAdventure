import type { AppLanguage } from './stages';

export const LANGUAGE_STORAGE_KEY = 'crm.language';

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === 'en' || value === 'vi';
}

export function readStoredLanguage(): AppLanguage {
  if (typeof window === 'undefined') return 'en';
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isAppLanguage(raw) ? raw : 'en';
  } catch {
    return 'en';
  }
}

export function writeStoredLanguage(language: AppLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    /* ignore quota / private mode */
  }
}

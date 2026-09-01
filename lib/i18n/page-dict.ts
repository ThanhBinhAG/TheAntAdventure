import type { AppLanguage } from './stages';

/** Build a typed page dictionary + translator (Sales / Access Control pattern). */
export function createPageDict<const T extends Record<string, string>>(en: T, vi: Record<keyof T, string>) {
  const dict = { en, vi } as const;
  type Key = keyof T;

  function translate(key: Key, language: AppLanguage): string {
    return dict[language][key] ?? dict.en[key];
  }

  return { dict, translate, type: {} as Key };
}

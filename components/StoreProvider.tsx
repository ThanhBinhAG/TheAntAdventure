'use client';

import { useEffect } from 'react';
import { readStoredLanguage } from '@/lib/i18n/language-storage';
import { useStore } from '@/lib/store';

/** Hydrate persisted CRM language on the client after SSR. */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const setLanguage = useStore((s) => s.setLanguage);

  useEffect(() => {
    setLanguage(readStoredLanguage());
  }, [setLanguage]);

  return children;
}

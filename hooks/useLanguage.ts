'use client';

import { useStore } from '@/lib/store';
import { VI_LABELS } from '@/lib/constants';

export function useLanguage() {
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);

  const t = (en: string, vi?: string) => {
    if (language === 'vi') return vi || VI_LABELS[en] || en;
    return en;
  };

  const pageTitle = (enTitle: string) => {
    if (language === 'vi') return VI_LABELS[enTitle] || enTitle;
    return enTitle;
  };

  return { language, setLanguage, t, pageTitle };
}

'use client';

import { useStore } from '@/lib/store';
import { VI_LABELS } from '@/lib/constants';
import { tc as tcFn, type CommonKey } from '@/lib/i18n/common';
import { tsf as tsfFn, tLostReason as tLostReasonFn, type SalesKey } from '@/lib/i18n/pages/sales';
import { tStage as tStageFn } from '@/lib/i18n/stages';

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

  const tc = (key: CommonKey) => tcFn(key, language);
  const tsf = (key: SalesKey) => tsfFn(key, language);
  const tStage = (stage: string) => tStageFn(stage, language);
  const tLostReason = (reason: string) => tLostReasonFn(reason, language);

  return { language, setLanguage, t, pageTitle, tc, tsf, tStage, tLostReason };
}

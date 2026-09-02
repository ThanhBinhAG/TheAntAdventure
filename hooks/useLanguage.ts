'use client';

import { useCallback, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { pageTitleForSlug } from '@/lib/i18n/page-titles';
import { tc as tcFn, formatI18n, type CommonKey } from '@/lib/i18n/common';
import { tsf as tsfFn, tLostReason as tLostReasonFn, type SalesKey } from '@/lib/i18n/pages/sales';
import { tac as tacFn } from '@/lib/i18n/pages/access-control';
import { tStage as tStageFn } from '@/lib/i18n/stages';
import { tp as tpFn, tpl as tplFn, type I18nPageKey } from '@/lib/i18n/translate';
import type { PageSlug } from '@/lib/types';

export function useLanguage() {
  const language = useStore((s) => s.language);
  const setLanguage = useStore((s) => s.setLanguage);

  const t = useCallback((en: string, vi?: string) => {
    if (language === 'vi') return vi ?? en;
    return en;
  }, [language]);

  const pageTitle = useCallback((slug: PageSlug) => pageTitleForSlug(slug, language), [language]);

  const tc = useCallback((key: CommonKey) => tcFn(key, language), [language]);
  const tsf = useCallback((key: SalesKey) => tsfFn(key, language), [language]);
  const tac = useCallback((key: Parameters<typeof tacFn>[0]) => tacFn(key, language), [language]);
  const tStage = useCallback((stage: string) => tStageFn(stage, language), [language]);
  const tLostReason = useCallback((reason: string) => tLostReasonFn(reason, language), [language]);
  const tp = useCallback((page: I18nPageKey, key: string) => tpFn(page, key, language), [language]);
  const tpl = useCallback(
    (page: I18nPageKey, key: string, vars?: Record<string, string | number>) =>
      tplFn(page, key, language, vars),
    [language]
  );
  const fmt = useCallback(
    (template: string, vars?: Record<string, string | number>) => formatI18n(template, vars),
    []
  );

  return useMemo(
    () => ({
      language,
      setLanguage,
      t,
      pageTitle,
      tc,
      tsf,
      tac,
      tStage,
      tLostReason,
      tp,
      tpl,
      fmt,
    }),
    [language, setLanguage, t, pageTitle, tc, tsf, tac, tStage, tLostReason, tp, tpl, fmt]
  );
}

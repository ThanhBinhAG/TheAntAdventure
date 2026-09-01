'use client';

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

  const t = (en: string, vi?: string) => {
    if (language === 'vi') return vi ?? en;
    return en;
  };

  const pageTitle = (slug: PageSlug) => pageTitleForSlug(slug, language);

  const tc = (key: CommonKey) => tcFn(key, language);
  const tsf = (key: SalesKey) => tsfFn(key, language);
  const tac = (key: Parameters<typeof tacFn>[0]) => tacFn(key, language);
  const tStage = (stage: string) => tStageFn(stage, language);
  const tLostReason = (reason: string) => tLostReasonFn(reason, language);
  const tp = (page: I18nPageKey, key: string) => tpFn(page, key, language);
  const tpl = (page: I18nPageKey, key: string, vars?: Record<string, string | number>) =>
    tplFn(page, key, language, vars);
  const fmt = (template: string, vars?: Record<string, string | number>) =>
    formatI18n(template, vars);

  return {
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
  };
}

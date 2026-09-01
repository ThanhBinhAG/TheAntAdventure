import type { AppLanguage } from './stages';
import { formatI18n } from './common';
import { tat, type ATTRACTIONSKey } from './pages/attractions';
import { tauth, type AUTHKey } from './pages/auth';
import { tagents, type AGENTSKey } from './pages/agents';
import { tbk, type BOOKINGSKey } from './pages/bookings';
import { tch, type CHROMEKey } from './pages/chrome';
import { tcon, type CONTRACTSKey } from './pages/contracts';
import { tcust, type CUSTOMERSKey } from './pages/customers';
import { tdb, type DASHBOARDKey } from './pages/dashboard';
import { tdn, type DEV_NOTESKey } from './pages/dev-notes';
import { tfin, type FINANCEKey } from './pages/finance';
import { tgal, type GALLERYKey } from './pages/gallery';
import { tgui, type GUIDESKey } from './pages/guides';
import { thr, type HRKey } from './pages/hr';
import { tpln, type PLANNERKey } from './pages/planner';
import { tpor, type PORTALKey } from './pages/portal';
import { tpt, type POST_TOURKey } from './pages/post-tour';
import { tprc, type PRICINGKey } from './pages/pricing';
import { tprod, type PRODUCTSKey } from './pages/products';
import { tsal, type SALARYKey } from './pages/salary';
import { tsup, type SUPPLIERSKey } from './pages/suppliers';
import { ttax, type TAXKey } from './pages/tax';
import { ttd, type TOUR_DESIGNKey } from './pages/tour-design';
import { twth, type WEATHERKey } from './pages/weather';
import { tac, type AccessControlKey } from './pages/access-control';
import { tsf, type SalesKey } from './pages/sales';

export const I18N_PAGES = {
  attractions: { translate: tat },
  auth: { translate: tauth },
  agents: { translate: tagents },
  bookings: { translate: tbk },
  chrome: { translate: tch },
  contracts: { translate: tcon },
  customers: { translate: tcust },
  dashboard: { translate: tdb },
  'dev-notes': { translate: tdn },
  finance: { translate: tfin },
  gallery: { translate: tgal },
  guides: { translate: tgui },
  hr: { translate: thr },
  planner: { translate: tpln },
  portal: { translate: tpor },
  'post-tour': { translate: tpt },
  pricing: { translate: tprc },
  products: { translate: tprod },
  salary: { translate: tsal },
  suppliers: { translate: tsup },
  tax: { translate: ttax },
  'tour-design': { translate: ttd },
  weather: { translate: twth },
  'access-control': { translate: tac },
  sales: { translate: tsf },
} as const;

export type I18nPageKey = keyof typeof I18N_PAGES;

export function tp(page: I18nPageKey, key: string, language: AppLanguage): string {
  const entry = I18N_PAGES[page];
  return (entry.translate as (k: string, lang: AppLanguage) => string)(key, language);
}

export function tpl(
  page: I18nPageKey,
  key: string,
  language: AppLanguage,
  vars?: Record<string, string | number>
): string {
  return formatI18n(tp(page, key, language), vars);
}

// Re-export typed keys for convenience
export type {
  ATTRACTIONSKey,
  AUTHKey,
  AGENTSKey,
  BOOKINGSKey,
  CHROMEKey,
  CONTRACTSKey,
  CUSTOMERSKey,
  DASHBOARDKey,
  DEV_NOTESKey,
  FINANCEKey,
  GALLERYKey,
  GUIDESKey,
  HRKey,
  PLANNERKey,
  PORTALKey,
  POST_TOURKey,
  PRICINGKey,
  PRODUCTSKey,
  SALARYKey,
  SUPPLIERSKey,
  TAXKey,
  TOUR_DESIGNKey,
  WEATHERKey,
  AccessControlKey,
  SalesKey,
};

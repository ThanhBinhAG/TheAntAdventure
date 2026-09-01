import type { AppLanguage } from './stages';

export const ATTRACTION_REGION_LABELS: Record<string, Record<AppLanguage, string>> = {
  north: { en: 'Northern Vietnam', vi: 'Miền Bắc' },
  central: { en: 'Central Vietnam', vi: 'Miền Trung' },
  south: { en: 'Southern Vietnam', vi: 'Miền Nam' },
};

export const ATTRACTION_TYPE_LABELS: Record<string, Record<AppLanguage, string>> = {
  museum: { en: 'Museum', vi: 'Bảo tàng' },
  heritage: { en: 'Heritage', vi: 'Di sản' },
  temple: { en: 'Temple', vi: 'Chùa / Đền' },
  landmark: { en: 'Landmark', vi: 'Địa danh' },
  nature: { en: 'Nature', vi: 'Thiên nhiên' },
};

export function tAttractionRegion(region: string, language: AppLanguage): string {
  return ATTRACTION_REGION_LABELS[region]?.[language] ?? region;
}

export function tAttractionType(type: string, language: AppLanguage): string {
  return ATTRACTION_TYPE_LABELS[type]?.[language] ?? type;
}

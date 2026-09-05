/** Catalog kind registry for Settings + form hydration. */

export const CRM_CATALOG_KINDS = [
  'country',
  'nationality',
  'customer_source',
  'customer_language',
  'customer_budget',
  'salesperson',
  'travel_style',
] as const;

export type CrmCatalogKind = (typeof CRM_CATALOG_KINDS)[number];

/** Kinds stored in `crm_catalog_items` (travel_style uses legacy `travel_styles` table). */
export const CRM_CATALOG_DB_KINDS = [
  'country',
  'nationality',
  'customer_source',
  'customer_language',
  'customer_budget',
  'salesperson',
] as const satisfies readonly CrmCatalogKind[];

export type CrmCatalogDbKind = (typeof CRM_CATALOG_DB_KINDS)[number];

export function isCrmCatalogKind(value: string): value is CrmCatalogKind {
  return (CRM_CATALOG_KINDS as readonly string[]).includes(value);
}

export function isCrmCatalogDbKind(value: string): value is CrmCatalogDbKind {
  return (CRM_CATALOG_DB_KINDS as readonly string[]).includes(value);
}

export type CatalogKindMeta = {
  kind: CrmCatalogKind;
  en: string;
  vi: string;
};

export const CATALOG_KIND_META: CatalogKindMeta[] = [
  { kind: 'country', en: 'Countries', vi: 'Quốc gia' },
  { kind: 'nationality', en: 'Nationalities', vi: 'Quốc tịch' },
  { kind: 'customer_source', en: 'Sources', vi: 'Nguồn khách' },
  { kind: 'customer_language', en: 'Guide languages', vi: 'Ngôn ngữ HDV' },
  { kind: 'customer_budget', en: 'Budget ranges', vi: 'Ngân sách' },
  { kind: 'salesperson', en: 'Salespeople', vi: 'Nhân viên sales' },
  { kind: 'travel_style', en: 'Travel styles', vi: 'Phong cách tour' },
];

export type CatalogItem = {
  kind: CrmCatalogKind;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
};

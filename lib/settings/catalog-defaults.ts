import { COUNTRIES } from '@/lib/customers/countries';
import { NATIONALITIES } from '@/lib/customers/nationalities';
import {
  CUSTOMER_BUDGET_RANGES,
  CUSTOMER_LANGUAGES,
  CUSTOMER_SOURCES,
  SALES_PEOPLE,
} from '@/lib/customers/customer-form';
import { DEFAULT_TRAVEL_STYLES } from '@/lib/customers/travel-styles';
import type { CrmCatalogDbKind, CrmCatalogKind } from '@/lib/settings/catalog-kinds';

/** Offline / API-failure fallbacks for form SearchableSelect options. */
export const DEFAULT_CATALOG_LABELS: Record<CrmCatalogDbKind | 'travel_style', readonly string[]> = {
  country: COUNTRIES,
  nationality: NATIONALITIES,
  customer_source: CUSTOMER_SOURCES,
  customer_language: CUSTOMER_LANGUAGES,
  customer_budget: CUSTOMER_BUDGET_RANGES,
  salesperson: SALES_PEOPLE,
  travel_style: DEFAULT_TRAVEL_STYLES.filter((style) => style.isActive).map((style) => style.label),
};

export const CUSTOMER_FORM_CATALOG_KINDS: CrmCatalogKind[] = [
  'country',
  'nationality',
  'customer_source',
  'customer_language',
  'customer_budget',
  'salesperson',
  'travel_style',
];

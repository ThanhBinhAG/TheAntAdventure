import * as XLSX from 'xlsx';
import { localTodayIso } from '../core/date-utils';
import type { PricingTableRow } from '../products/product-pricing-helpers';
import {
  ICO_KEYS,
  type PlCurrency,
  fmtPx,
  getCostUSD,
  getSpUSD,
  mkPct,
} from './pricing-utils';

const PAX_TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export interface PricingExportOptions {
  currency: PlCurrency;
  showCost: boolean;
  filterSummary?: string;
}

export function paxColumnLabel(n: number): string {
  return n === 10 ? '10+ PAX' : `${n} PAX`;
}

export function buildPricingSheetData(
  rows: PricingTableRow[],
  options: PricingExportOptions
): (string | number)[][] {
  const { currency, showCost } = options;
  const inclHeaders = ['Guide', 'Transport', 'Tickets', 'Water', 'Meals'];
  const paxHeaders = PAX_TIERS.map((n) => paxColumnLabel(n));

  const header: string[] = [
    'Tour ID',
    'Tour Name',
    'Duration',
    'Region',
    'Category',
    ...inclHeaders,
    ...paxHeaders,
  ];

  if (showCost) {
    for (const n of PAX_TIERS) {
      const label = paxColumnLabel(n);
      header.push(`Cost ${label}`, `Mk% ${label}`);
    }
  }

  const meta: (string | number)[][] = [
    [
      'The Ant Adventures — Price List 2026',
      `Currency: ${currency}`,
      `Products: ${rows.length}`,
      `Exported: ${localTodayIso()}`,
    ],
  ];
  if (options.filterSummary) {
    meta.push([options.filterSummary]);
  }

  const body = rows.map((t) => {
    const incl = ICO_KEYS.map((k) => (t.pricing.incl[k] ? 'Yes' : 'No'));
    const sells = PAX_TIERS.map((n) => {
      const sp = getSpUSD(t.pricing, n);
      return sp ? fmtPx(sp, currency) : '—';
    });

    const row: (string | number)[] = [
      t.productCode,
      t.name,
      t.duration,
      t.region,
      t.category,
      ...incl,
      ...sells,
    ];

    if (showCost) {
      for (const n of PAX_TIERS) {
        const sp = getSpUSD(t.pricing, n);
        const co = getCostUSD(t.pricing, n);
        row.push(co ? fmtPx(co, currency) : '—', sp && co ? `${mkPct(sp, co)}%` : '—');
      }
    }

    return row;
  });

  return [...meta, [], header, ...body];
}

export function pricingExportFilename(currency: PlCurrency): string {
  const date = localTodayIso();
  return `TAA-PriceList-2026-${currency}-${date}.xlsx`;
}

export function downloadPricingXlsx(
  rows: PricingTableRow[],
  options: PricingExportOptions
): void {
  const data = buildPricingSheetData(rows, options);
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Price List 2026');
  XLSX.writeFile(wb, pricingExportFilename(options.currency));
}

export function buildPricingFilterSummary(filters: {
  search?: string;
  region?: string;
  category?: string;
  duration?: string;
}): string | undefined {
  const parts: string[] = [];
  if (filters.search) parts.push(`Search: ${filters.search}`);
  if (filters.region) parts.push(`Region: ${filters.region}`);
  if (filters.category) parts.push(`Category: ${filters.category}`);
  if (filters.duration) parts.push(`Duration: ${filters.duration}`);
  return parts.length ? `Filters: ${parts.join(' · ')}` : undefined;
}

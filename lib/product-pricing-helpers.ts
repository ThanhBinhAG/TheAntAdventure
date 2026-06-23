import type { Product, ProductPricing, ProductPricingInclusions } from './types';
import type { TaaTour } from './seeds/taa-tours';

export type PricingStatus = 'complete' | 'incomplete' | 'missing';

export interface PricingTableRow {
  num: number;
  productCode: string;
  name: string;
  region: string;
  duration: string;
  category: string;
  level: string;
  pricing: ProductPricing;
  orphanPricing?: boolean;
  missingProduct?: boolean;
}

const REGION_TO_FILTER: Record<string, string> = {
  north: 'North',
  central: 'Central',
  south: 'South',
  national: 'National',
  services: 'Services',
};

export function regionToFilterLabel(region: string): string {
  return REGION_TO_FILTER[region] ?? region;
}

export function emptyProductPricing(productCode: string): ProductPricing {
  const zero = 0;
  const incl: ProductPricingInclusions = { g: false, tr: false, tk: false, w: false, m: false };
  return {
    productCode,
    stdCost: zero,
    p1: zero,
    p2: zero,
    p3: zero,
    p4: zero,
    p5: zero,
    p6: zero,
    p7: zero,
    p8: zero,
    p9: zero,
    p10: zero,
    c1: zero,
    c2: zero,
    c3: zero,
    c4: zero,
    c5: zero,
    c6: zero,
    c7: zero,
    c8: zero,
    c9: zero,
    c10: zero,
    incl,
  };
}

export function taaTourToProductPricing(t: TaaTour): ProductPricing {
  return {
    productCode: t.id,
    stdCost: t.stdCost,
    p1: t.p1,
    p2: t.p2,
    p3: t.p3,
    p4: t.p4,
    p5: t.p5,
    p6: t.p6,
    p7: t.p7,
    p8: t.p8,
    p9: t.p9,
    p10: t.p10,
    c1: t.c1,
    c2: t.c2,
    c3: t.c3,
    c4: t.c4,
    c5: t.c5,
    c6: t.c6,
    c7: t.c7,
    c8: t.c8,
    c9: t.c9,
    c10: t.c10,
    incl: { ...t.incl },
  };
}

export function getSellFromRow(row: ProductPricing, paxN: number): number {
  const key = `p${paxN}` as keyof ProductPricing;
  const v = row[key];
  return typeof v === 'number' ? v : 0;
}

export function getCostFromRow(row: ProductPricing, paxN: number): number {
  const key = `c${paxN}` as keyof ProductPricing;
  const v = row[key];
  return typeof v === 'number' ? v : 0;
}

export function priceLabelFromRow(row: ProductPricing, pax = 2): string {
  const pn = Math.min(Math.max(pax, 1), 10);
  const price = getSellFromRow(row, pn);
  if (price > 0) return `$${price}/pax`;
  return 'Price on request';
}

export function pricingStatus(row: ProductPricing | undefined): PricingStatus {
  if (!row) return 'missing';
  const hasSell = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some((n) => getSellFromRow(row, n) > 0);
  const hasCost = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some((n) => getCostFromRow(row, n) > 0);
  if (hasSell && hasCost) return 'complete';
  if (hasSell || hasCost || row.stdCost > 0) return 'incomplete';
  return 'missing';
}

export function buildPricingTableRows(products: Product[], pricing: ProductPricing[]): PricingTableRow[] {
  const productByCode = new Map(products.map((p) => [p.code, p]));
  const pricingByCode = new Map(pricing.map((p) => [p.productCode, p]));
  const codes = new Set([...productByCode.keys(), ...pricingByCode.keys()]);
  let num = 0;

  return [...codes]
    .sort((a, b) => a.localeCompare(b))
    .map((code) => {
      num += 1;
      const product = productByCode.get(code);
      const row = pricingByCode.get(code) ?? emptyProductPricing(code);
      return {
        num,
        productCode: code,
        name: product?.name ?? '(orphan pricing — no product)',
        region: product ? regionToFilterLabel(product.region) : '—',
        duration: product?.dur ?? '—',
        category: product?.cat ?? '—',
        level: product?.lvl ?? '—',
        pricing: row,
        orphanPricing: !product && !!pricingByCode.get(code),
        missingProduct: !!product && !pricingByCode.get(code),
      };
    });
}

export function pricingUrlForProduct(code: string): string {
  return `/pricing?product=${encodeURIComponent(code)}`;
}

/** Merge remote pricing with seed defaults so legacy rows are never lost */
export function mergeProductPricing(remote: ProductPricing[] | undefined, seed: ProductPricing[]): ProductPricing[] {
  const byCode = new Map((remote ?? []).map((p) => [p.productCode, p]));
  for (const row of seed) {
    if (!byCode.has(row.productCode)) byCode.set(row.productCode, row);
  }
  return [...byCode.values()].sort((a, b) => a.productCode.localeCompare(b.productCode));
}

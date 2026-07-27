import { useStore } from './store';
import type { ProductPricing } from './types';
import { getCostFromRow, getSellFromRow, priceLabelFromRow } from './product-pricing-helpers';

export const PRICING_TIERS: { n: number; label: string }[] = [
  { n: 1, label: 'Solo' },
  { n: 2, label: '2 Pax' },
  { n: 3, label: '3-4 Pax' },
  { n: 5, label: '5-6 Pax' },
  { n: 7, label: '7-9 Pax' },
  { n: 10, label: '10+ Pax' },
];

export function getPricingCatalog(): ProductPricing[] {
  return useStore.getState().productPricing;
}

export function findProductPricing(productCode: string): ProductPricing | undefined {
  return getPricingCatalog().find((t) => t.productCode === productCode);
}

export function paxToTierN(pax: number): number {
  if (pax <= 1) return 1;
  if (pax === 2) return 2;
  if (pax <= 4) return 3;
  if (pax <= 6) return 5;
  if (pax <= 9) return 7;
  return 10;
}

export function paxToExactN(pax: number): number {
  if (pax >= 10) return 10;
  if (pax <= 0) return 1;
  return pax;
}

export function getSellPrice(productCode: string, paxN: number): number {
  const t = findProductPricing(productCode);
  if (!t) return 0;
  return getSellFromRow(t, paxN);
}

export function getCostPrice(productCode: string, paxN: number): number {
  const t = findProductPricing(productCode);
  if (!t) return 0;
  return getCostFromRow(t, paxN);
}

export function getAdjustedSell(productCode: string, tierN: number, markupPct: number): number {
  if (markupPct === 30) return getSellPrice(productCode, tierN);
  const cost = getCostPrice(productCode, tierN);
  return Math.round(cost * (1 + markupPct / 100));
}

export function getLibPriceLabel(productCode: string, pax: number): string {
  const row = findProductPricing(productCode);
  if (!row) return 'Price on request';
  return priceLabelFromRow(row, pax);
}

export function sumSellForProducts(codes: string[], paxN: number, markupPct = 30): number {
  return codes.reduce((s, code) => s + getAdjustedSell(code, paxN, markupPct), 0);
}

export function sumCostForProducts(codes: string[], paxN: number): number {
  return codes.reduce((s, code) => s + getCostPrice(code, paxN), 0);
}

export function markupPct(sell: number, cost: number): number {
  if (!sell || !cost || sell <= 0) return 0;
  return Math.round(((sell - cost) / sell) * 100);
}

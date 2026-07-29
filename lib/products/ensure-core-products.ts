import { AA_PRODUCTS } from '@/lib/seeds/products';
import type { Product } from '@/lib/types';

/** Service products that must exist even when remote DB is missing them */
export const REQUIRED_SERVICE_CODES = ['SV-SVC-VOA-01', 'SV-SGN-HD-01', 'SV-SGN-HD-02'] as const;

export function mergeRequiredProducts(products: Product[]): Product[] {
  const byCode = new Map(products.map((p) => [p.code, p]));
  let changed = false;

  for (const code of REQUIRED_SERVICE_CODES) {
    if (!byCode.has(code)) {
      const seed = AA_PRODUCTS.find((p) => p.code === code);
      if (seed) {
        byCode.set(code, seed as unknown as Product);
        changed = true;
      }
    }
  }

  if (!changed) return products;

  const merged = [...products];
  for (const code of REQUIRED_SERVICE_CODES) {
    if (!products.some((p) => p.code === code) && byCode.has(code)) {
      merged.unshift(byCode.get(code)!);
    }
  }
  return merged;
}

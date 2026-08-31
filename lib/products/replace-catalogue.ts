import { emptyProductPricing } from '@/lib/products/product-pricing-helpers';
import type { PortfolioDraftProduct } from '@/lib/products/portfolio-classify';
import { useStore } from '@/lib/store';
import type { Product, ProductPricing } from '@/lib/types';

export interface ReplaceCatalogueResult {
  ok: boolean;
  imported: number;
  pricingStubs: number;
  error?: string;
}

/** Zero-tier pricing rows keyed by product code — shared by Pricing, cards, proposals after import. */
export function buildEmptyPricingStubs(products: Product[]): ProductPricing[] {
  return products.map((p) => emptyProductPricing(p.code));
}

/**
 * Replace catalogue via CRM BFF (`POST /api/products/import`), then mirror products/pricing in Zustand.
 */
export async function replaceCatalogueFromDrafts(
  drafts: PortfolioDraftProduct[],
): Promise<ReplaceCatalogueResult> {
  try {
    const res = await fetch('/api/products/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drafts }),
    });

    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error ?? 'Import failed');
    }

    const json = await res.json();
    if (!json.ok) {
      throw new Error(json.error ?? 'Import failed');
    }

    const { products, pricingStubs } = json.data;

    useStore.getState().setProducts(products);
    useStore.getState().setProductPricing(pricingStubs);

    return { ok: true, imported: products.length, pricingStubs: pricingStubs.length };
  } catch (e) {
    return {
      ok: false,
      imported: 0,
      pricingStubs: 0,
      error: e instanceof Error ? e.message : 'Replace catalogue failed',
    };
  }
}

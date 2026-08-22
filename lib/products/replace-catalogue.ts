import { countBackupRows } from '@/lib/db/sync-config';
import { updateBaselineCounts } from '@/lib/db/sync-lifecycle';
import { isRemoteDataEnabled, isSupabaseReadOnly } from '@/lib/env';
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
 * Wipe all remote products (pricing cascades), upsert imported catalogue,
 * then create empty product_pricing stubs linked by product_code for every product.
 */
export async function replaceCatalogueFromDrafts(
  drafts: PortfolioDraftProduct[]
): Promise<ReplaceCatalogueResult> {
  if (!isRemoteDataEnabled()) {
    return { ok: false, imported: 0, pricingStubs: 0, error: 'Supabase is not enabled' };
  }
  if (isSupabaseReadOnly()) {
    return { ok: false, imported: 0, pricingStubs: 0, error: 'Supabase is read-only' };
  }

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

    updateBaselineCounts(countBackupRows(useStore.getState().exportBackup()));

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

import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import { productPricingToRow, productToRow } from '@/lib/db/mappers';
import { countBackupRows } from '@/lib/db/sync-config';
import { updateBaselineCounts } from '@/lib/db/sync-lifecycle';
import { isRemoteDataEnabled, isSupabaseReadOnly } from '@/lib/env';
import { mergeRequiredProducts } from '@/lib/products/ensure-core-products';
import { emptyProductPricing } from '@/lib/products/product-pricing-helpers';
import { draftToProduct, type PortfolioDraftProduct } from '@/lib/products/portfolio-classify';
import { getSupabaseClient } from '@/lib/supabase';
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

  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, imported: 0, pricingStubs: 0, error: 'Supabase client unavailable' };
  }

  const imported: Product[] = drafts.map(draftToProduct);
  const products = mergeRequiredProducts(imported);
  const pricingStubs = buildEmptyPricingStubs(products);

  try {
    await withoutAutoSyncAsync(async () => {
      // Delete all products — previous product_pricing cascades via FK.
      const { error: delErr } = await client.from('products').delete().neq('code', '');
      if (delErr) throw delErr;

      if (products.length) {
        const rows = products.map((p) => productToRow(p));
        const { error: upsertErr } = await client.from('products').upsert(rows, { onConflict: 'code' });
        if (upsertErr) throw upsertErr;
      }

      if (pricingStubs.length) {
        const pricingRows = pricingStubs.map((p) => productPricingToRow(p));
        const { error: pricingErr } = await client
          .from('product_pricing')
          .upsert(pricingRows, { onConflict: 'product_code' });
        if (pricingErr) throw pricingErr;
      }

      useStore.getState().setProducts(products);
      useStore.getState().setProductPricing(pricingStubs);
    });

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

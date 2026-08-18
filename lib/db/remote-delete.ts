import { isRemoteDataEnabled, isSupabaseReadOnly } from '../env';
import { invalidateProductFacetsFromClient } from '../products/product-facets-client';
import { appLog } from '../system/app-logger';
import { db } from './supabase';

/** Explicit remote delete when user removes a customer in the UI. */
export async function deleteCustomerFromRemote(id: string): Promise<void> {
  if (!isRemoteDataEnabled() || isSupabaseReadOnly()) return;

  await db.customers.deleteRemote(id);
}

/** Explicit remote delete when user removes a product in the UI. */
export async function deleteProductFromRemote(code: string): Promise<void> {
  if (!isRemoteDataEnabled() || isSupabaseReadOnly()) return;

  try {
    await db.product_pricing.deleteRemote(code);
    await db.products.deleteRemote(code);
    await invalidateProductFacetsFromClient();
  } catch (e) {
    appLog('remote-delete', 'Failed to delete product from Supabase', {
      level: 'warn',
      error: e,
      meta: { code },
    });
  }
}

/** Explicit remote delete when user removes pricing only. */
export async function deleteProductPricingFromRemote(productCode: string): Promise<void> {
  if (!isRemoteDataEnabled() || isSupabaseReadOnly()) return;

  try {
    await db.product_pricing.deleteRemote(productCode);
    await invalidateProductFacetsFromClient();
  } catch (e) {
    appLog('remote-delete', 'Failed to delete product_pricing from Supabase', {
      level: 'warn',
      error: e,
      meta: { productCode },
    });
  }
}

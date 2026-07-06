import { isRemoteDataEnabled, isSupabaseReadOnly } from '../env';
import { db } from './supabase';

/** Explicit remote delete when user removes a product in the UI. */
export async function deleteProductFromRemote(code: string): Promise<void> {
  if (!isRemoteDataEnabled() || isSupabaseReadOnly()) return;

  try {
    await db.product_pricing.deleteRemote(code);
    await db.products.deleteRemote(code);
  } catch (e) {
    console.warn('[CRM] Failed to delete product from Supabase:', code, e);
  }
}

/** Explicit remote delete when user removes pricing only. */
export async function deleteProductPricingFromRemote(productCode: string): Promise<void> {
  if (!isRemoteDataEnabled() || isSupabaseReadOnly()) return;

  try {
    await db.product_pricing.deleteRemote(productCode);
  } catch (e) {
    console.warn('[CRM] Failed to delete product_pricing from Supabase:', productCode, e);
  }
}

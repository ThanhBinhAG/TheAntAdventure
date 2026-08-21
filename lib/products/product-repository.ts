import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import {
  productToRow,
  productPricingToRow,
  rowToProductPricing,
  productPhotoRows,
  assembleProducts,
} from '@/lib/db/mappers';
import type { Product, ProductPricing } from '@/lib/types';

/**
 * Lấy toàn bộ sản phẩm (kèm ảnh) từ server.
 */
export async function getAllProductsServer(): Promise<Product[]> {
  const supabase = await getServerSupabaseClient();
  
  // 1. Lấy tất cả hàng trong bảng products
  const { data: baseRows, error: prodError } = await supabase
    .from('products')
    .select('*')
    .order('code');
  if (prodError) throw prodError;

  // 2. Lấy các liên kết ảnh trong product_photos
  const { data: linkRows, error: photoError } = await supabase
    .from('product_photos')
    .select('*');
  if (photoError) throw photoError;

  return assembleProducts(baseRows || [], linkRows || []) as unknown as Product[];
}

/**
 * Lấy toàn bộ thông tin bảng giá từ server.
 */
export async function getAllProductPricingServer(): Promise<ProductPricing[]> {
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('product_pricing')
    .select('*')
    .order('product_code');
  if (error) throw error;

  return (data || []).map(rowToProductPricing);
}

/** Replace the full catalogue and its required pricing stubs in one database transaction. */
export async function replaceProductCatalogueServer(
  supabase: SupabaseClient,
  products: Product[],
  pricingStubs: ProductPricing[]
): Promise<void> {
  const { error } = await supabase.rpc('replace_product_catalogue_transaction', {
    p_products: products.map(productToRow),
    p_pricing_stubs: pricingStubs.map(productPricingToRow),
  });
  if (error) throw error;
}

/**
 * Thêm sản phẩm mới và default pricing row.
 */
export async function createProductServer(
  supabase: SupabaseClient,
  product: Product
): Promise<Product> {
  const prodRow = productToRow(product);

  // 1. Insert product
  const { error: prodErr } = await supabase
    .from('products')
    .insert(prodRow);
  if (prodErr) throw prodErr;

  // 2. Insert default empty pricing stub
  const pricingStub: ProductPricing = {
    productCode: product.code,
    stdCost: 0,
    p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0, p8: 0, p9: 0, p10: 0,
    c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, c6: 0, c7: 0, c8: 0, c9: 0, c10: 0,
    incl: { g: false, tr: false, tk: false, w: false, m: false },
  };
  const pricingRow = productPricingToRow(pricingStub);
  const { error: pricingErr } = await supabase
    .from('product_pricing')
    .insert(pricingRow);
  if (pricingErr) throw pricingErr;

  // 3. Insert photo links
  const photoLinks = productPhotoRows(product);
  if (photoLinks.length > 0) {
    const { error: photoErr } = await supabase
      .from('product_photos')
      .insert(photoLinks);
    if (photoErr) throw photoErr;
  }

  return product;
}

/**
 * Cập nhật thông tin chi tiết sản phẩm và ảnh.
 */
export async function updateProductServer(
  supabase: SupabaseClient,
  code: string,
  product: Product
): Promise<Product> {
  const prodRow = productToRow(product);

  // 1. Update product base data
  const { error: prodErr } = await supabase
    .from('products')
    .update(prodRow)
    .eq('code', code);
  if (prodErr) throw prodErr;

  // 2. Sync photo links: Xóa ảnh cũ và insert ảnh mới
  const { error: delErr } = await supabase
    .from('product_photos')
    .delete()
    .eq('product_code', code);
  if (delErr) throw delErr;

  const photoLinks = productPhotoRows(product);
  if (photoLinks.length > 0) {
    const { error: photoErr } = await supabase
      .from('product_photos')
      .insert(photoLinks);
    if (photoErr) throw photoErr;
  }

  return product;
}

/**
 * Xóa một sản phẩm bằng code (DB cascade tự động xóa pricing & photo links).
 */
export async function deleteProductServer(
  supabase: SupabaseClient,
  code: string
): Promise<void> {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('code', code);
  if (error) throw error;
}

/**
 * Cập nhật thông tin chi tiết bảng giá.
 */
export async function updateProductPricingServer(
  supabase: SupabaseClient,
  pricing: ProductPricing
): Promise<ProductPricing> {
  const pricingRow = productPricingToRow(pricing);
  const { error } = await supabase
    .from('product_pricing')
    .upsert(pricingRow, { onConflict: 'product_code' });
  if (error) throw error;

  return pricing;
}

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

export class ProductNotFoundError extends Error {
  constructor(code: string) {
    super(`Không tìm thấy Product: ${code}.`);
    this.name = 'ProductNotFoundError';
  }
}

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

/** Read one Product aggregate for detail/editing without hydrating the catalogue. */
export async function getProductByCodeServer(
  supabase: SupabaseClient,
  code: string
): Promise<Product | null> {
  const { data: baseRow, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('code', code)
    .maybeSingle();
  if (productError) throw productError;
  if (!baseRow) return null;

  const { data: links, error: photoError } = await supabase
    .from('product_photos')
    .select('*')
    .eq('product_code', code);
  if (photoError) throw photoError;

  return assembleProducts([baseRow], links ?? [])[0] as unknown as Product;
}

/** Read one pricing row for a Product on demand. */
export async function getProductPricingByCodeServer(
  supabase: SupabaseClient,
  productCode: string
): Promise<ProductPricing | null> {
  const { data, error } = await supabase
    .from('product_pricing')
    .select('*')
    .eq('product_code', productCode)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProductPricing(data) : null;
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
  await saveProductAggregateServer(supabase, product);
  return product;
}

function defaultProductPricing(productCode: string): ProductPricing {
  return {
    productCode,
    stdCost: 0,
    p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, p6: 0, p7: 0, p8: 0, p9: 0, p10: 0,
    c1: 0, c2: 0, c3: 0, c4: 0, c5: 0, c6: 0, c7: 0, c8: 0, c9: 0, c10: 0,
    incl: { g: false, tr: false, tk: false, w: false, m: false },
  };
}

/** Save Product, create its default Pricing when missing, and replace photo links atomically. */
async function saveProductAggregateServer(
  supabase: SupabaseClient,
  product: Product
): Promise<void> {
  const { error } = await supabase.rpc('save_product_aggregate', {
    p_product: productToRow(product),
    p_pricing_stub: productPricingToRow(defaultProductPricing(product.code)),
    p_photo_links: productPhotoRows(product),
  });
  if (error) throw error;
}

/**
 * Cập nhật thông tin chi tiết sản phẩm và ảnh.
 */
export async function updateProductServer(
  supabase: SupabaseClient,
  code: string,
  product: Product
): Promise<Product> {
  if (code !== product.code) {
    throw new Error('Product code cannot change during update');
  }
  const { error } = await supabase.rpc('update_product_aggregate', {
    p_product: productToRow(product),
    p_pricing_stub: productPricingToRow(defaultProductPricing(product.code)),
    p_photo_links: productPhotoRows(product),
  });
  if (error) {
    if (error.code === 'P0002') throw new ProductNotFoundError(code);
    throw error;
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
  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('code', code)
    .select('code');
  if (error) throw error;
  if (!data?.length) throw new ProductNotFoundError(code);
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

import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { rowToSupplier, supplierToRow } from '@/lib/db/mappers';
import type { Row } from '@/lib/db/mappers/shared';
import type { ExtendedSupplier } from '@/lib/types';
import { nextSupplierId } from './supplier-utils';
import { SupplierRepositoryError } from './supplier-errors';
import {
  inputToExtendedSupplier,
  type ExtendedSupplierInput,
  type ExtendedSupplierListItem,
} from './extended-supplier-input';

export { SupplierRepositoryError } from './supplier-errors';
export type { ExtendedSupplierListItem } from './extended-supplier-input';

function mapTaggedRow(raw: Row): ExtendedSupplierListItem {
  const nested = (raw.supplier_tags as Row[] | undefined) ?? [];
  const { supplier_tags: _tags, ...base } = raw;
  void _tags;
  const tags = nested.map((t) => String(t.tag));
  return rowToSupplier(base, tags) as unknown as ExtendedSupplierListItem;
}

async function syncSupplierTags(
  supabase: SupabaseClient,
  supplierId: string,
  tags: string[],
): Promise<void> {
  const { error: delErr } = await supabase
    .from('supplier_tags')
    .delete()
    .eq('supplier_id', supplierId);
  if (delErr) throw new SupplierRepositoryError(delErr.message);

  if (!tags.length) return;

  const { error: insErr } = await supabase.from('supplier_tags').insert(
    tags.map((tag) => ({ supplier_id: supplierId, tag })),
  );
  if (insErr) throw new SupplierRepositoryError(insErr.message);
}

export async function listExtendedSuppliersServer(
  supabase: SupabaseClient,
): Promise<ExtendedSupplierListItem[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*, supplier_tags(*)')
    .order('id');
  if (error) throw new SupplierRepositoryError(error.message);
  return ((data ?? []) as Row[]).map(mapTaggedRow);
}

export async function getExtendedSupplierByIdServer(
  supabase: SupabaseClient,
  id: string,
): Promise<ExtendedSupplierListItem> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*, supplier_tags(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new SupplierRepositoryError(error.message);
  if (!data) {
    throw new SupplierRepositoryError('Không tìm thấy nhà cung cấp.', 'not_found');
  }
  return mapTaggedRow(data as Row);
}

export async function createExtendedSupplierServer(
  supabase: SupabaseClient,
  input: ExtendedSupplierInput,
): Promise<ExtendedSupplierListItem> {
  const existing = await listExtendedSuppliersServer(supabase);
  const id = input.id?.trim() || nextSupplierId('SUP-', existing);
  if (existing.some((s) => s.id === id)) {
    throw new SupplierRepositoryError(`Supplier id ${id} đã tồn tại.`, 'conflict');
  }

  const supplier = inputToExtendedSupplier(input, id);
  const row = supplierToRow(supplier as unknown as Row);
  delete row.tags;

  const { error } = await supabase.from('suppliers').insert(row);
  if (error) throw new SupplierRepositoryError(error.message);

  await syncSupplierTags(supabase, id, supplier.tags ?? []);
  return getExtendedSupplierByIdServer(supabase, id);
}

export async function updateExtendedSupplierServer(
  supabase: SupabaseClient,
  input: ExtendedSupplierInput & { id: string },
): Promise<ExtendedSupplierListItem> {
  await getExtendedSupplierByIdServer(supabase, input.id);
  const supplier = inputToExtendedSupplier(input, input.id);
  const row = supplierToRow(supplier as unknown as Row);
  delete row.tags;

  const { data, error } = await supabase
    .from('suppliers')
    .update(row)
    .eq('id', input.id)
    .select('id')
    .maybeSingle();
  if (error) throw new SupplierRepositoryError(error.message);
  if (!data) {
    throw new SupplierRepositoryError('Không tìm thấy nhà cung cấp.', 'not_found');
  }

  await syncSupplierTags(supabase, input.id, supplier.tags ?? []);
  return getExtendedSupplierByIdServer(supabase, input.id);
}

export async function deleteExtendedSupplierServer(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error: tagDelErr } = await supabase
    .from('supplier_tags')
    .delete()
    .eq('supplier_id', id);
  if (tagDelErr) throw new SupplierRepositoryError(tagDelErr.message);

  const { data, error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw new SupplierRepositoryError(error.message);
  if (!data) {
    throw new SupplierRepositoryError('Không tìm thấy nhà cung cấp.', 'not_found');
  }
}

/** Convenience re-export for typed create payload. */
export type { ExtendedSupplier };

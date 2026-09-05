import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CatalogItem, CrmCatalogDbKind } from '@/lib/settings/catalog-kinds';

type CatalogRow = {
  kind: string;
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export class CatalogRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: 'in_use' | 'last_active' | 'not_found' | 'unknown' = 'unknown',
  ) {
    super(message);
    this.name = 'CatalogRepositoryError';
  }
}

const USAGE_COLUMN: Record<CrmCatalogDbKind, string> = {
  country: 'country',
  nationality: 'nationality',
  customer_source: 'source',
  customer_language: 'language',
  customer_budget: 'budget',
  salesperson: 'salesperson',
};

function toItem(row: CatalogRow): CatalogItem {
  return {
    kind: row.kind as CatalogItem['kind'],
    code: row.code,
    label: row.label,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

export async function listCatalogItemsServer(
  supabase: SupabaseClient,
  kinds: CrmCatalogDbKind[],
  activeOnly = false,
): Promise<CatalogItem[]> {
  if (!kinds.length) return [];
  let query = supabase
    .from('crm_catalog_items')
    .select('kind, code, label, sort_order, is_active')
    .in('kind', kinds)
    .order('sort_order')
    .order('label');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw new CatalogRepositoryError(error.message);
  return (data as CatalogRow[]).map(toItem);
}

export async function replaceCatalogItemsServer(
  supabase: SupabaseClient,
  kind: CrmCatalogDbKind,
  items: Omit<CatalogItem, 'kind'>[],
): Promise<CatalogItem[]> {
  const { error } = await supabase.from('crm_catalog_items').upsert(
    items.map((item) => ({
      kind,
      code: item.code,
      label: item.label,
      sort_order: item.sortOrder,
      is_active: item.isActive,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'kind,code' },
  );
  if (error) throw new CatalogRepositoryError(error.message);
  return listCatalogItemsServer(supabase, [kind]);
}

export async function deleteCatalogItemServer(
  supabase: SupabaseClient,
  kind: CrmCatalogDbKind,
  code: string,
): Promise<CatalogItem[]> {
  const items = await listCatalogItemsServer(supabase, [kind]);
  const target = items.find((item) => item.code === code);
  if (!target) throw new CatalogRepositoryError('Catalog item not found.', 'not_found');

  const activeCount = items.filter((item) => item.isActive).length;
  if (items.length === 1 || (target.isActive && activeCount <= 1)) {
    throw new CatalogRepositoryError('Keep at least one active item in this catalog.', 'last_active');
  }

  const column = USAGE_COLUMN[kind];
  const { count, error: usageError } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq(column, target.label);
  if (usageError) throw new CatalogRepositoryError(usageError.message);
  if ((count ?? 0) > 0) {
    throw new CatalogRepositoryError(
      `Cannot delete “${target.label}” — used by ${count} customer(s). Deactivate instead.`,
      'in_use',
    );
  }

  const { error } = await supabase.from('crm_catalog_items').delete().eq('kind', kind).eq('code', code);
  if (error) throw new CatalogRepositoryError(error.message);
  return listCatalogItemsServer(supabase, [kind]);
}

import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { TravelStyle } from '@/lib/customers/travel-styles';

type TravelStyleRow = {
  code: string;
  label: string;
  sort_order: number;
  is_active: boolean;
};

export class TravelStyleRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code: 'in_use' | 'last_active' | 'not_found' | 'unknown' = 'unknown',
  ) {
    super(message);
    this.name = 'TravelStyleRepositoryError';
  }
}

function toTravelStyle(row: TravelStyleRow): TravelStyle {
  return { code: row.code, label: row.label, sortOrder: row.sort_order, isActive: row.is_active };
}

export async function listTravelStylesServer(supabase: SupabaseClient): Promise<TravelStyle[]> {
  const { data, error } = await supabase
    .from('travel_styles')
    .select('code, label, sort_order, is_active')
    .order('label');
  if (error) throw new TravelStyleRepositoryError(error.message);
  return (data as TravelStyleRow[]).map(toTravelStyle);
}

export async function replaceTravelStylesServer(
  supabase: SupabaseClient,
  styles: TravelStyle[],
): Promise<TravelStyle[]> {
  const { error } = await supabase.from('travel_styles').upsert(
    styles.map((style) => ({
      code: style.code,
      label: style.label,
      sort_order: style.sortOrder,
      is_active: style.isActive,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'code' },
  );
  if (error) throw new TravelStyleRepositoryError(error.message);
  return listTravelStylesServer(supabase);
}

export async function deleteTravelStyleServer(
  supabase: SupabaseClient,
  code: string,
): Promise<TravelStyle[]> {
  const styles = await listTravelStylesServer(supabase);
  const target = styles.find((style) => style.code === code);
  if (!target) throw new TravelStyleRepositoryError('Không tìm thấy Travel Style cần xóa.', 'not_found');
  if (styles.length === 1 || (target.isActive && styles.filter((style) => style.isActive).length === 1)) {
    throw new TravelStyleRepositoryError('Cần giữ lại ít nhất một Travel Style đang hoạt động.', 'last_active');
  }

  const { count, error: usageError } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('travel_style', target.label);
  if (usageError) throw new TravelStyleRepositoryError(usageError.message);
  if ((count ?? 0) > 0) {
    throw new TravelStyleRepositoryError(
      `Không thể xóa “${target.label}” vì đang được ${count} khách hàng sử dụng.`,
      'in_use',
    );
  }

  const { error } = await supabase.from('travel_styles').delete().eq('code', code);
  if (error) throw new TravelStyleRepositoryError(error.message);
  return listTravelStylesServer(supabase);
}

import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { collectActiveHotelTiers } from '@/lib/suppliers/hotel-tiers';

export async function listActiveHotelTiersServer(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase
    .from('hotels')
    .select('stars, status')
    .eq('status', 'Active');
  if (error) throw new Error(error.message);
  return collectActiveHotelTiers((data ?? []) as Array<{ stars?: string | null; status?: string | null }>);
}

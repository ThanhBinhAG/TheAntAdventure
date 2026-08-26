import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { guideToRow, rowToGuide } from '@/lib/db/mappers';
import type { Row } from '@/lib/db/mappers/shared';
import type { Guide } from '@/lib/types';
import { guidePhotoForBrowser } from './guide-avatar';

function toGuide(row: Row): Guide {
  const guide = rowToGuide(row);
  return { ...guide, photo: guidePhotoForBrowser(guide.id, guide.photo) };
}

export async function listGuidesServer(supabase: SupabaseClient): Promise<Guide[]> {
  const { data, error } = await supabase.from('guides').select('*').order('id');
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(toGuide);
}

export async function createGuideServer(supabase: SupabaseClient, guide: Guide): Promise<Guide> {
  const { data, error } = await supabase
    .from('guides')
    .insert(guideToRow(guide))
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return toGuide(data as Row);
}

export async function updateGuideServer(
  supabase: SupabaseClient,
  guide: Guide,
): Promise<Guide | null> {
  const { data, error } = await supabase
    .from('guides')
    .update(guideToRow(guide))
    .eq('id', guide.id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toGuide(data as Row) : null;
}

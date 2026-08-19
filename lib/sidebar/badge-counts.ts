import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { sidebarBadgeTablesForPermissions } from '@/lib/db/sidebar-badge-tables';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/env';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';

export type SidebarBadgeCounts = {
  tourDesignAttention?: number;
  activeTasks?: number;
};

const INACTIVE_STAGES = '("Lost","Completed")';

function createSessionSupabase() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) return null;

  const cookieStore = cookies();
  return createServerClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        /* read-only */
      },
    },
  });
}

async function countPendingTourDesignLeads(
  client: ReturnType<typeof createSessionSupabase> & object
): Promise<number> {
  const { count, error } = await client
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('needs_tour_design', true)
    .eq('tour_design_acked', false)
    .not('stage', 'in', INACTIVE_STAGES);
  if (error) throw error;
  return count ?? 0;
}

async function countOutlineAwaitingApproval(
  client: ReturnType<typeof createSessionSupabase> & object
): Promise<number> {
  const { data: drafts, error: draftErr } = await client
    .from('tour_drafts')
    .select('lead_id')
    .eq('outline_status', 'sent');
  if (draftErr) throw draftErr;

  const leadIds = [
    ...new Set(
      (drafts ?? [])
        .map((row) => row.lead_id as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  if (!leadIds.length) return 0;

  const { count, error } = await client
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .in('id', leadIds)
    .not('stage', 'in', INACTIVE_STAGES);
  if (error) throw error;
  return count ?? 0;
}

async function countActiveTasks(
  client: ReturnType<typeof createSessionSupabase> & object
): Promise<number> {
  const { count, error } = await client
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'done');
  if (error) throw error;
  return count ?? 0;
}

/** Head/count queries for sidebar badges — scoped by permission codes. */
export async function getSidebarBadgeCounts(
  permissionCodes: ReadonlySet<string>
): Promise<SidebarBadgeCounts> {
  const tables = sidebarBadgeTablesForPermissions(permissionCodes);
  if (!tables.length) return {};

  const client = createSessionSupabase();
  if (!client) return {};

  const needsTourDesign = tables.includes('leads') || tables.includes('tour_drafts');
  const needsTasks = tables.includes('tasks');

  const result: SidebarBadgeCounts = {};

  if (needsTourDesign) {
    const [pending, outline] = await Promise.all([
      countPendingTourDesignLeads(client),
      countOutlineAwaitingApproval(client),
    ]);
    result.tourDesignAttention = pending + outline;
  }

  if (needsTasks) {
    result.activeTasks = await countActiveTasks(client);
  }

  return result;
}

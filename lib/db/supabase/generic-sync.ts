import { type SyncArrayTable } from '../sync-config';
import {
  buildOrphanSkipWarning,
  shouldSkipOrphanDelete,
  type SyncTableOptions,
  type SyncTableResult,
} from '../sync-policy';
import { deleteOrphans, supabase, type Row, type TableHandler } from './shared';

export async function syncTaggedTable(
  table: SyncArrayTable,
  handler: TableHandler,
  rows: Row[],
  options: SyncTableOptions = {}
): Promise<SyncTableResult> {
  const client = supabase();
  if (!client) return { skippedOrphanDelete: false };

  const localIds = rows.map((r, i) => String(r.id ?? `${handler.table}-${i}`));
  const baseRows = rows.map((r) => {
    const mapped = handler.toRow(r);
    delete mapped.tags;
    return mapped;
  });

  if (baseRows.length) {
    const { error } = await client.from(handler.table).upsert(baseRows, { onConflict: handler.pk });
    if (error) throw error;
  }

  if (handler.tagTable && handler.tagParentKey) {
    if (localIds.length) {
      const { error: tagDelErr } = await client
        .from(handler.tagTable)
        .delete()
        .in(handler.tagParentKey, localIds);
      if (tagDelErr) throw tagDelErr;
    }

    const tagRows: Row[] = [];
    for (const r of rows) {
      const id = String(r.id);
      for (const tag of (r.tags as string[] | undefined) ?? []) {
        tagRows.push({ [handler.tagParentKey]: id, tag });
      }
    }
    if (tagRows.length) {
      const { error: tagInsErr } = await client.from(handler.tagTable).insert(tagRows);
      if (tagInsErr) throw tagInsErr;
    }
  }

  const skipOrphans = shouldSkipOrphanDelete(table, localIds.length, options.force);
  if (!skipOrphans) {
    await deleteOrphans(handler.table, handler.pk, localIds);
    return { skippedOrphanDelete: false };
  }

  return {
    skippedOrphanDelete: true,
    warning: buildOrphanSkipWarning(table, localIds.length),
  };
}

/**
 * Upsert mapped domain rows only — no orphan delete.
 * Used for instant create/edit so we do not POST the entire table.
 */
export async function upsertSimpleRows(
  handler: TableHandler,
  rows: Row[]
): Promise<SyncTableResult> {
  if (!rows.length) return { skippedOrphanDelete: true };
  const client = supabase();
  if (!client) return { skippedOrphanDelete: true };

  const mapped = rows.map((r) => handler.toRow(r));
  const { error } = await client.from(handler.table).upsert(mapped, { onConflict: handler.pk });
  if (error) throw error;
  return { skippedOrphanDelete: true };
}

export async function syncSimpleTable(
  table: SyncArrayTable,
  handler: TableHandler,
  rows: Row[],
  options: SyncTableOptions = {}
): Promise<SyncTableResult> {
  const client = supabase();
  if (!client) return { skippedOrphanDelete: false };

  const mapped = rows.map((r) => handler.toRow(r));
  const localIds = mapped.map((row, i) => {
    const pkVal = row[handler.pk];
    if (pkVal != null && String(pkVal).length > 0) return String(pkVal);
    return `${handler.table}-${i}`;
  });
  if (mapped.length) {
    const { error } = await client.from(handler.table).upsert(mapped, { onConflict: handler.pk });
    if (error) throw error;
  }

  const skipOrphans = shouldSkipOrphanDelete(table, localIds.length, options.force);
  if (!skipOrphans) {
    await deleteOrphans(handler.table, handler.pk, localIds);
    return { skippedOrphanDelete: false };
  }

  return {
    skippedOrphanDelete: true,
    warning: buildOrphanSkipWarning(table, localIds.length),
  };
}

export async function getTaggedRows(handler: TableHandler): Promise<Row[]> {
  const client = supabase();
  if (!client) return [];
  if (!handler.tagTable) return getSimpleRows(handler);

  // Single PostgREST embed instead of base + tags selects.
  // Dynamic embed string is not parseable by supabase-js typings — cast result.
  const { data, error } = await client
    .from(handler.table)
    .select(`*, ${handler.tagTable}(*)` as '*');
  if (error) throw error;
  if (!data?.length) return [];

  return (data as unknown as Row[]).map((raw) => {
    const row = { ...raw };
    const nested = row[handler.tagTable!] as Row[] | undefined;
    delete row[handler.tagTable!];
    const tags = (nested ?? []).map((t) => String(t.tag));
    return handler.fromRow(row, tags);
  });
}

export async function getSimpleRows(handler: TableHandler): Promise<Row[]> {
  const client = supabase();
  if (!client) return [];
  const { data, error } = await client.from(handler.table).select('*');
  if (error) throw error;
  return (data ?? []).map((r) => handler.fromRow(r as unknown as Row));
}

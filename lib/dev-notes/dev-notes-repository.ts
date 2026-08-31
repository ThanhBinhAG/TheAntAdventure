import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { devNoteToRow, rowToDevNote } from '@/lib/db/mappers';
import type { Row } from '@/lib/db/mappers/shared';
import type { DevNoteInput, DevNoteListItem, DevNoteUpdateInput } from './dev-notes-input';
import { nextDevNoteId } from './dev-notes-ids';

export type { DevNoteListItem } from './dev-notes-input';

export class DevNotesRepositoryError extends Error {
  readonly code: 'not_found' | 'validation' | 'conflict';

  constructor(message: string, code: 'not_found' | 'validation' | 'conflict' = 'validation') {
    super(message);
    this.name = 'DevNotesRepositoryError';
    this.code = code;
  }
}

function toListItem(row: Row): DevNoteListItem {
  const mapped = rowToDevNote(row) as Record<string, unknown>;
  return {
    id: String(mapped.id ?? ''),
    title: String(mapped.title ?? ''),
    body: mapped.body ? String(mapped.body) : undefined,
    assignee: mapped.assignee ? String(mapped.assignee) : undefined,
    priority: String(mapped.priority ?? 'medium'),
    category: mapped.category ? String(mapped.category) : undefined,
    status: String(mapped.status ?? 'open'),
    author: mapped.author ? String(mapped.author) : undefined,
    date: mapped.date ? String(mapped.date).slice(0, 10) : undefined,
  };
}

function inputToDomain(input: DevNoteInput, id: string, authorFallback?: string | null): Record<string, unknown> {
  return {
    id,
    title: input.title.trim(),
    body: input.body.trim(),
    assignee: input.assignee?.trim() || 'Dev Team',
    priority: input.priority,
    category: input.category,
    status: input.status,
    author: input.author?.trim() || authorFallback || 'CRM User',
    date: input.date ?? new Date().toISOString().slice(0, 10),
  };
}

function domainToInsertRow(domain: Record<string, unknown>): Row {
  return devNoteToRow(domain);
}

export async function listDevNotesServer(
  supabase: SupabaseClient,
): Promise<DevNoteListItem[]> {
  const { data, error } = await supabase
    .from('dev_notes')
    .select('*')
    .order('note_date', { ascending: false })
    .order('id');
  if (error) throw new DevNotesRepositoryError(error.message);
  return ((data ?? []) as Row[]).map(toListItem);
}

async function listDevNoteSummariesServer(
  supabase: SupabaseClient,
): Promise<{ id: string }[]> {
  const { data, error } = await supabase.from('dev_notes').select('id');
  if (error) throw new DevNotesRepositoryError(error.message);
  return ((data ?? []) as Row[]).map((r) => ({ id: String(r.id) }));
}

export async function getDevNoteByIdServer(
  supabase: SupabaseClient,
  id: string,
): Promise<DevNoteListItem> {
  const { data, error } = await supabase
    .from('dev_notes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new DevNotesRepositoryError(error.message);
  if (!data) {
    throw new DevNotesRepositoryError('Không tìm thấy ghi chú.', 'not_found');
  }
  return toListItem(data as Row);
}

export async function createDevNoteServer(
  supabase: SupabaseClient,
  input: DevNoteInput,
  authorFallback?: string | null,
): Promise<DevNoteListItem> {
  const existing = await listDevNoteSummariesServer(supabase);
  const id = input.id?.trim() || nextDevNoteId(existing);
  if (existing.some((row) => row.id === id)) {
    throw new DevNotesRepositoryError(`Dev note id ${id} đã tồn tại.`, 'conflict');
  }

  const domain = inputToDomain(input, id, authorFallback);
  const { error } = await supabase.from('dev_notes').insert(domainToInsertRow(domain));
  if (error) throw new DevNotesRepositoryError(error.message);

  return getDevNoteByIdServer(supabase, id);
}

export async function updateDevNoteServer(
  supabase: SupabaseClient,
  id: string,
  patch: DevNoteUpdateInput,
): Promise<DevNoteListItem> {
  const current = await getDevNoteByIdServer(supabase, id);
  const merged = {
    ...current,
    ...patch,
    title: patch.title ?? current.title,
    body: patch.body ?? current.body,
    assignee: patch.assignee ?? current.assignee,
    priority: patch.priority ?? current.priority,
    category: patch.category ?? current.category,
    status: patch.status ?? current.status,
  };

  const row = devNoteToRow({
    id: current.id,
    title: merged.title,
    body: merged.body,
    assignee: merged.assignee,
    priority: merged.priority,
    category: merged.category,
    status: merged.status,
    author: merged.author,
    date: merged.date,
  });

  const { error } = await supabase.from('dev_notes').update(row).eq('id', id);
  if (error) throw new DevNotesRepositoryError(error.message);

  return getDevNoteByIdServer(supabase, id);
}

export async function deleteDevNoteServer(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  await getDevNoteByIdServer(supabase, id);
  const { error } = await supabase.from('dev_notes').delete().eq('id', id);
  if (error) throw new DevNotesRepositoryError(error.message);
}

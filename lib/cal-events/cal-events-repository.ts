import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { calEventToRow, rowToCalEvent } from '@/lib/db/mappers';
import { fkOrNull, type Row } from '@/lib/db/mappers/shared';
import type { CalEventInput, CalEventListItem } from './cal-events-input';
import { nextCalEventId } from './cal-events-ids';

export type { CalEventListItem } from './cal-events-input';

export class CalEventsRepositoryError extends Error {
  readonly code: 'not_found' | 'validation' | 'conflict';

  constructor(message: string, code: 'not_found' | 'validation' | 'conflict' = 'validation') {
    super(message);
    this.name = 'CalEventsRepositoryError';
    this.code = code;
  }
}

function toListItem(row: Row): CalEventListItem {
  const mapped = rowToCalEvent(row) as Record<string, unknown>;
  return {
    id: String(mapped.id ?? ''),
    guideId: String(mapped.guideId ?? ''),
    bookingCode: mapped.bookingCode ? String(mapped.bookingCode) : undefined,
    tour: mapped.tour ? String(mapped.tour) : undefined,
    clients: String(mapped.clients ?? ''),
    start: mapped.start ? String(mapped.start).slice(0, 10) : '',
    end: mapped.end ? String(mapped.end).slice(0, 10) : '',
    status: String(mapped.status ?? 'booked'),
    notes: mapped.notes ? String(mapped.notes) : undefined,
  };
}

function inputToDomain(input: CalEventInput, id: string): Record<string, unknown> {
  return {
    id,
    guideId: input.guideId.trim(),
    bookingCode: input.bookingCode?.trim() || undefined,
    tour: input.tour?.trim() || undefined,
    clients: input.clients.trim(),
    start: input.start,
    end: input.end,
    status: input.status,
    notes: input.notes?.trim() || undefined,
  };
}

function domainToInsertRow(domain: Record<string, unknown>): Row {
  const row = calEventToRow(domain);
  return {
    ...row,
    guide_id: fkOrNull(row.guide_id),
    booking_id: fkOrNull(row.booking_id),
  };
}

async function assertGuideExists(
  supabase: SupabaseClient,
  guideId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('guides')
    .select('id')
    .eq('id', guideId)
    .maybeSingle();
  if (error) throw new CalEventsRepositoryError(error.message);
  if (!data) {
    throw new CalEventsRepositoryError('Không tìm thấy hướng dẫn viên.', 'not_found');
  }
}

async function listCalEventSummariesServer(
  supabase: SupabaseClient,
): Promise<{ id: string }[]> {
  const { data, error } = await supabase.from('cal_events').select('id');
  if (error) throw new CalEventsRepositoryError(error.message);
  return ((data ?? []) as Row[]).map((r) => ({ id: String(r.id) }));
}

export async function listCalEventsServer(
  supabase: SupabaseClient,
): Promise<CalEventListItem[]> {
  const { data, error } = await supabase
    .from('cal_events')
    .select('*')
    .order('start_date')
    .order('id');
  if (error) throw new CalEventsRepositoryError(error.message);
  return ((data ?? []) as Row[]).map(toListItem);
}

export async function getCalEventByIdServer(
  supabase: SupabaseClient,
  id: string,
): Promise<CalEventListItem> {
  const { data, error } = await supabase
    .from('cal_events')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new CalEventsRepositoryError(error.message);
  if (!data) {
    throw new CalEventsRepositoryError('Không tìm thấy sự kiện lịch.', 'not_found');
  }
  return toListItem(data as Row);
}

export async function createCalEventServer(
  supabase: SupabaseClient,
  input: CalEventInput,
): Promise<CalEventListItem> {
  await assertGuideExists(supabase, input.guideId.trim());

  const existing = await listCalEventSummariesServer(supabase);
  const id = input.id?.trim() || nextCalEventId(existing);
  if (existing.some((row) => row.id === id)) {
    throw new CalEventsRepositoryError(`Calendar event id ${id} đã tồn tại.`, 'conflict');
  }

  const domain = inputToDomain(input, id);
  const { error } = await supabase.from('cal_events').insert(domainToInsertRow(domain));
  if (error) throw new CalEventsRepositoryError(error.message);

  return getCalEventByIdServer(supabase, id);
}

export async function deleteCalEventServer(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const current = await getCalEventByIdServer(supabase, id);
  const { error } = await supabase.from('cal_events').delete().eq('id', current.id);
  if (error) throw new CalEventsRepositoryError(error.message);
}

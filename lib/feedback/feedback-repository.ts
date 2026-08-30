import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { feedbackToRow, rowToFeedback } from '@/lib/db/mappers';
import { fkOrNull, type Row } from '@/lib/db/mappers/shared';
import { invalidateDashboardCache } from '@/lib/dashboard/dashboard-repository';
import { nextFeedbackId } from './feedback-ids';
import type { FeedbackInput, FeedbackListItem } from './feedback-input';

export type { FeedbackListItem } from './feedback-input';

export class FeedbackRepositoryError extends Error {
  readonly code: 'not_found' | 'validation' | 'conflict';

  constructor(message: string, code: 'not_found' | 'validation' | 'conflict' = 'validation') {
    super(message);
    this.name = 'FeedbackRepositoryError';
    this.code = code;
  }
}

function toListItem(row: Row): FeedbackListItem {
  const mapped = rowToFeedback(row) as Record<string, unknown>;
  return {
    id: String(mapped.id ?? ''),
    type: String(mapped.type ?? 'client'),
    date: mapped.date ? String(mapped.date).slice(0, 10) : undefined,
    bkid: mapped.bkid ? String(mapped.bkid) : undefined,
    client: mapped.client ? String(mapped.client) : undefined,
    nps: mapped.nps != null ? Number(mapped.nps) : undefined,
    overall: mapped.overall != null ? String(mapped.overall) : undefined,
    guide_r: mapped.guide_r != null ? String(mapped.guide_r) : undefined,
    hotel_r: mapped.hotel_r != null ? String(mapped.hotel_r) : undefined,
    best: mapped.best != null ? String(mapped.best) : undefined,
    improve: mapped.improve != null ? String(mapped.improve) : undefined,
    comments: mapped.comments != null ? String(mapped.comments) : undefined,
    again: mapped.again != null ? String(mapped.again) : undefined,
  };
}

function inputToDomain(input: FeedbackInput, id: string): Record<string, unknown> {
  return {
    id,
    type: input.type,
    date: input.date ?? new Date().toISOString().slice(0, 10),
    bkid: input.bkid?.trim() || undefined,
    client: input.client?.trim() || undefined,
    nps: input.nps,
    overall: input.overall,
    guide_r: input.guide_r,
    hotel_r: input.hotel_r,
    best: input.best?.trim() || undefined,
    improve: input.improve?.trim() || undefined,
    comments: input.comments?.trim() || undefined,
    again: input.again?.trim() || undefined,
  };
}

function domainToInsertRow(domain: Record<string, unknown>): Row {
  const row = feedbackToRow(domain);
  return {
    ...row,
    booking_id: fkOrNull(row.booking_id),
  };
}

async function assertBookingExists(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', bookingId)
    .maybeSingle();
  if (error) throw new FeedbackRepositoryError(error.message);
  if (!data) {
    throw new FeedbackRepositoryError('Không tìm thấy booking.', 'not_found');
  }
}

export async function listFeedbackServer(
  supabase: SupabaseClient,
): Promise<FeedbackListItem[]> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('feedback_date', { ascending: false })
    .order('id');
  if (error) throw new FeedbackRepositoryError(error.message);
  return ((data ?? []) as Row[]).map(toListItem);
}

export async function listFeedbackSummariesServer(
  supabase: SupabaseClient,
): Promise<{ id: string }[]> {
  const { data, error } = await supabase.from('feedback').select('id');
  if (error) throw new FeedbackRepositoryError(error.message);
  return ((data ?? []) as Row[]).map((r) => ({ id: String(r.id) }));
}

export async function getFeedbackByIdServer(
  supabase: SupabaseClient,
  id: string,
): Promise<FeedbackListItem> {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new FeedbackRepositoryError(error.message);
  if (!data) {
    throw new FeedbackRepositoryError('Không tìm thấy feedback.', 'not_found');
  }
  return toListItem(data as Row);
}

export async function createFeedbackServer(
  supabase: SupabaseClient,
  input: FeedbackInput,
): Promise<FeedbackListItem> {
  const bookingId = input.bkid?.trim();
  if (bookingId) {
    await assertBookingExists(supabase, bookingId);
  }

  const existing = await listFeedbackSummariesServer(supabase);
  const id = input.id?.trim() || nextFeedbackId(existing);
  if (existing.some((row) => row.id === id)) {
    throw new FeedbackRepositoryError(`Feedback id ${id} đã tồn tại.`, 'conflict');
  }

  const domain = inputToDomain(input, id);
  const { error } = await supabase.from('feedback').insert(domainToInsertRow(domain));
  if (error) throw new FeedbackRepositoryError(error.message);

  await invalidateDashboardCache();
  return getFeedbackByIdServer(supabase, id);
}

import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { contractToRow, rowToContract } from '@/lib/db/mappers';
import { fkOrNull, type Row } from '@/lib/db/mappers/shared';
import { nextContractId } from './contract-ids';
import type { ContractInput, ContractListItem } from './contract-input';

export type { ContractListItem } from './contract-input';

export class ContractRepositoryError extends Error {
  readonly code: 'not_found' | 'validation' | 'conflict';

  constructor(message: string, code: 'not_found' | 'validation' | 'conflict' = 'validation') {
    super(message);
    this.name = 'ContractRepositoryError';
    this.code = code;
  }
}

function toListItem(row: Row): ContractListItem {
  const mapped = rowToContract(row) as Record<string, unknown>;
  const depositPct = Number(mapped.depositPct ?? 30);
  const total = Number(mapped.total ?? 0);
  const depositAmt =
    mapped.depositAmt != null ? Number(mapped.depositAmt) : total * (depositPct / 100);

  return {
    id: String(mapped.id ?? ''),
    bookingId: mapped.bookingId ? String(mapped.bookingId) : undefined,
    clientName: String(mapped.clientName ?? ''),
    nationality: mapped.nationality ? String(mapped.nationality) : undefined,
    pax: Number(mapped.pax ?? 1),
    rooms: mapped.rooms ? String(mapped.rooms) : undefined,
    tourName: String(mapped.tourName ?? ''),
    duration: mapped.duration ? String(mapped.duration) : undefined,
    departureDate: mapped.departureDate ? String(mapped.departureDate).slice(0, 10) : undefined,
    returnDate: mapped.returnDate ? String(mapped.returnDate).slice(0, 10) : undefined,
    route: mapped.route ? String(mapped.route) : undefined,
    inclusions: mapped.inclusions != null ? String(mapped.inclusions) : undefined,
    exclusions: mapped.exclusions != null ? String(mapped.exclusions) : undefined,
    flights: mapped.flights != null ? String(mapped.flights) : undefined,
    currency: String(mapped.currency ?? 'USD'),
    total,
    depositPct,
    depositAmt,
    balanceDueDate: mapped.balanceDueDate
      ? String(mapped.balanceDueDate).slice(0, 10)
      : undefined,
    status: String(mapped.status ?? 'Draft'),
    createdAt: mapped.createdAt ? String(mapped.createdAt).slice(0, 10) : undefined,
    signedAt:
      mapped.signedAt == null || mapped.signedAt === ''
        ? null
        : String(mapped.signedAt).slice(0, 10),
    notes: mapped.notes != null ? String(mapped.notes) : undefined,
  };
}

function inputToDomain(input: ContractInput, id: string): Record<string, unknown> {
  const total = input.total;
  const depositPct = input.depositPct;
  const depositAmt =
    input.depositAmt != null ? input.depositAmt : total * (depositPct / 100);

  return {
    id,
    bookingId: input.bookingId?.trim() || undefined,
    clientName: input.clientName,
    nationality: input.nationality || undefined,
    pax: input.pax,
    rooms: input.rooms || undefined,
    tourName: input.tourName,
    duration: input.duration || undefined,
    departureDate: input.departureDate,
    returnDate: input.returnDate,
    route: input.route || undefined,
    inclusions: input.inclusions || undefined,
    exclusions: input.exclusions || undefined,
    flights: input.flights || undefined,
    currency: input.currency,
    total,
    depositPct,
    depositAmt,
    balanceDueDate: input.balanceDueDate,
    status: input.status,
    createdAt: input.createdAt,
    signedAt: input.signedAt ?? null,
    notes: input.notes || undefined,
  };
}

function domainToInsertRow(domain: Record<string, unknown>): Row {
  const row = contractToRow(domain);
  return {
    ...row,
    booking_id: fkOrNull(row.booking_id),
  };
}

export async function listContractsServer(
  supabase: SupabaseClient,
): Promise<ContractListItem[]> {
  const { data, error } = await supabase.from('contracts').select('*').order('id');
  if (error) throw new ContractRepositoryError(error.message);
  return ((data ?? []) as Row[]).map(toListItem);
}

export async function listContractSummariesServer(
  supabase: SupabaseClient,
): Promise<{ id: string }[]> {
  const { data, error } = await supabase.from('contracts').select('id');
  if (error) throw new ContractRepositoryError(error.message);
  return ((data ?? []) as Row[]).map((r) => ({ id: String(r.id) }));
}

export async function getContractByIdServer(
  supabase: SupabaseClient,
  id: string,
): Promise<ContractListItem> {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new ContractRepositoryError(error.message);
  if (!data) {
    throw new ContractRepositoryError('Không tìm thấy hợp đồng.', 'not_found');
  }
  return toListItem(data as Row);
}

export async function createContractServer(
  supabase: SupabaseClient,
  input: ContractInput,
): Promise<ContractListItem> {
  const existing = await listContractSummariesServer(supabase);
  const id = input.id?.trim() || nextContractId(existing);
  if (existing.some((c) => c.id === id)) {
    throw new ContractRepositoryError(`Contract id ${id} đã tồn tại.`, 'conflict');
  }

  const domain = inputToDomain(input, id);
  if (!domain.createdAt) {
    domain.createdAt = new Date().toISOString().slice(0, 10);
  }

  const { error } = await supabase.from('contracts').insert(domainToInsertRow(domain));
  if (error) throw new ContractRepositoryError(error.message);

  return getContractByIdServer(supabase, id);
}

export async function updateContractServer(
  supabase: SupabaseClient,
  input: ContractInput & { id: string },
): Promise<ContractListItem> {
  const existing = await getContractByIdServer(supabase, input.id);
  const domain = inputToDomain(
    {
      ...input,
      createdAt: input.createdAt ?? existing.createdAt,
      bookingId: input.bookingId ?? existing.bookingId,
    },
    input.id,
  );

  const { data, error } = await supabase
    .from('contracts')
    .update(domainToInsertRow(domain))
    .eq('id', input.id)
    .select('id')
    .maybeSingle();
  if (error) throw new ContractRepositoryError(error.message);
  if (!data) {
    throw new ContractRepositoryError('Không tìm thấy hợp đồng.', 'not_found');
  }

  return getContractByIdServer(supabase, input.id);
}

export async function deleteContractServer(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { data, error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) throw new ContractRepositoryError(error.message);
  if (!data) {
    throw new ContractRepositoryError('Không tìm thấy hợp đồng.', 'not_found');
  }
}

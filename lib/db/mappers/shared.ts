import { normalizeMoneyUSD } from '../../core/money';

export type Row = Record<string, unknown>;

export const money = (v: unknown) => normalizeMoneyUSD(Number(v ?? 0));
export const moneyAbs = (v: unknown) => normalizeMoneyUSD(Number(v ?? 0), { absolute: true });

/** Empty string → null for optional FK columns (Postgres rejects '' as FK). */
export function fkOrNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

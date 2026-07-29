export type MoneyParseOptions = {
  allowNegative?: boolean;
  absolute?: boolean;
};

export function normalizeMoneyUSD(n: number, opts?: MoneyParseOptions): number {
  if (!Number.isFinite(n)) return 0;
  let v = n;
  if (opts?.absolute) v = Math.abs(v);
  else if (!opts?.allowNegative && v < 0) v = 0;
  return Math.round(v * 100) / 100;
}

/** Parse flexible money input → canonical USD number (max 2 decimals). */
export function parseMoneyInput(
  raw: string | number | null | undefined,
  opts?: MoneyParseOptions
): number {
  if (raw == null) return 0;
  if (typeof raw === 'number') return normalizeMoneyUSD(raw, opts);

  let s = String(raw).trim();
  if (!s) return 0;

  const negative = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, '').replace(/^\+/, '');
  s = s.replace(/[$₫\s]/g, '');
  s = s.replace(/\b(usd|vnd|đ|dong)\b/gi, '');

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  if (hasComma && hasDot) {
    s = s.replace(/,/g, '');
  } else if (hasComma && !hasDot) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      s = `${parts[0]}.${parts[1]}`;
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (!hasComma && hasDot) {
    const parts = s.split('.');
    if (parts.length > 1 && parts.every((p) => /^\d+$/.test(p)) && parts[parts.length - 1].length === 3) {
      s = parts.join('');
    }
  }

  let n = parseFloat(s);
  if (negative) n = -n;
  if (!Number.isFinite(n)) return 0;
  return normalizeMoneyUSD(n, opts);
}

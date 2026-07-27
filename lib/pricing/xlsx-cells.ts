import * as XLSX from 'xlsx';

export type Grid = unknown[][];

/** Excel error literals surfaced by SheetJS when a formula could not resolve. */
const ERROR_CELL = /^#(REF|ERROR|VALUE|DIV\/0|N\/A|NAME\?|NULL|NUM)!?$/i;

export function readGrid(sheet: XLSX.WorkSheet): Grid {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
    blankrows: true,
  }) as Grid;
}

export function cell(grid: Grid, row: number, col: number): unknown {
  return grid[row]?.[col] ?? null;
}

export function text(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') return String(value);
  return String(value).replace(/\s+/g, ' ').trim();
}

/** Multi-line safe variant: collapses runs of spaces but keeps line breaks. */
export function richText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') return String(value);
  return String(value)
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

export function str(grid: Grid, row: number, col: number): string {
  return text(cell(grid, row, col));
}

export function rich(grid: Grid, row: number, col: number): string {
  return richText(cell(grid, row, col));
}

export function isErrorCell(value: unknown): boolean {
  return typeof value === 'string' && ERROR_CELL.test(value.trim());
}

/** Parses a numeric cell, tolerating "1.200.000", "1,200,000", "7%" and blanks. */
export function num(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) return null;
  const raw = String(value).trim();
  if (!raw || isErrorCell(raw)) return null;

  const percent = raw.endsWith('%');
  let cleaned = raw.replace(/[%\s₫$]/g, '');

  // "1.200.000" (VN thousands) vs "1.2" (decimal)
  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) cleaned = cleaned.replace(/\./g, '');
  cleaned = cleaned.replace(/,(?=\d{3}\b)/g, '');
  cleaned = cleaned.replace(/,/g, '.');

  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return percent ? parsed / 100 : parsed;
}

export function numAt(grid: Grid, row: number, col: number): number | null {
  return num(cell(grid, row, col));
}

/** True when the row has no meaningful content in any column. */
export function isBlankRow(grid: Grid, row: number): boolean {
  const cells = grid[row];
  if (!cells) return true;
  return cells.every((c) => c == null || String(c).trim() === '');
}

/** Index of the last column holding content, or -1 for an empty row. */
export function lastFilledCol(grid: Grid, row: number): number {
  const cells = grid[row] ?? [];
  for (let i = cells.length - 1; i >= 0; i--) {
    const value = cells[i];
    if (value != null && String(value).trim() !== '') return i;
  }
  return -1;
}

/** Number of columns holding content within [from, to). */
export function filledCount(grid: Grid, row: number, from = 0, to = 64): number {
  const cells = grid[row] ?? [];
  let count = 0;
  for (let i = from; i < Math.min(to, cells.length); i++) {
    const value = cells[i];
    if (value != null && String(value).trim() !== '') count++;
  }
  return count;
}

/**
 * Formats a period cell. The workbooks mix real dates with free text like
 * "Jan 12, 2026 - May 02, 2026", so dates are normalised and text kept as-is.
 */
export function periodText(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number' && value > 20000 && value < 80000) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
    }
  }
  return richText(value);
}

/** Finds the first row where the predicate matches, scanning from `start`. */
export function findRow(grid: Grid, predicate: (row: string[], index: number) => boolean, start = 0): number {
  for (let i = start; i < grid.length; i++) {
    const row = (grid[i] ?? []).map((c) => text(c));
    if (predicate(row, i)) return i;
  }
  return -1;
}

export function rowText(grid: Grid, row: number): string {
  return (grid[row] ?? []).map((c) => text(c)).join(' | ').toLowerCase();
}

/** Stable slug used to build deterministic row ids for imported records. */
export function slug(value: string, max = 40): string {
  const base = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base.slice(0, max) || 'row';
}

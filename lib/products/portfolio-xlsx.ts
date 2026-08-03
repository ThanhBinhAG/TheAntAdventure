import * as XLSX from 'xlsx';
import {
  classifyPortfolioRow,
  destFromSectionTitle,
  type PortfolioDraftProduct,
} from '@/lib/products/portfolio-classify';

export interface PortfolioParseResult {
  products: PortfolioDraftProduct[];
  warnings: string[];
  sheetName: string;
}

function cellStr(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return String(v);
}

function looksLikeProductCode(raw: string): boolean {
  const t = raw.trim();
  return /^(AA|SV)-/i.test(t);
}

function isHeaderRow(cols: string[]): boolean {
  const joined = cols.map((c) => c.toLowerCase()).join('|');
  return joined.includes('tour product') || (joined.includes('code') && joined.includes('duration'));
}

function isSectionRow(codeCell: string, rest: string[]): boolean {
  if (!codeCell.trim()) return false;
  if (looksLikeProductCode(codeCell)) return false;
  const othersEmpty = rest.every((c) => !c.trim());
  return othersEmpty || rest.filter((c) => c.trim()).length === 0;
}

/**
 * Parse a Tour Product Portfolio workbook (.xlsx).
 * Expects columns: Code | Tour Products | Duration | Description | Notes to Sales
 * Section header rows (destination titles) set dest for following products.
 */
export function parsePortfolioXlsx(buffer: ArrayBuffer): PortfolioParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { products: [], warnings: ['Workbook has no sheets'], sheetName: '' };
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  const products: PortfolioDraftProduct[] = [];
  const warnings: string[] = [];
  let sectionDest: string | null = null;
  let skippedEmpty = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const cols = [0, 1, 2, 3, 4].map((idx) => cellStr(row[idx]));
    const [codeRaw, nameRaw, durRaw, descRaw, notesRaw] = cols;
    const rowNum = i + 1;

    if (!cols.some((c) => c.trim())) {
      skippedEmpty++;
      continue;
    }

    // Title banner rows (portfolio name spanning columns)
    if (
      !looksLikeProductCode(codeRaw) &&
      /tour product database|the ant adventures/i.test(cols.join(' '))
    ) {
      continue;
    }

    if (isHeaderRow(cols)) continue;

    if (isSectionRow(codeRaw, cols.slice(1))) {
      const mapped = destFromSectionTitle(codeRaw);
      if (mapped) {
        sectionDest = mapped;
      } else {
        const titleCase = codeRaw
          .trim()
          .toLowerCase()
          .replace(/\b\w/g, (ch) => ch.toUpperCase());
        sectionDest = titleCase;
        warnings.push(`Row ${rowNum}: unknown section "${codeRaw.trim()}" — using "${titleCase}"`);
      }
      continue;
    }

    if (!looksLikeProductCode(codeRaw)) {
      if (nameRaw.trim() || descRaw.trim()) {
        warnings.push(`Row ${rowNum}: skipped — no product code (${codeRaw.slice(0, 40) || 'empty'})`);
      }
      continue;
    }

    if (!nameRaw.trim()) {
      warnings.push(`Row ${rowNum}: ${codeRaw.trim()} has empty name`);
    }

    const draft = classifyPortfolioRow({
      code: codeRaw,
      name: nameRaw,
      durationRaw: durRaw,
      description: descRaw,
      notesToSales: notesRaw,
      sectionDest,
    });
    products.push(draft);
  }

  if (!products.length) {
    warnings.push('No product rows found. Check sheet columns: Code, Tour Products, Duration, Description, Notes to Sales.');
  }

  if (skippedEmpty > 0 && products.length === 0) {
    warnings.push(`Skipped ${skippedEmpty} empty rows`);
  }

  return { products, warnings, sheetName };
}

export async function parsePortfolioFile(file: File): Promise<PortfolioParseResult> {
  const buffer = await file.arrayBuffer();
  return parsePortfolioXlsx(buffer);
}

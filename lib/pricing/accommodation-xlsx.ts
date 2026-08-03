import * as XLSX from 'xlsx';
import {
  accommodationRowCount,
  emptyAccommodationCatalog,
  type AccCruiseRate,
  type AccProperty,
  type AccRoomRate,
  type AccommodationCatalog,
  type CatalogParseResult,
  type PricingSetting,
  type SheetSummary,
} from './catalog-types';
import {
  cell,
  filledCount,
  isBlankRow,
  isErrorCell,
  num,
  numAt,
  periodText,
  readGrid,
  rich,
  slug,
  str,
  text,
  type Grid,
} from './xlsx-cells';

const URL_RE = /(https?:\/\/\S+)/i;
const ADDRESS_RE = /\bAdd(?:ress)?\s*:\s*([\s\S]+)/i;
const AUDIT_RE = /^done on\b/i;
const YEAR_RE = /^(20\d{2})$/;

function normalizeSheetName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** "Capella Hanoi https://… Add: 11 Le Phung Hieu…" → name / website / address. */
export function splitPropertyCell(raw: string): { name: string; website: string; address: string } {
  if (!raw) return { name: '', website: '', address: '' };

  const website = raw.match(URL_RE)?.[1]?.replace(/[.,;]+$/, '') ?? '';
  const address = raw.match(ADDRESS_RE)?.[1]?.split('\n')[0]?.trim() ?? '';

  let name = raw;
  if (website) name = name.split(website)[0] ?? '';
  name = name.replace(ADDRESS_RE, '');
  name = name.split('\n')[0] ?? '';

  return { name: name.trim().replace(/[-–,]$/, '').trim(), website, address };
}

// -------------------------------------------------------- All Properties

function parseProperties(grid: Grid, warnings: string[]): AccProperty[] {
  const properties: AccProperty[] = [];

  for (let r = 1; r < grid.length; r++) {
    if (isBlankRow(grid, r)) continue;
    const rawName = rich(grid, r, 2);
    if (!rawName) continue;

    const { name, website, address } = splitPropertyCell(rawName);
    if (!name) {
      warnings.push(`All Properties row ${r + 1}: could not read a property name.`);
      continue;
    }

    properties.push({
      id: `acc-prop-${slug(`${name}-${str(grid, r, 1)}`)}-${properties.length}`,
      region: str(grid, r, 0),
      location: str(grid, r, 1),
      name,
      website,
      address,
      ownership: rich(grid, r, 3),
      stars: str(grid, r, 4),
      type: str(grid, r, 5),
      reservationsContact: rich(grid, r, 6),
      salesContact: rich(grid, r, 7),
      factsheetLink: rich(grid, r, 8),
      contractRenewal: rich(grid, r, 9),
      bankAccount: rich(grid, r, 10),
      approved: str(grid, r, 11),
      sortOrder: properties.length,
    });
  }
  return properties;
}

// ------------------------------------------------------------- rate sheets

function pushSetting(
  settings: PricingSetting[],
  sheet: string,
  key: string,
  label: string,
  value: number | null,
  valueText: string
) {
  settings.push({
    id: `acc-set-${slug(`${sheet}-${key}`)}`,
    workbook: 'accommodation',
    sheet,
    key,
    label,
    valueNum: value,
    valueText,
    sortOrder: settings.length,
  });
}

function parseRateSheet(
  sheetName: string,
  grid: Grid,
  settings: PricingSetting[],
  warnings: string[]
): AccRoomRate[] {
  const rates: AccRoomRate[] = [];

  let headerRow = -1;
  for (let r = 0; r < Math.min(grid.length, 12); r++) {
    if (/^location$/i.test(str(grid, r, 0)) && /property name/i.test(str(grid, r, 1))) {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) {
    warnings.push(`Sheet "${sheetName}": no rate header row found — skipped.`);
    return rates;
  }

  if (/exchange rate/i.test(str(grid, 0, 0))) {
    pushSetting(settings, sheetName, 'EXCHANGE_RATE', `Exchange rate — ${sheetName}`, numAt(grid, 0, 1), str(grid, 0, 1));
    pushSetting(settings, sheetName, 'MARKUP', `Markup — ${sheetName}`, numAt(grid, 0, 3), str(grid, 0, 3));
  }

  // The Central sheet's headers H–K are offset from the values the formulas write,
  // so costs/sell/margin are read positionally instead of by header label.
  if (/exchange rate/i.test(str(grid, headerRow, 7))) {
    warnings.push(
      `Sheet "${sheetName}": header labels H–K do not match the underlying formulas — columns imported positionally (VND cost, USD cost, sell, margin).`
    );
  }

  let location = '';
  let property = '';
  let yearLabel = '';
  let brokenCells = 0;

  for (let r = headerRow + 1; r < grid.length; r++) {
    if (isBlankRow(grid, r)) continue;

    const colA = str(grid, r, 0);
    const colB = rich(grid, r, 1);
    const roomType = rich(grid, r, 2);

    if (!roomType) {
      if (colB && !AUDIT_RE.test(colB)) {
        property = colB;
        if (colA && !AUDIT_RE.test(colA)) location = colA;
        yearLabel = '';
        if (/saigon|ho chi minh/i.test(property) && /hanoi/i.test(location)) {
          warnings.push(`"${property}" is listed under location "${location}" — please verify.`);
        }
        continue;
      }
      const stray = [7, 8, 9].map((c) => numAt(grid, r, c));
      if (stray.some((v) => v != null)) {
        if (!settings.some((s) => s.sheet === sheetName && s.key === 'EXCHANGE_RATE')) {
          pushSetting(settings, sheetName, 'EXCHANGE_RATE', `Exchange rate — ${sheetName}`, stray[0], text(stray[0]));
          pushSetting(settings, sheetName, 'MARKUP', `Markup — ${sheetName}`, stray[1], text(stray[1]));
          if (stray[1] != null && stray[1] > 1) {
            warnings.push(
              `Sheet "${sheetName}": markup entered as ${stray[1]} — treated as ${stray[1]}% (Excel expected a 0–1 fraction).`
            );
          }
        }
      }
      continue;
    }

    if (YEAR_RE.test(roomType)) {
      yearLabel = roomType;
      continue;
    }
    if (colA && !AUDIT_RE.test(colA)) location = colA;
    if (colB && !AUDIT_RE.test(colB)) property = colB;
    if (!property) {
      warnings.push(`Sheet "${sheetName}" row ${r + 1}: room "${roomType}" has no parent property — skipped.`);
      continue;
    }

    const numericCells = [6, 7, 8, 9].map((c) => cell(grid, r, c));
    numericCells.forEach((v) => {
      if (isErrorCell(v)) brokenCells++;
    });
    const flags = numericCells
      .map((v) => text(v))
      .filter((v) => v && num(v) == null && !isErrorCell(v));

    const notes = [rich(grid, r, 10), flags.length ? flags.join(' / ') : '']
      .filter(Boolean)
      .join(' · ');

    rates.push({
      id: `acc-rate-${slug(sheetName)}-${rates.length}`,
      sheet: sheetName,
      location,
      propertyName: property,
      roomType,
      season: rich(grid, r, 3),
      periodFrom: periodText(cell(grid, r, 4)),
      periodTo: periodText(cell(grid, r, 5)),
      yearLabel,
      vndCost: num(numericCells[0]),
      usdCost: num(numericCells[1]),
      sellPrice: num(numericCells[2]),
      margin: num(numericCells[3]),
      notes,
      sortOrder: rates.length,
    });
  }

  if (brokenCells) {
    warnings.push(`Sheet "${sheetName}": ${brokenCells} cells hold formula errors (#REF!) and were imported as blank.`);
  }
  const priced = rates.filter((rate) => rate.vndCost != null || rate.sellPrice != null).length;
  if (rates.length && priced === 0) {
    warnings.push(`Sheet "${sheetName}": ${rates.length} room rows but no prices yet — imported as an empty template.`);
  }

  return rates;
}

// ---------------------------------------------------------------- cruises

function parseCruiseSheet(sheetName: string, grid: Grid): AccCruiseRate[] {
  const rates: AccCruiseRate[] = [];

  for (let r = 1; r < grid.length; r++) {
    if (isBlankRow(grid, r)) continue;
    const propertyName = rich(grid, r, 2);
    if (!propertyName) continue;

    rates.push({
      id: `acc-cruise-${slug(sheetName)}-${rates.length}`,
      sheet: sheetName,
      region: str(grid, r, 0),
      location: str(grid, r, 1),
      propertyName,
      stars: str(grid, r, 3),
      type: str(grid, r, 4) || 'Cruise',
      roomType: rich(grid, r, 5),
      phone: str(grid, r, 6),
      email: str(grid, r, 7),
      cost2026: numAt(grid, r, 8),
      cost2027: numAt(grid, r, 9),
      sell2026: numAt(grid, r, 10),
      sell2027: numAt(grid, r, 11),
      markupPct: numAt(grid, r, 12),
      margin: numAt(grid, r, 13),
      sortOrder: rates.length,
    });
  }
  return rates;
}

// -------------------------------------------------------------------- main

export function parseAccommodationWorkbook(buffer: ArrayBuffer): CatalogParseResult<AccommodationCatalog> {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const catalog = emptyAccommodationCatalog();
  const warnings: string[] = [];
  const sheets: SheetSummary[] = [];

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const grid = readGrid(sheet);
    const key = normalizeSheetName(name);

    if (key.includes('all properties')) {
      catalog.properties = parseProperties(grid, warnings);
      sheets.push({ name, parsed: catalog.properties.length, kind: 'property master' });
      continue;
    }
    if (key.includes('cruise') && key.includes('summary')) {
      sheets.push({ name, parsed: 0, kind: 'derived — recalculated in the app' });
      continue;
    }
    if (key.includes('cruise')) {
      const parsed = parseCruiseSheet(name, grid);
      catalog.cruiseRates.push(...parsed);
      sheets.push({ name, parsed: parsed.length, kind: 'cruise cabin rates' });
      if (!parsed.length) warnings.push(`Sheet "${name}" has headers but no cruise rows.`);
      continue;
    }
    if (key.includes('hotel')) {
      const parsed = parseRateSheet(name, grid, catalog.settings, warnings);
      catalog.roomRates.push(...parsed);
      sheets.push({ name, parsed: parsed.length, kind: 'seasonal room rates' });
      continue;
    }

    if (filledCount(grid, 0) > 0) {
      warnings.push(`Sheet "${name}" was not recognised and has been skipped.`);
      sheets.push({ name, parsed: 0, kind: 'skipped' });
    }
  }

  // Location typos are common in these sheets; surface obvious mismatches.
  const misplaced = new Map<string, string>();
  for (const p of catalog.properties) {
    if (/saigon|ho chi minh/i.test(p.name) && /hanoi/i.test(p.location)) misplaced.set(p.name, p.location);
  }
  for (const r of catalog.roomRates) {
    if (/saigon|ho chi minh/i.test(r.propertyName) && /hanoi/i.test(r.location)) {
      misplaced.set(r.propertyName, r.location);
    }
  }
  for (const [name, location] of misplaced) {
    warnings.push(`"${name}" is listed under location "${location}" — please verify.`);
  }

  const rateProperties = new Set(catalog.roomRates.map((r) => r.propertyName.toLowerCase()));
  const masterNames = new Set(catalog.properties.map((p) => p.name.toLowerCase()));
  const unlinked = [...rateProperties].filter((n) => !masterNames.has(n));
  if (unlinked.length) {
    warnings.push(`${unlinked.length} rated propert(ies) are not in the All Properties master list.`);
  }

  return { data: catalog, warnings, sheets, rowCount: accommodationRowCount(catalog) };
}

export async function parseAccommodationFile(file: File): Promise<CatalogParseResult<AccommodationCatalog>> {
  return parseAccommodationWorkbook(await file.arrayBuffer());
}

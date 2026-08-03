import * as XLSX from 'xlsx';
import {
  ESS_PAX_COLUMNS,
  emptyEssentialsCatalog,
  essentialsRowCount,
  type CatalogParseResult,
  type EssCarRate,
  type EssCostKind,
  type EssCostLine,
  type EssHotelRate,
  type EssNote,
  type EssProduct,
  type EssServiceRate,
  type EssentialsCatalog,
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
  readGrid,
  rich,
  slug,
  str,
  text,
  type Grid,
} from './xlsx-cells';

const PRODUCT_CODE = /^(\d{2}-)?ESM\s?\d{1,2}$/i;
const SECTION_TITLE = /(experiences?|journeys?)\s*$/i;

function normalizeSheetName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findSheet(workbook: XLSX.WorkBook, matcher: (name: string) => boolean): string | null {
  return workbook.SheetNames.find((name) => matcher(normalizeSheetName(name))) ?? null;
}

function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

function costKind(groupLabel: string, label: string): EssCostKind {
  if (/^hotel selling/i.test(groupLabel)) return 'hotel';
  if (/selling.*per group/i.test(label)) return 'selling_group';
  if (/selling.*per pax/i.test(label)) return 'selling_pax';
  if (/^surcharge/i.test(label)) return 'surcharge';
  return 'component';
}

// ------------------------------------------------------- cost builder sheet

function parseCostBuilder(
  sheetName: string,
  grid: Grid,
  settings: PricingSetting[],
  costLines: EssCostLine[],
  warnings: string[]
): number {
  const SETTING_LABELS: Record<string, string> = {
    'SGL ROOM OCCUPANCY': 'Single room occupancy',
    'TOUR MUP': 'Tour markup',
    'HOTEL MUP': 'Hotel markup',
    VAT: 'VAT',
    'TOUR CODE': 'Exchange rate (VND per USD)',
  };

  for (let r = 0; r < 6; r++) {
    const key = str(grid, r, 0).toUpperCase();
    if (!SETTING_LABELS[key]) continue;
    settings.push({
      id: `ess-set-${slug(key)}`,
      workbook: 'essentials',
      sheet: sheetName,
      key,
      label: SETTING_LABELS[key],
      valueNum: numAt(grid, r, 1),
      valueText: str(grid, r, 1),
      sortOrder: settings.length,
    });
  }
  if (str(grid, 4, 0).toUpperCase() === 'TOUR CODE') {
    warnings.push('Cost builder: cell labelled "TOUR CODE" holds the VND/USD exchange rate — imported as Exchange rate.');
  }

  let currentCode = '';
  let brokenCells = 0;
  let lineIndex = 0;

  for (let r = 0; r < grid.length; r++) {
    if (isBlankRow(grid, r)) continue;
    const colA = str(grid, r, 0);
    const colB = rich(grid, r, 1);

    if (PRODUCT_CODE.test(colA)) {
      currentCode = normalizeCode(colA);
      continue;
    }
    if (!currentCode || !colB) continue;

    const pax: (number | null)[] = [];
    for (let i = 0; i < ESS_PAX_COLUMNS; i++) {
      const raw = cell(grid, r, 2 + i);
      if (isErrorCell(raw)) brokenCells++;
      pax.push(num(raw));
    }
    if (pax.every((v) => v == null) && !colA) continue;

    costLines.push({
      id: `ess-cl-${slug(currentCode)}-${lineIndex}`,
      productCode: currentCode,
      groupLabel: colA,
      label: colB,
      kind: costKind(colA, colB),
      pax,
      sortOrder: lineIndex,
    });
    lineIndex++;
  }

  if (brokenCells) {
    warnings.push(
      `Cost builder: ${brokenCells} cells contain Excel formula errors (#ERROR!/#REF!) and were imported as blank.`
    );
  }
  return costLines.length;
}

// ------------------------------------------------------------ product sheet

function parseProducts(grid: Grid, warnings: string[]): EssProduct[] {
  const products: EssProduct[] = [];
  let category = '';

  let headerRow = 0;
  for (let r = 0; r < Math.min(grid.length, 10); r++) {
    if (/^code$/i.test(str(grid, r, 1)) && /duration/i.test(str(grid, r, 3))) {
      headerRow = r;
      break;
    }
  }

  for (let r = headerRow + 1; r < grid.length; r++) {
    if (isBlankRow(grid, r)) continue;
    const code = str(grid, r, 1);
    const name = rich(grid, r, 2);

    if (!code && name) {
      category = name;
      continue;
    }
    if (!code) continue;
    if (!PRODUCT_CODE.test(code)) {
      warnings.push(`List of Products row ${r + 1}: unexpected code "${code}" — imported as-is.`);
    }

    products.push({
      code: normalizeCode(code),
      seq: numAt(grid, r, 0) ?? products.length + 1,
      category,
      name,
      durationDays: numAt(grid, r, 3),
      overnight: rich(grid, r, 4),
      journeys: rich(grid, r, 5),
      incl7: rich(grid, r, 6),
      incl16: rich(grid, r, 7),
      incl29: rich(grid, r, 8),
      incl35: rich(grid, r, 9),
      guideMain: null,
      guideAssistant: null,
      guideOvernight: null,
      truckPrice: null,
      sortOrder: products.length,
    });
  }
  return products;
}

function applyGuideFees(grid: Grid, products: EssProduct[], warnings: string[]): number {
  const byCode = new Map(products.map((p) => [p.code, p]));
  let matched = 0;

  for (let r = 0; r < grid.length; r++) {
    const code = str(grid, r, 1);
    if (!PRODUCT_CODE.test(code)) continue;
    const product = byCode.get(normalizeCode(code));
    if (!product) {
      warnings.push(`Guide fee row ${r + 1}: code "${code}" has no matching product.`);
      continue;
    }
    product.guideMain = numAt(grid, r, 3);
    product.guideAssistant = numAt(grid, r, 4);
    product.guideOvernight = numAt(grid, r, 5);
    matched++;
  }
  return matched;
}

function applyTruckRates(grid: Grid, products: EssProduct[], notes: EssNote[], sheetName: string): number {
  const byCode = new Map(products.map((p) => [p.code, p]));
  let matched = 0;

  for (let r = 0; r < grid.length; r++) {
    if (isBlankRow(grid, r)) continue;
    const code = str(grid, r, 1);
    if (PRODUCT_CODE.test(code)) {
      const product = byCode.get(normalizeCode(code));
      if (product) {
        product.truckPrice = numAt(grid, r, 3);
        matched++;
      }
      continue;
    }
    const note = rich(grid, r, 2);
    const extra = rich(grid, r, 3);
    if (note && !SECTION_TITLE.test(note) && !/^code$/i.test(note) && !/^no\b/i.test(str(grid, r, 0))) {
      notes.push({
        id: `ess-note-${slug(sheetName)}-${notes.length}`,
        sheet: sheetName,
        section: 'Truck provider notes',
        label: note,
        detail: extra,
        sortOrder: notes.length,
      });
    }
  }
  return matched;
}

// ---------------------------------------------------------------- car rates

function parseCarRates(grid: Grid, sheetName: string, notes: EssNote[]): EssCarRate[] {
  const rates: EssCarRate[] = [];
  let category = 'HALF-DAY & CITY EXPERIENCES';
  let headerRow = -1;

  for (let r = 0; r < grid.length; r++) {
    if (/tour title/i.test(str(grid, r, 1))) {
      headerRow = r;
      break;
    }
  }
  if (headerRow < 0) return rates;

  for (let r = headerRow + 1; r < grid.length; r++) {
    if (isBlankRow(grid, r)) continue;
    const tourTitle = rich(grid, r, 1);
    const route = rich(grid, r, 2);
    const prices = [5, 6, 7, 8, 9].map((c) => numAt(grid, r, c));
    const hasPrice = prices.some((p) => p != null);

    if (!tourTitle && route && SECTION_TITLE.test(route)) {
      category = route;
      continue;
    }
    if (!hasPrice) {
      const label = rich(grid, r, 0) || route;
      if (label) {
        notes.push({
          id: `ess-note-${slug(sheetName)}-${notes.length}`,
          sheet: sheetName,
          section: 'Car provider notes',
          label,
          detail: rich(grid, r, 3),
          sortOrder: notes.length,
        });
      }
      continue;
    }

    rates.push({
      id: `ess-car-${rates.length}`,
      category,
      tourTitle,
      route,
      km: numAt(grid, r, 3),
      duration: str(grid, r, 4),
      s7: prices[0],
      s16: prices[1],
      s29: prices[2],
      s35: prices[3],
      s45: prices[4],
      sortOrder: rates.length,
    });
  }
  return rates;
}

// ----------------------------------------------------------- service rates

function parseServices(grid: Grid, sheetName: string, notes: EssNote[]): EssServiceRate[] {
  const rates: EssServiceRate[] = [];
  const push = (block: string, label: string, unit: string, amount: number | null, amount2: number | null, extra: string) => {
    rates.push({
      id: `ess-svc-${rates.length}`,
      block,
      label,
      unit,
      amount,
      amount2,
      notes: extra,
      sortOrder: rates.length,
    });
  };

  // The sheet holds two independent column blocks: A/B on the left, D/E/F on the right.
  const scanBlock = (labelCol: number, valueCol: number, value2Col: number, noteCol: number) => {
    let block = '';
    let unit = '';
    for (let r = 0; r < grid.length; r++) {
      const label = rich(grid, r, labelCol);
      const rawValue = cell(grid, r, valueCol);
      const value = num(rawValue);
      const valueText = text(rawValue);

      if (value == null) {
        if (label && valueText) {
          block = label;
          unit = valueText;
        }
        continue;
      }
      push(block, label || block, unit, value, num(cell(grid, r, value2Col)), rich(grid, r, noteCol));
    }
  };

  scanBlock(0, 1, -1, -1);
  scanBlock(3, 4, 5, 6);

  // Activity blocks: a title row, a pax-tier header row, then one row of prices.
  for (let r = 0; r < grid.length; r++) {
    const tiers = [0, 1, 2].map((c) => rich(grid, r, c));
    if (!tiers.every((t) => /pax/i.test(t))) continue;

    const title = (() => {
      for (let up = r - 1; up >= 0 && up > r - 4; up--) {
        const candidate = rich(grid, up, 0);
        if (candidate && !/pax/i.test(candidate)) return candidate;
      }
      return sheetName;
    })();
    const tierNote = rich(grid, r, 3);

    const priceRow = r + 1;
    const prices = [0, 1, 2].map((c) => numAt(grid, priceRow, c));
    if (prices.every((p) => p == null)) continue;

    tiers.forEach((tier, i) => {
      if (prices[i] == null) return;
      push(title, tier, 'VND / pax', prices[i], null, tierNote);
    });
    if (tierNote) {
      notes.push({
        id: `ess-note-${slug(sheetName)}-${notes.length}`,
        sheet: sheetName,
        section: title,
        label: 'Policy',
        detail: tierNote,
        sortOrder: notes.length,
      });
    }
  }

  return rates;
}

// -------------------------------------------------------- guideline sheet

const GUIDELINE_SECTIONS = [
  'MARK UP',
  'CHILDREN POLICY',
  'PAYMENT TERMS',
  'CANCELLATION POLICY',
  'NON-REFUNDABLE ITEMS',
];

function parseGuidelines(grid: Grid, sheetName: string, notes: EssNote[], warnings: string[]): void {
  let section = 'General';

  for (let r = 0; r < grid.length; r++) {
    if (isBlankRow(grid, r)) continue;
    const raw = cell(grid, r, 0);
    let label = rich(grid, r, 0);
    const filled = filledCount(grid, r);

    const asSection = GUIDELINE_SECTIONS.find((s) => label.toUpperCase().startsWith(s));
    if (asSection && filled === 1) {
      section = label;
      continue;
    }

    // "5-10" in the children policy was coerced to an Excel date by the author.
    if (section.toUpperCase().startsWith('CHILDREN') && raw instanceof Date) {
      label = '5-10';
      warnings.push('Guideline: children age tier stored as a date in Excel — imported as "5-10".');
    }

    const detail = [1, 2, 3, 4]
      .map((c) => rich(grid, r, c))
      .filter(Boolean)
      .join(' · ');

    notes.push({
      id: `ess-note-${slug(sheetName)}-${notes.length}`,
      sheet: sheetName,
      section,
      label,
      detail,
      sortOrder: notes.length,
    });
  }
}

// ------------------------------------------------------------ hotel sheets

interface HotelLayout {
  dataStart: number;
  variantA: string;
  variantB: string;
  cols: { vndA: number; vndB: number; usdA: number; usdB: number; sellA: number; sellB: number; notes: number };
}

function detectHotelLayout(grid: Grid, headerRow: number): HotelLayout {
  const header = (c: number) => str(grid, headerRow, c);
  const sub = (c: number) => str(grid, headerRow + 1, c);

  // Two-tier header: merged "VND Cost" spanning two columns, variants on the next row.
  if (!header(2) && sub(1) && sub(2)) {
    return {
      dataStart: headerRow + 2,
      variantA: sub(1),
      variantB: sub(2),
      cols: { vndA: 1, vndB: 2, usdA: 3, usdB: 4, sellA: 5, sellB: 6, notes: 7 },
    };
  }

  // Single-row header with a variant per column, e.g. "VND Cost (1- 5 rooms)".
  const variantOf = (label: string) => label.match(/\(([^)]+)\)\s*$/)?.[1]?.trim() ?? '';
  if (/vnd cost/i.test(header(1)) && /vnd cost/i.test(header(2))) {
    return {
      dataStart: headerRow + 1,
      variantA: variantOf(header(1)) || header(1),
      variantB: variantOf(header(2)) || header(2),
      cols: { vndA: 1, vndB: 2, usdA: 3, usdB: 4, sellA: 5, sellB: 6, notes: 7 },
    };
  }

  return {
    dataStart: headerRow + 1,
    variantA: '',
    variantB: '',
    cols: { vndA: 1, vndB: -1, usdA: 2, usdB: -1, sellA: 3, sellB: -1, notes: 4 },
  };
}

function parseHotelSheet(
  sheetName: string,
  grid: Grid,
  settings: PricingSetting[],
  rates: EssHotelRate[],
  notes: EssNote[]
): 'rates' | 'notes' {
  const headerRows: number[] = [];
  for (let r = 0; r < grid.length; r++) {
    if (/^room type/i.test(str(grid, r, 0))) headerRows.push(r);
  }

  const exchange = numAt(grid, 0, 0);
  if (exchange && exchange >= 1000 && filledCount(grid, 0) === 1) {
    settings.push({
      id: `ess-set-fx-${slug(sheetName)}`,
      workbook: 'essentials',
      sheet: sheetName,
      key: 'EXCHANGE_RATE',
      label: `Exchange rate — ${sheetName.trim()}`,
      valueNum: exchange,
      valueText: String(exchange),
      sortOrder: settings.length,
    });
  }

  if (!headerRows.length) {
    for (let r = 0; r < grid.length; r++) {
      if (isBlankRow(grid, r)) continue;
      const label = rich(grid, r, 0);
      if (!label) continue;
      notes.push({
        id: `ess-note-${slug(sheetName)}-${notes.length}`,
        sheet: sheetName,
        section: 'Sheet notes',
        label,
        detail: [1, 2, 3].map((c) => rich(grid, r, c)).filter(Boolean).join(' · '),
        sortOrder: notes.length,
      });
    }
    return 'notes';
  }

  const isHeader = (r: number) => headerRows.includes(r);
  const nextContentRow = (from: number) => {
    for (let r = from; r < grid.length; r++) {
      if (!isBlankRow(grid, r)) return r;
    }
    return -1;
  };

  let property = '';
  let section = '';
  let layout: HotelLayout | null = null;

  for (let r = 0; r < grid.length; r++) {
    if (isBlankRow(grid, r)) continue;

    if (isHeader(r)) {
      layout = detectHotelLayout(grid, r);
      const headerNote = rich(grid, r, layout.cols.notes);
      if (headerNote) {
        notes.push({
          id: `ess-note-${slug(sheetName)}-${notes.length}`,
          sheet: sheetName,
          section: property || 'Sheet notes',
          label: 'Policies',
          detail: headerNote,
          sortOrder: notes.length,
        });
      }
      r = layout.dataStart - 1;
      continue;
    }

    const label = rich(grid, r, 0);
    if (!label) {
      const trailing = rich(grid, r, 12) || rich(grid, r, 7);
      if (trailing) {
        notes.push({
          id: `ess-note-${slug(sheetName)}-${notes.length}`,
          sheet: sheetName,
          section: property || 'Sheet notes',
          label: 'Note',
          detail: trailing,
          sortOrder: notes.length,
        });
      }
      continue;
    }

    const singleCell = filledCount(grid, r, 0, 8) === 1;
    if (singleCell) {
      const upcoming = nextContentRow(r + 1);
      if (upcoming >= 0 && isHeader(upcoming)) {
        property = label;
        section = '';
      } else if (layout) {
        section = label;
      } else {
        property = label;
        notes.push({
          id: `ess-note-${slug(sheetName)}-${notes.length}`,
          sheet: sheetName,
          section: 'Properties without rates',
          label,
          detail: '',
          sortOrder: notes.length,
        });
      }
      continue;
    }

    if (!layout) continue;
    const { cols } = layout;
    const pick = (c: number) => (c >= 0 ? numAt(grid, r, c) : null);

    rates.push({
      id: `ess-hr-${slug(sheetName)}-${rates.length}`,
      sheet: sheetName.trim(),
      property,
      section,
      roomType: label,
      variantA: layout.variantA,
      variantB: layout.variantB,
      vndA: pick(cols.vndA),
      vndB: pick(cols.vndB),
      usdA: pick(cols.usdA),
      usdB: pick(cols.usdB),
      sellA: pick(cols.sellA),
      sellB: pick(cols.sellB),
      notes: cols.notes >= 0 ? rich(grid, r, cols.notes) : '',
      sortOrder: rates.length,
    });
  }

  return 'rates';
}

// -------------------------------------------------------------------- main

export function parseEssentialsWorkbook(buffer: ArrayBuffer): CatalogParseResult<EssentialsCatalog> {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const catalog = emptyEssentialsCatalog();
  const warnings: string[] = [];
  const sheets: SheetSummary[] = [];

  const gridOf = (name: string | null): Grid | null => {
    if (!name) return null;
    const sheet = workbook.Sheets[name];
    return sheet ? readGrid(sheet) : null;
  };

  const costSheet = findSheet(workbook, (n) => n.includes('essential') && n.includes('2026'));
  const productSheet = findSheet(workbook, (n) => n.includes('list of products'));
  const guidelineSheet = findSheet(workbook, (n) => n.includes('guideline'));
  const serviceSheet = findSheet(workbook, (n) => n === 'services');
  const guideFeeSheet = findSheet(workbook, (n) => n.includes('guide') && n.includes('fee'));
  const carSheet = findSheet(workbook, (n) => n.includes('car provider'));
  const truckSheet = findSheet(workbook, (n) => n.includes('truck provider'));

  const productGrid = gridOf(productSheet);
  if (productGrid && productSheet) {
    catalog.products = parseProducts(productGrid, warnings);
    sheets.push({ name: productSheet, parsed: catalog.products.length, kind: 'products' });
  } else {
    warnings.push('Sheet "List of Products" not found — product catalogue is empty.');
  }

  const costGrid = gridOf(costSheet);
  if (costGrid && costSheet) {
    const lines = parseCostBuilder(costSheet, costGrid, catalog.settings, catalog.costLines, warnings);
    sheets.push({ name: costSheet, parsed: lines, kind: 'cost builder' });
  } else {
    warnings.push('Cost builder sheet not found — pax pricing is empty.');
  }

  const guideGrid = gridOf(guideFeeSheet);
  if (guideGrid && guideFeeSheet) {
    const matched = applyGuideFees(guideGrid, catalog.products, warnings);
    sheets.push({ name: guideFeeSheet, parsed: matched, kind: 'guide fees' });
  }

  const truckGrid = gridOf(truckSheet);
  if (truckGrid && truckSheet) {
    const matched = applyTruckRates(truckGrid, catalog.products, catalog.notes, truckSheet);
    sheets.push({ name: truckSheet, parsed: matched, kind: 'truck rates' });
  }

  const carGrid = gridOf(carSheet);
  if (carGrid && carSheet) {
    catalog.cars = parseCarRates(carGrid, carSheet, catalog.notes);
    sheets.push({ name: carSheet, parsed: catalog.cars.length, kind: 'car rates' });
  }

  const serviceGrid = gridOf(serviceSheet);
  if (serviceGrid && serviceSheet) {
    catalog.services = parseServices(serviceGrid, serviceSheet, catalog.notes);
    sheets.push({ name: serviceSheet, parsed: catalog.services.length, kind: 'service rates' });
  }

  const guidelineGrid = gridOf(guidelineSheet);
  if (guidelineGrid && guidelineSheet) {
    const before = catalog.notes.length;
    parseGuidelines(guidelineGrid, guidelineSheet, catalog.notes, warnings);
    sheets.push({ name: guidelineSheet, parsed: catalog.notes.length - before, kind: 'guidelines' });
  }

  const handled = new Set(
    [costSheet, productSheet, guidelineSheet, serviceSheet, guideFeeSheet, carSheet, truckSheet].filter(
      Boolean
    ) as string[]
  );

  for (const name of workbook.SheetNames) {
    if (handled.has(name)) continue;
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const grid = readGrid(sheet);

    const ratesBefore = catalog.hotels.length;
    const notesBefore = catalog.notes.length;
    const kind = parseHotelSheet(name, grid, catalog.settings, catalog.hotels, catalog.notes);
    const parsed =
      kind === 'rates' ? catalog.hotels.length - ratesBefore : catalog.notes.length - notesBefore;

    sheets.push({ name, parsed, kind: kind === 'rates' ? 'hotel rates' : 'free-text notes' });
    if (parsed === 0) {
      warnings.push(`Sheet "${name.trim()}" is empty — nothing to import.`);
    }
  }

  const missingPricing = catalog.products.filter(
    (p) => !catalog.costLines.some((l) => l.productCode === p.code)
  );
  if (missingPricing.length) {
    warnings.push(
      `${missingPricing.length} product(s) have no cost-builder block: ${missingPricing
        .map((p) => p.code)
        .join(', ')}`
    );
  }

  return { data: catalog, warnings, sheets, rowCount: essentialsRowCount(catalog) };
}

export async function parseEssentialsFile(file: File): Promise<CatalogParseResult<EssentialsCatalog>> {
  return parseEssentialsWorkbook(await file.arrayBuffer());
}

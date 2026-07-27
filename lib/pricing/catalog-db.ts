import { getSupabaseClient } from '../supabase';
import {
  ESS_PAX_COLUMNS,
  emptyAccommodationCatalog,
  emptyEssentialsCatalog,
  type AccCruiseRate,
  type AccProperty,
  type AccRoomRate,
  type AccommodationCatalog,
  type CatalogImportRecord,
  type CatalogWorkbook,
  type EssCarRate,
  type EssCostLine,
  type EssHotelRate,
  type EssNote,
  type EssProduct,
  type EssServiceRate,
  type EssentialsCatalog,
  type PricingSetting,
} from './catalog-types';

type Row = Record<string, unknown>;

/** Supabase rejects very large payloads; imported sheets are pushed in slices. */
const INSERT_CHUNK = 400;

const client = () => getSupabaseClient();

export function isCatalogConfigured(): boolean {
  return client() !== null;
}

function requireClient() {
  const supabase = client();
  if (!supabase) throw new Error('Supabase is not configured — set the environment keys first.');
  return supabase;
}

// -------------------------------------------------------------- field maps

/** app field → database column. Used for both reads and writes. */
type FieldMap<T> = Record<keyof T & string, string>;

const SETTING_MAP: FieldMap<PricingSetting> = {
  id: 'id',
  workbook: 'workbook',
  sheet: 'sheet',
  key: 'key',
  label: 'label',
  valueNum: 'value_num',
  valueText: 'value_text',
  sortOrder: 'sort_order',
};

const PRODUCT_MAP: FieldMap<EssProduct> = {
  code: 'code',
  seq: 'seq',
  category: 'category',
  name: 'name',
  durationDays: 'duration_days',
  overnight: 'overnight',
  journeys: 'journeys',
  incl7: 'incl_7s',
  incl16: 'incl_16s',
  incl29: 'incl_29s',
  incl35: 'incl_35s',
  guideMain: 'guide_main',
  guideAssistant: 'guide_assistant',
  guideOvernight: 'guide_overnight',
  truckPrice: 'truck_price',
  sortOrder: 'sort_order',
};

const SERVICE_MAP: FieldMap<EssServiceRate> = {
  id: 'id',
  block: 'block',
  label: 'label',
  unit: 'unit',
  amount: 'amount',
  amount2: 'amount2',
  notes: 'notes',
  sortOrder: 'sort_order',
};

const CAR_MAP: FieldMap<EssCarRate> = {
  id: 'id',
  category: 'category',
  tourTitle: 'tour_title',
  route: 'route',
  km: 'km',
  duration: 'duration',
  s7: 's7',
  s16: 's16',
  s29: 's29',
  s35: 's35',
  s45: 's45',
  sortOrder: 'sort_order',
};

const HOTEL_MAP: FieldMap<EssHotelRate> = {
  id: 'id',
  sheet: 'sheet',
  property: 'property',
  section: 'section',
  roomType: 'room_type',
  variantA: 'variant_a',
  variantB: 'variant_b',
  vndA: 'vnd_a',
  vndB: 'vnd_b',
  usdA: 'usd_a',
  usdB: 'usd_b',
  sellA: 'sell_a',
  sellB: 'sell_b',
  notes: 'notes',
  sortOrder: 'sort_order',
};

const NOTE_MAP: FieldMap<EssNote> = {
  id: 'id',
  sheet: 'sheet',
  section: 'section',
  label: 'label',
  detail: 'detail',
  sortOrder: 'sort_order',
};

const ACC_PROPERTY_MAP: FieldMap<AccProperty> = {
  id: 'id',
  region: 'region',
  location: 'location',
  name: 'name',
  website: 'website',
  address: 'address',
  ownership: 'ownership',
  stars: 'stars',
  type: 'type',
  reservationsContact: 'reservations_contact',
  salesContact: 'sales_contact',
  factsheetLink: 'factsheet_link',
  contractRenewal: 'contract_renewal',
  bankAccount: 'bank_account',
  approved: 'approved',
  sortOrder: 'sort_order',
};

const ACC_RATE_MAP: FieldMap<AccRoomRate> = {
  id: 'id',
  sheet: 'sheet',
  location: 'location',
  propertyName: 'property_name',
  roomType: 'room_type',
  season: 'season',
  periodFrom: 'period_from',
  periodTo: 'period_to',
  yearLabel: 'year_label',
  vndCost: 'vnd_cost',
  usdCost: 'usd_cost',
  sellPrice: 'sell_price',
  margin: 'margin',
  notes: 'notes',
  sortOrder: 'sort_order',
};

const ACC_CRUISE_MAP: FieldMap<AccCruiseRate> = {
  id: 'id',
  sheet: 'sheet',
  region: 'region',
  location: 'location',
  propertyName: 'property_name',
  stars: 'stars',
  type: 'type',
  roomType: 'room_type',
  phone: 'phone',
  email: 'email',
  cost2026: 'cost_2026',
  cost2027: 'cost_2027',
  sell2026: 'sell_2026',
  sell2027: 'sell_2027',
  markupPct: 'markup_pct',
  margin: 'margin',
  sortOrder: 'sort_order',
};

export const CATALOG_TABLES = {
  settings: 'pricing_settings',
  products: 'pricing_ess_products',
  costLines: 'pricing_ess_cost_lines',
  services: 'pricing_ess_services',
  cars: 'pricing_ess_car_rates',
  hotels: 'pricing_ess_hotel_rates',
  notes: 'pricing_ess_notes',
  properties: 'pricing_acc_properties',
  roomRates: 'pricing_acc_room_rates',
  cruiseRates: 'pricing_acc_cruise_rates',
  imports: 'pricing_catalog_imports',
} as const;

export type CatalogTableKey = keyof typeof CATALOG_TABLES;

const MAPS: Partial<Record<CatalogTableKey, FieldMap<Record<string, unknown>>>> = {
  settings: SETTING_MAP as never,
  products: PRODUCT_MAP as never,
  services: SERVICE_MAP as never,
  cars: CAR_MAP as never,
  hotels: HOTEL_MAP as never,
  notes: NOTE_MAP as never,
  properties: ACC_PROPERTY_MAP as never,
  roomRates: ACC_RATE_MAP as never,
  cruiseRates: ACC_CRUISE_MAP as never,
};

function toRow<T extends object>(entity: T, map: FieldMap<T>): Row {
  const row: Row = {};
  for (const [field, column] of Object.entries(map) as [keyof T & string, string][]) {
    row[column] = entity[field] ?? null;
  }
  return row;
}

function fromRow<T extends object>(row: Row, map: FieldMap<T>, fallback: T): T {
  const entity = { ...fallback };
  for (const [field, column] of Object.entries(map) as [keyof T & string, string][]) {
    const value = row[column];
    if (value === undefined) continue;
    const current = fallback[field];
    if (typeof current === 'string') {
      (entity[field] as unknown) = value == null ? '' : String(value);
    } else if (typeof current === 'number') {
      (entity[field] as unknown) = value == null ? 0 : Number(value);
    } else {
      (entity[field] as unknown) = value == null ? null : Number(value);
    }
  }
  return entity;
}

function costLineToRow(line: EssCostLine): Row {
  const row: Row = {
    id: line.id,
    product_code: line.productCode,
    group_label: line.groupLabel,
    label: line.label,
    kind: line.kind,
    sort_order: line.sortOrder,
  };
  for (let i = 0; i < ESS_PAX_COLUMNS; i++) {
    row[`p${i + 1}`] = line.pax[i] ?? null;
  }
  return row;
}

function rowToCostLine(row: Row): EssCostLine {
  const pax: (number | null)[] = [];
  for (let i = 0; i < ESS_PAX_COLUMNS; i++) {
    const value = row[`p${i + 1}`];
    pax.push(value == null ? null : Number(value));
  }
  return {
    id: String(row.id),
    productCode: String(row.product_code ?? ''),
    groupLabel: String(row.group_label ?? ''),
    label: String(row.label ?? ''),
    kind: (row.kind as EssCostLine['kind']) ?? 'component',
    pax,
    sortOrder: Number(row.sort_order ?? 0),
  };
}

const EMPTY_SETTING: PricingSetting = {
  id: '', workbook: 'essentials', sheet: '', key: '', label: '', valueNum: null, valueText: '', sortOrder: 0,
};
const EMPTY_PRODUCT: EssProduct = {
  code: '', seq: 0, category: '', name: '', durationDays: null, overnight: '', journeys: '',
  incl7: '', incl16: '', incl29: '', incl35: '', guideMain: null, guideAssistant: null,
  guideOvernight: null, truckPrice: null, sortOrder: 0,
};
const EMPTY_SERVICE: EssServiceRate = {
  id: '', block: '', label: '', unit: '', amount: null, amount2: null, notes: '', sortOrder: 0,
};
const EMPTY_CAR: EssCarRate = {
  id: '', category: '', tourTitle: '', route: '', km: null, duration: '',
  s7: null, s16: null, s29: null, s35: null, s45: null, sortOrder: 0,
};
const EMPTY_HOTEL: EssHotelRate = {
  id: '', sheet: '', property: '', section: '', roomType: '', variantA: '', variantB: '',
  vndA: null, vndB: null, usdA: null, usdB: null, sellA: null, sellB: null, notes: '', sortOrder: 0,
};
const EMPTY_NOTE: EssNote = { id: '', sheet: '', section: '', label: '', detail: '', sortOrder: 0 };
const EMPTY_ACC_PROPERTY: AccProperty = {
  id: '', region: '', location: '', name: '', website: '', address: '', ownership: '', stars: '',
  type: '', reservationsContact: '', salesContact: '', factsheetLink: '', contractRenewal: '',
  bankAccount: '', approved: '', sortOrder: 0,
};
const EMPTY_ACC_RATE: AccRoomRate = {
  id: '', sheet: '', location: '', propertyName: '', roomType: '', season: '', periodFrom: '',
  periodTo: '', yearLabel: '', vndCost: null, usdCost: null, sellPrice: null, margin: null,
  notes: '', sortOrder: 0,
};
const EMPTY_ACC_CRUISE: AccCruiseRate = {
  id: '', sheet: '', region: '', location: '', propertyName: '', stars: '', type: '', roomType: '',
  phone: '', email: '', cost2026: null, cost2027: null, sell2026: null, sell2027: null,
  markupPct: null, margin: null, sortOrder: 0,
};

// ------------------------------------------------------------------- reads

/** Supabase caps a single select at 1000 rows; rate sheets exceed that. */
async function selectAll(table: string, order: string, filter?: { column: string; value: string }): Promise<Row[]> {
  const supabase = requireClient();
  const rows: Row[] = [];
  const pageSize = 1000;

  for (let page = 0; ; page++) {
    let query = supabase
      .from(table)
      .select('*')
      .order(order, { ascending: true })
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (filter) query = query.eq(filter.column, filter.value);

    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

export async function loadEssentialsCatalog(): Promise<EssentialsCatalog> {
  if (!isCatalogConfigured()) return emptyEssentialsCatalog();

  const [settings, products, costLines, services, cars, hotels, notes] = await Promise.all([
    selectAll(CATALOG_TABLES.settings, 'sort_order', { column: 'workbook', value: 'essentials' }),
    selectAll(CATALOG_TABLES.products, 'sort_order'),
    selectAll(CATALOG_TABLES.costLines, 'sort_order'),
    selectAll(CATALOG_TABLES.services, 'sort_order'),
    selectAll(CATALOG_TABLES.cars, 'sort_order'),
    selectAll(CATALOG_TABLES.hotels, 'sort_order'),
    selectAll(CATALOG_TABLES.notes, 'sort_order'),
  ]);

  return {
    settings: settings.map((r) => fromRow(r, SETTING_MAP, EMPTY_SETTING)),
    products: products.map((r) => fromRow(r, PRODUCT_MAP, EMPTY_PRODUCT)),
    costLines: costLines.map(rowToCostLine),
    services: services.map((r) => fromRow(r, SERVICE_MAP, EMPTY_SERVICE)),
    cars: cars.map((r) => fromRow(r, CAR_MAP, EMPTY_CAR)),
    hotels: hotels.map((r) => fromRow(r, HOTEL_MAP, EMPTY_HOTEL)),
    notes: notes.map((r) => fromRow(r, NOTE_MAP, EMPTY_NOTE)),
  };
}

export async function loadAccommodationCatalog(): Promise<AccommodationCatalog> {
  if (!isCatalogConfigured()) return emptyAccommodationCatalog();

  const [settings, properties, roomRates, cruiseRates] = await Promise.all([
    selectAll(CATALOG_TABLES.settings, 'sort_order', { column: 'workbook', value: 'accommodation' }),
    selectAll(CATALOG_TABLES.properties, 'sort_order'),
    selectAll(CATALOG_TABLES.roomRates, 'sort_order'),
    selectAll(CATALOG_TABLES.cruiseRates, 'sort_order'),
  ]);

  return {
    settings: settings.map((r) => fromRow(r, SETTING_MAP, EMPTY_SETTING)),
    properties: properties.map((r) => fromRow(r, ACC_PROPERTY_MAP, EMPTY_ACC_PROPERTY)),
    roomRates: roomRates.map((r) => fromRow(r, ACC_RATE_MAP, EMPTY_ACC_RATE)),
    cruiseRates: cruiseRates.map((r) => fromRow(r, ACC_CRUISE_MAP, EMPTY_ACC_CRUISE)),
  };
}

export async function loadLatestImport(workbook: CatalogWorkbook): Promise<CatalogImportRecord | null> {
  if (!isCatalogConfigured()) return null;
  const supabase = requireClient();
  const { data, error } = await supabase
    .from(CATALOG_TABLES.imports)
    .select('*')
    .eq('workbook', workbook)
    .order('imported_at', { ascending: false })
    .limit(1);

  if (error) throw new Error(error.message);
  const row = (data ?? [])[0] as Row | undefined;
  if (!row) return null;

  return {
    id: String(row.id),
    workbook,
    fileName: String(row.file_name ?? ''),
    sheetCount: Number(row.sheet_count ?? 0),
    rowCount: Number(row.row_count ?? 0),
    warningCount: Number(row.warning_count ?? 0),
    importedAt: String(row.imported_at ?? ''),
  };
}

// ------------------------------------------------------------------ writes

/**
 * Deletes every row. Supabase requires a filter on delete, so an always-true
 * comparison against the primary key stands in for "all rows".
 */
async function clearTable(
  table: string,
  options: { filter?: { column: string; value: string }; pk?: string } = {}
) {
  const supabase = requireClient();
  const { filter, pk = 'id' } = options;
  let query = supabase.from(table).delete();
  query = filter ? query.eq(filter.column, filter.value) : query.neq(pk, '__never__');
  const { error } = await query;
  if (error) throw new Error(`Clearing ${table} failed: ${error.message}`);
}

async function insertRows(table: string, rows: Row[]) {
  if (!rows.length) return;
  const supabase = requireClient();
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const { error } = await supabase.from(table).insert(rows.slice(i, i + INSERT_CHUNK));
    if (error) throw new Error(`Writing ${table} failed: ${error.message}`);
  }
}

async function recordImport(
  workbook: CatalogWorkbook,
  fileName: string,
  sheetCount: number,
  rowCount: number,
  warningCount: number
) {
  const supabase = requireClient();
  const { error } = await supabase.from(CATALOG_TABLES.imports).insert({
    id: `imp-${workbook}-${Date.now()}`,
    workbook,
    file_name: fileName,
    sheet_count: sheetCount,
    row_count: rowCount,
    warning_count: warningCount,
    imported_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Recording the import failed: ${error.message}`);
}

export interface ReplaceMeta {
  fileName: string;
  sheetCount: number;
  warningCount: number;
}

/** Replaces the whole Essentials catalog: clear every table, then reload from the workbook. */
export async function replaceEssentialsCatalog(catalog: EssentialsCatalog, meta: ReplaceMeta): Promise<number> {
  await clearTable(CATALOG_TABLES.costLines);
  await clearTable(CATALOG_TABLES.products, { pk: 'code' });
  await Promise.all([
    clearTable(CATALOG_TABLES.services),
    clearTable(CATALOG_TABLES.cars),
    clearTable(CATALOG_TABLES.hotels),
    clearTable(CATALOG_TABLES.notes),
    clearTable(CATALOG_TABLES.settings, { filter: { column: 'workbook', value: 'essentials' } }),
  ]);

  await insertRows(CATALOG_TABLES.products, catalog.products.map((p) => toRow(p, PRODUCT_MAP)));
  await Promise.all([
    insertRows(CATALOG_TABLES.costLines, catalog.costLines.map(costLineToRow)),
    insertRows(CATALOG_TABLES.services, catalog.services.map((s) => toRow(s, SERVICE_MAP))),
    insertRows(CATALOG_TABLES.cars, catalog.cars.map((c) => toRow(c, CAR_MAP))),
    insertRows(CATALOG_TABLES.hotels, catalog.hotels.map((h) => toRow(h, HOTEL_MAP))),
    insertRows(CATALOG_TABLES.notes, catalog.notes.map((n) => toRow(n, NOTE_MAP))),
    insertRows(CATALOG_TABLES.settings, catalog.settings.map((s) => toRow(s, SETTING_MAP))),
  ]);

  const rowCount =
    catalog.products.length +
    catalog.costLines.length +
    catalog.services.length +
    catalog.cars.length +
    catalog.hotels.length +
    catalog.notes.length +
    catalog.settings.length;

  await recordImport('essentials', meta.fileName, meta.sheetCount, rowCount, meta.warningCount);
  return rowCount;
}

export async function replaceAccommodationCatalog(
  catalog: AccommodationCatalog,
  meta: ReplaceMeta
): Promise<number> {
  await Promise.all([
    clearTable(CATALOG_TABLES.properties),
    clearTable(CATALOG_TABLES.roomRates),
    clearTable(CATALOG_TABLES.cruiseRates),
    clearTable(CATALOG_TABLES.settings, { filter: { column: 'workbook', value: 'accommodation' } }),
  ]);

  await Promise.all([
    insertRows(CATALOG_TABLES.properties, catalog.properties.map((p) => toRow(p, ACC_PROPERTY_MAP))),
    insertRows(CATALOG_TABLES.roomRates, catalog.roomRates.map((r) => toRow(r, ACC_RATE_MAP))),
    insertRows(CATALOG_TABLES.cruiseRates, catalog.cruiseRates.map((c) => toRow(c, ACC_CRUISE_MAP))),
    insertRows(CATALOG_TABLES.settings, catalog.settings.map((s) => toRow(s, SETTING_MAP))),
  ]);

  const rowCount =
    catalog.properties.length +
    catalog.roomRates.length +
    catalog.cruiseRates.length +
    catalog.settings.length;

  await recordImport('accommodation', meta.fileName, meta.sheetCount, rowCount, meta.warningCount);
  return rowCount;
}

/** Persists an edit to one imported row. `patch` uses app field names. */
export async function updateCatalogRow(
  tableKey: CatalogTableKey,
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const supabase = requireClient();
  const map = MAPS[tableKey];
  if (!map) throw new Error(`No column map for ${tableKey}`);

  const row: Row = {};
  for (const [field, value] of Object.entries(patch)) {
    const column = map[field];
    if (column) row[column] = value === '' && typeof value === 'string' ? '' : value;
  }
  if (!Object.keys(row).length) return;
  row.updated_at = new Date().toISOString();

  const pk = tableKey === 'products' ? 'code' : 'id';
  const { error } = await supabase.from(CATALOG_TABLES[tableKey]).update(row).eq(pk, id);
  if (error) throw new Error(`Saving the change failed: ${error.message}`);
}

/** Cost lines need bespoke handling for the p1..p20 pax columns. */
export async function updateCostLine(id: string, patch: Partial<EssCostLine>): Promise<void> {
  const supabase = requireClient();
  const row: Row = { updated_at: new Date().toISOString() };

  if (patch.label !== undefined) row.label = patch.label;
  if (patch.groupLabel !== undefined) row.group_label = patch.groupLabel;
  if (patch.kind !== undefined) row.kind = patch.kind;
  if (patch.pax) {
    for (let i = 0; i < ESS_PAX_COLUMNS; i++) row[`p${i + 1}`] = patch.pax[i] ?? null;
  }

  const { error } = await supabase.from(CATALOG_TABLES.costLines).update(row).eq('id', id);
  if (error) throw new Error(`Saving the change failed: ${error.message}`);
}

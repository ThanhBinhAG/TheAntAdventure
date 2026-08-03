/**
 * Types for the two imported pricing workbooks:
 *  - Essentials Saigon & Mekong (experience cost builder + provider rates)
 *  - Accommodation & Cruises price list (property master + seasonal room rates)
 *
 * Field names mirror the Excel columns so an imported sheet can be rendered
 * back in the same shape it was authored in.
 */

export type CatalogWorkbook = 'essentials' | 'accommodation';

/** Number of pax columns in the Essentials cost builder (C..V). */
export const ESS_PAX_COLUMNS = 20;

export interface PricingSetting {
  id: string;
  workbook: CatalogWorkbook;
  sheet: string;
  key: string;
  label: string;
  valueNum: number | null;
  valueText: string;
  sortOrder: number;
}

// ---------------------------------------------------------------- Essentials

export interface EssProduct {
  code: string;
  seq: number;
  category: string;
  name: string;
  durationDays: number | null;
  overnight: string;
  journeys: string;
  incl7: string;
  incl16: string;
  incl29: string;
  incl35: string;
  guideMain: number | null;
  guideAssistant: number | null;
  guideOvernight: number | null;
  truckPrice: number | null;
  sortOrder: number;
}

export type EssCostKind = 'component' | 'hotel' | 'selling_group' | 'selling_pax' | 'surcharge';

export interface EssCostLine {
  id: string;
  productCode: string;
  groupLabel: string;
  label: string;
  kind: EssCostKind;
  /** Amounts for pax 1..20; null where the workbook cell was blank or broken. */
  pax: (number | null)[];
  sortOrder: number;
}

export interface EssServiceRate {
  id: string;
  block: string;
  label: string;
  unit: string;
  amount: number | null;
  amount2: number | null;
  notes: string;
  sortOrder: number;
}

export interface EssCarRate {
  id: string;
  category: string;
  tourTitle: string;
  route: string;
  km: number | null;
  duration: string;
  s7: number | null;
  s16: number | null;
  s29: number | null;
  s35: number | null;
  s45: number | null;
  sortOrder: number;
}

export interface EssHotelRate {
  id: string;
  sheet: string;
  property: string;
  section: string;
  roomType: string;
  variantA: string;
  variantB: string;
  vndA: number | null;
  vndB: number | null;
  usdA: number | null;
  usdB: number | null;
  sellA: number | null;
  sellB: number | null;
  notes: string;
  sortOrder: number;
}

/** Free-text rows: pricing guidelines, policies and unstructured hotel/boat sheets. */
export interface EssNote {
  id: string;
  sheet: string;
  section: string;
  label: string;
  detail: string;
  sortOrder: number;
}

export interface EssentialsCatalog {
  settings: PricingSetting[];
  products: EssProduct[];
  costLines: EssCostLine[];
  services: EssServiceRate[];
  cars: EssCarRate[];
  hotels: EssHotelRate[];
  notes: EssNote[];
}

// ------------------------------------------------------------ Accommodation

export interface AccProperty {
  id: string;
  region: string;
  location: string;
  name: string;
  website: string;
  address: string;
  ownership: string;
  stars: string;
  type: string;
  reservationsContact: string;
  salesContact: string;
  factsheetLink: string;
  contractRenewal: string;
  bankAccount: string;
  approved: string;
  sortOrder: number;
}

export interface AccRoomRate {
  id: string;
  sheet: string;
  location: string;
  propertyName: string;
  roomType: string;
  season: string;
  periodFrom: string;
  periodTo: string;
  yearLabel: string;
  vndCost: number | null;
  usdCost: number | null;
  sellPrice: number | null;
  margin: number | null;
  notes: string;
  sortOrder: number;
}

export interface AccCruiseRate {
  id: string;
  sheet: string;
  region: string;
  location: string;
  propertyName: string;
  stars: string;
  type: string;
  roomType: string;
  phone: string;
  email: string;
  cost2026: number | null;
  cost2027: number | null;
  sell2026: number | null;
  sell2027: number | null;
  markupPct: number | null;
  margin: number | null;
  sortOrder: number;
}

export interface AccommodationCatalog {
  settings: PricingSetting[];
  properties: AccProperty[];
  roomRates: AccRoomRate[];
  cruiseRates: AccCruiseRate[];
}

// ------------------------------------------------------------------ Imports

export interface CatalogImportRecord {
  id: string;
  workbook: CatalogWorkbook;
  fileName: string;
  sheetCount: number;
  rowCount: number;
  warningCount: number;
  importedAt: string;
}

export interface SheetSummary {
  name: string;
  parsed: number;
  kind: string;
}

export interface CatalogParseResult<T> {
  data: T;
  warnings: string[];
  sheets: SheetSummary[];
  rowCount: number;
}

export function emptyEssentialsCatalog(): EssentialsCatalog {
  return { settings: [], products: [], costLines: [], services: [], cars: [], hotels: [], notes: [] };
}

export function emptyAccommodationCatalog(): AccommodationCatalog {
  return { settings: [], properties: [], roomRates: [], cruiseRates: [] };
}

export function essentialsRowCount(c: EssentialsCatalog): number {
  return (
    c.settings.length +
    c.products.length +
    c.costLines.length +
    c.services.length +
    c.cars.length +
    c.hotels.length +
    c.notes.length
  );
}

export function accommodationRowCount(c: AccommodationCatalog): number {
  return c.settings.length + c.properties.length + c.roomRates.length + c.cruiseRates.length;
}

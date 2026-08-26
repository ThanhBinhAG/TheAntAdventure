import { z } from 'zod';
import { ESS_PAX_COLUMNS } from './catalog-types';

const text = z.string();
const number = z.number().finite();
const nullableNumber = number.nullable();
const identifier = text.min(1).max(200);
const sortOrder = number.int().nonnegative();

const essentialsSettingSchema = z.object({
  id: identifier,
  workbook: z.literal('essentials'),
  sheet: text,
  key: text,
  label: text,
  valueNum: nullableNumber,
  valueText: text,
  sortOrder,
});

const accommodationSettingSchema = essentialsSettingSchema.extend({
  workbook: z.literal('accommodation'),
});

const essentialsProductSchema = z.object({
  code: identifier,
  seq: number.int(),
  category: text,
  name: text,
  durationDays: nullableNumber,
  overnight: text,
  journeys: text,
  incl7: text,
  incl16: text,
  incl29: text,
  incl35: text,
  guideMain: nullableNumber,
  guideAssistant: nullableNumber,
  guideOvernight: nullableNumber,
  truckPrice: nullableNumber,
  sortOrder,
});

const costLineSchema = z.object({
  id: identifier,
  productCode: identifier,
  groupLabel: text,
  label: text,
  kind: z.enum(['component', 'hotel', 'selling_group', 'selling_pax', 'surcharge']),
  pax: z.array(nullableNumber).length(ESS_PAX_COLUMNS),
  sortOrder,
});

const serviceRateSchema = z.object({
  id: identifier,
  block: text,
  label: text,
  unit: text,
  amount: nullableNumber,
  amount2: nullableNumber,
  notes: text,
  sortOrder,
});

const carRateSchema = z.object({
  id: identifier,
  category: text,
  tourTitle: text,
  route: text,
  km: nullableNumber,
  duration: text,
  s7: nullableNumber,
  s16: nullableNumber,
  s29: nullableNumber,
  s35: nullableNumber,
  s45: nullableNumber,
  sortOrder,
});

const hotelRateSchema = z.object({
  id: identifier,
  sheet: text,
  property: text,
  section: text,
  roomType: text,
  variantA: text,
  variantB: text,
  vndA: nullableNumber,
  vndB: nullableNumber,
  usdA: nullableNumber,
  usdB: nullableNumber,
  sellA: nullableNumber,
  sellB: nullableNumber,
  notes: text,
  sortOrder,
});

const noteSchema = z.object({
  id: identifier,
  sheet: text,
  section: text,
  label: text,
  detail: text,
  sortOrder,
});

const propertySchema = z.object({
  id: identifier,
  region: text,
  location: text,
  name: text,
  website: text,
  address: text,
  ownership: text,
  stars: text,
  type: text,
  reservationsContact: text,
  salesContact: text,
  factsheetLink: text,
  contractRenewal: text,
  bankAccount: text,
  approved: text,
  sortOrder,
});

const roomRateSchema = z.object({
  id: identifier,
  sheet: text,
  location: text,
  propertyName: text,
  roomType: text,
  season: text,
  periodFrom: text,
  periodTo: text,
  yearLabel: text,
  vndCost: nullableNumber,
  usdCost: nullableNumber,
  sellPrice: nullableNumber,
  margin: nullableNumber,
  notes: text,
  sortOrder,
});

const cruiseRateSchema = z.object({
  id: identifier,
  sheet: text,
  region: text,
  location: text,
  propertyName: text,
  stars: text,
  type: text,
  roomType: text,
  phone: text,
  email: text,
  cost2026: nullableNumber,
  cost2027: nullableNumber,
  sell2026: nullableNumber,
  sell2027: nullableNumber,
  markupPct: nullableNumber,
  margin: nullableNumber,
  sortOrder,
});

export const essentialsCatalogSchema = z.object({
  settings: z.array(essentialsSettingSchema),
  products: z.array(essentialsProductSchema),
  costLines: z.array(costLineSchema),
  services: z.array(serviceRateSchema),
  cars: z.array(carRateSchema),
  hotels: z.array(hotelRateSchema),
  notes: z.array(noteSchema),
});

export const accommodationCatalogSchema = z.object({
  settings: z.array(accommodationSettingSchema),
  properties: z.array(propertySchema),
  roomRates: z.array(roomRateSchema),
  cruiseRates: z.array(cruiseRateSchema),
});

export const catalogImportMetaSchema = z.object({
  fileName: text.min(1).max(512),
  sheetCount: number.int().nonnegative(),
  warningCount: number.int().nonnegative(),
});

const patchValueSchema = z.union([
  text,
  nullableNumber,
  z.array(nullableNumber).length(ESS_PAX_COLUMNS),
]);

export const catalogRowPatchSchema = z
  .record(z.string(), patchValueSchema)
  .refine((patch) => Object.keys(patch).length > 0, 'At least one editable field is required.');

export const costLinePatchSchema = z
  .object({
    label: text.optional(),
    groupLabel: text.optional(),
    kind: z.enum(['component', 'hotel', 'selling_group', 'selling_pax', 'surcharge']).optional(),
    pax: z.array(nullableNumber).length(ESS_PAX_COLUMNS).optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, 'At least one editable field is required.');

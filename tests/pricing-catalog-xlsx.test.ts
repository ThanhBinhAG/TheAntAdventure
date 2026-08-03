import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseAccommodationWorkbook, splitPropertyCell } from '../lib/pricing/accommodation-xlsx';
import { parseEssentialsWorkbook } from '../lib/pricing/essentials-xlsx';
import { num, periodText, slug } from '../lib/pricing/xlsx-cells';

const ESSENTIALS_FILE = 'Personal/Material/pricing/Essentials_Saigon_Mekong_2026.xlsx';
const ACCOMMODATION_FILE = 'Personal/Material/pricing/Accommodation_Price_List_2026_2027.xlsx';

function readWorkbook(path: string): ArrayBuffer {
  const file = readFileSync(path);
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}

test('num() handles the numeric formats used across both workbooks', () => {
  assert.equal(num(1500000), 1500000);
  assert.equal(num('1.200.000'), 1200000);
  assert.equal(num('1,200,000'), 1200000);
  assert.equal(num('7%'), 0.07);
  assert.equal(num('#REF!'), null);
  assert.equal(num('#ERROR!'), null);
  assert.equal(num('FOC'), null);
  assert.equal(num(''), null);
});

test('periodText() normalises real dates but keeps free-text periods', () => {
  assert.equal(periodText(new Date(Date.UTC(2026, 4, 3))), '2026-05-03');
  assert.equal(
    periodText('Jan 12, 2026 - May 02, 2026'),
    'Jan 12, 2026 - May 02, 2026'
  );
});

test('slug() strips Vietnamese diacritics for stable row ids', () => {
  assert.equal(slug('Hotel_Chau Doc'), 'hotel-chau-doc');
  assert.equal(slug('Cô Vân Homestay'), 'co-van-homestay');
});

test('splitPropertyCell() separates name, website and address', () => {
  const parsed = splitPropertyCell(
    'Capella Hanoi https://capellahotels.com/en/capella-hanoi Add: 11 Le Phung Hieu, Hoan Kiem, Hanoi'
  );
  assert.equal(parsed.name, 'Capella Hanoi');
  assert.equal(parsed.website, 'https://capellahotels.com/en/capella-hanoi');
  assert.equal(parsed.address, '11 Le Phung Hieu, Hoan Kiem, Hanoi');

  const bare = splitPropertyCell('The Oriental Jade Hotel');
  assert.equal(bare.name, 'The Oriental Jade Hotel');
  assert.equal(bare.website, '');
});

test('Essentials workbook parses every sheet into the catalog', () => {
  const result = parseEssentialsWorkbook(readWorkbook(ESSENTIALS_FILE));

  assert.equal(result.sheets.length, 14);
  assert.equal(result.data.products.length, 16);
  assert.ok(result.data.costLines.length > 150);

  const product = result.data.products.find((p) => p.code === '02-ESM01');
  assert.ok(product, 'expected the Nam Cat Tien experience');
  assert.equal(product?.category, '2 DAYS 1 NIGHT EXPERIENCES');
  assert.equal(product?.durationDays, 2);
  assert.equal(product?.guideMain, 3_000_000);
  assert.equal(product?.truckPrice, 5_800_000);

  // Header rows must not leak into the catalogue.
  assert.equal(result.data.products.some((p) => p.code === 'CODE'), false);

  const solo = result.data.costLines.find(
    (l) => l.productCode === 'ESM01' && l.kind === 'selling_pax'
  );
  assert.equal(solo?.pax.length, 20);
  assert.equal(solo?.pax[0], 98);

  const hotelLine = result.data.costLines.find((l) => l.kind === 'hotel');
  assert.ok(hotelLine?.groupLabel.startsWith('Hotel Selling'));

  const namCatTien = result.data.hotels.filter((h) => h.sheet === 'Hotel_Nam Cat Tien');
  assert.ok(namCatTien.length >= 15);
  assert.equal(namCatTien[0]?.variantA, 'Sun - Fri');
  assert.equal(namCatTien[0]?.variantB, 'Sat');
  assert.equal(namCatTien[0]?.property, 'Green Bamboo Lodge');

  const chauDoc = result.data.hotels.filter((h) => h.sheet === 'Hotel_Chau Doc');
  assert.equal(chauDoc[0]?.variantB, '', 'Chau Doc uses a single rate column');

  assert.ok(result.data.cars.length > 20);
  assert.ok(result.data.services.length > 10);
  assert.ok(result.warnings.some((w) => w.includes('formula errors')));
});

test('Accommodation workbook parses properties, rates and cruises', () => {
  const result = parseAccommodationWorkbook(readWorkbook(ACCOMMODATION_FILE));

  assert.equal(result.sheets.length, 7);
  assert.ok(result.data.properties.length > 200);
  assert.ok(result.data.roomRates.length > 900);
  assert.equal(result.data.cruiseRates.length, 18);

  const rate = result.data.roomRates[0];
  assert.equal(rate?.propertyName, 'La Siesta Classic Hang Thung');
  assert.equal(rate?.location, 'Hanoi');
  assert.equal(rate?.season, 'LOW');
  assert.equal(rate?.vndCost, 2_200_000);
  assert.equal(rate?.usdCost, 88);
  assert.equal(rate?.sellPrice, 94.5);

  // "Done on <date>" audit stamps must not be read as a location or property.
  assert.equal(
    result.data.roomRates.some((r) => /^done on/i.test(r.propertyName) || /^done on/i.test(r.location)),
    false
  );

  const cruise = result.data.cruiseRates[0];
  assert.equal(cruise?.type, 'Cruise');
  assert.equal(cruise?.cost2026, 350);
  assert.equal(cruise?.sell2026, 381.5);

  assert.ok(result.warnings.some((w) => w.includes('Park Hyatt Saigon')));
});

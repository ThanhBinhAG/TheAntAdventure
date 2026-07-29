import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildPricingFilterSummary,
  buildPricingSheetData,
  paxColumnLabel,
  pricingExportFilename,
} from '../lib/pricing/pricing-export';
import { buildPricingHTML } from '../lib/pricing/pricing-html';
import type { PricingTableRow } from '../lib/products/product-pricing-helpers';

const sampleRow: PricingTableRow = {
  num: 1,
  productCode: 'AA-NV-HAN-HD-02',
  name: 'Hanoi: Market and Street Food',
  region: 'North',
  duration: 'Half Day',
  category: 'Culinary',
  level: 'Easy & Comfortable',
  pricing: {
    productCode: 'AA-NV-HAN-HD-02',
    stdCost: 55,
    p1: 175,
    p2: 80,
    p3: 65,
    p4: 55,
    p5: 50,
    p6: 45,
    p7: 45,
    p8: 40,
    p9: 40,
    p10: 40,
    c1: 121,
    c2: 55,
    c3: 45,
    c4: 40,
    c5: 36,
    c6: 33,
    c7: 31,
    c8: 29,
    c9: 28,
    c10: 27,
    incl: { g: true, tr: false, tk: false, w: true, m: true },
  },
};

test('paxColumnLabel uses 10+ for tier 10', () => {
  assert.equal(paxColumnLabel(1), '1 PAX');
  assert.equal(paxColumnLabel(9), '9 PAX');
  assert.equal(paxColumnLabel(10), '10+ PAX');
});

test('buildPricingSheetData includes meta, header, and data rows', () => {
  const data = buildPricingSheetData([sampleRow], { currency: 'USD', showCost: false });
  assert.ok(data[0][0].toString().includes('Price List 2026'));
  assert.equal((data[1] as unknown[]).length, 0);
  const header = data[2] as string[];
  assert.equal(header[0], 'Tour ID');
  assert.ok(header.includes('10+ PAX'));
  assert.equal(header.filter((h) => h.endsWith('PAX')).length, 10);
  assert.equal(data.length, 4);
  assert.equal(data[3][0], 'AA-NV-HAN-HD-02');
  assert.equal(data[3][1], 'Hanoi: Market and Street Food');
});

test('buildPricingSheetData adds cost columns when showCost is true', () => {
  const data = buildPricingSheetData([sampleRow], { currency: 'USD', showCost: true });
  const header = data[2] as string[];
  assert.ok(header.includes('Cost 1 PAX'));
  assert.ok(header.includes('Mk% 10+ PAX'));
  const row = data[3] as string[];
  assert.ok(row.some((cell) => typeof cell === 'string' && cell.includes('%')));
});

test('buildPricingSheetData respects filter summary', () => {
  const data = buildPricingSheetData([sampleRow], {
    currency: 'EUR',
    showCost: false,
    filterSummary: 'Filters: Region: North',
  });
  assert.equal(data[1][0], 'Filters: Region: North');
});

test('buildPricingFilterSummary joins active filters', () => {
  assert.equal(
    buildPricingFilterSummary({ search: 'Halong', region: 'North' }),
    'Filters: Search: Halong · Region: North'
  );
  assert.equal(buildPricingFilterSummary({}), undefined);
});

test('pricingExportFilename includes currency and date', () => {
  const name = pricingExportFilename('VND');
  assert.match(name, /^TAA-PriceList-2026-VND-\d{4}-\d{2}-\d{2}\.xlsx$/);
});

test('buildPricingHTML contains key columns and landscape page size', () => {
  const html = buildPricingHTML([sampleRow], { currency: 'USD', showCost: false }, 'http://localhost:3006');
  assert.ok(html.includes('A4 landscape'));
  assert.ok(html.includes('10+ PAX'));
  assert.ok(html.includes('AA-NV-HAN-HD-02'));
  assert.ok(html.includes('Logo-3.svg'));
});

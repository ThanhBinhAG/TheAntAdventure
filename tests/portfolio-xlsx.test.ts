import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as XLSX from 'xlsx';
import {
  classifyPortfolioRow,
  draftToProduct,
  normalizeDuration,
} from '../lib/products/portfolio-classify';
import { parsePortfolioXlsx } from '../lib/products/portfolio-xlsx';

test('normalizeDuration maps evening / full / half day', () => {
  assert.equal(normalizeDuration('Evening (3–4 hours)').dur, 'Evening (3–4 hours)');
  assert.equal(normalizeDuration('Full Day').matched, true);
  assert.equal(normalizeDuration('Half Day').dur, 'Half Day');
  assert.equal(normalizeDuration('Weird span').matched, false);
});

test('classifyPortfolioRow parses AA-SV-SGN-CULI-EVE code', () => {
  const draft = classifyPortfolioRow({
    code: 'AA-SV-SGN-CULI-EVE-01',
    name: 'Saigon After Dark',
    durationRaw: 'Evening (3–4 hours)',
    description: 'Street food by motorbike.',
    notesToSales: '• XO Tours\n• Women riders',
    sectionDest: 'Ho Chi Minh City',
  });
  assert.equal(draft.region, 'south');
  assert.equal(draft.dest, 'Ho Chi Minh City');
  assert.equal(draft.cat, 'Culinary');
  assert.equal(draft.dur, 'Evening (3–4 hours)');
  assert.equal(draft.notesToSales.includes('XO Tours'), true);
  assert.equal(draft.needsReview, false);

  const product = draftToProduct(draft);
  assert.equal(product.notesToSales, draft.notesToSales);
  assert.equal(product.usp, '');
  assert.equal(product.logic, '');
});

test('parsePortfolioXlsx reads section headers and product rows', () => {
  const aoa = [
    ['THE ANT ADVENTURES · SOUTH VIETNAM · TOUR PRODUCT DATABASE'],
    ['Code', 'Tour Products', 'Duration', 'Description', 'Notes to Sales'],
    ['HO CHI MINH CITY'],
    [
      'AA-SV-SGN-CULI-EVE-01',
      'Saigon After Dark — Street Food by Motorbike',
      'Evening (3–4 hours)',
      'Night markets and alley kitchens.',
      '• XO Tours — women riders',
    ],
    ['CU CHI'],
    [
      'AA-SV-CCH-HD-01',
      'Cu Chi Tunnels Half Day',
      'Half Day',
      'Underground network.',
      '• Private guide',
    ],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'South');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

  const result = parsePortfolioXlsx(buffer);
  assert.equal(result.products.length, 2);
  assert.equal(result.products[0].code, 'AA-SV-SGN-CULI-EVE-01');
  assert.equal(result.products[0].dest, 'Ho Chi Minh City');
  assert.equal(result.products[0].cat, 'Culinary');
  assert.equal(result.products[1].code, 'AA-SV-CCH-HD-01');
  assert.equal(result.products[1].dest, 'Cu Chi');
});

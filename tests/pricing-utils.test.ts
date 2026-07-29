import assert from 'node:assert/strict';
import test from 'node:test';
import { fmtPx, getCostUSD, getSpUSD, mkPct, PL_FX_BASE } from '../lib/pricing/pricing-utils';
import type { ProductPricing } from '../lib/types';

const row: ProductPricing = {
  productCode: 'AA-TEST',
  stdCost: 40,
  p1: 100,
  p2: 80,
  p3: 70,
  p4: 60,
  p5: 50,
  p6: 45,
  p7: 40,
  p8: 35,
  p9: 30,
  p10: 25,
  c1: 60,
  c2: 50,
  c3: 45,
  c4: 40,
  c5: 35,
  c6: 32,
  c7: 30,
  c8: 28,
  c9: 26,
  c10: 24,
  incl: { g: true, tr: true, tk: true, w: true, m: true },
};

test('getSpUSD and getCostUSD read pax columns', () => {
  assert.equal(getSpUSD(row, 2), 80);
  assert.equal(getCostUSD(row, 2), 50);
  assert.equal(getSpUSD(row, 10), 25);
});

test('mkPct is markup on cost (sell-cost)/cost', () => {
  assert.equal(mkPct(100, 50), 100);
  assert.equal(mkPct(80, 50), 60);
  assert.equal(mkPct(80, 0), 0);
});

test('fmtPx converts USD via PL_FX_BASE', () => {
  assert.equal(fmtPx(0), '—');
  assert.equal(fmtPx(100, 'USD'), '$100');
  assert.equal(fmtPx(100, 'EUR'), `€${Math.round(100 * PL_FX_BASE.EUR)}`);
  assert.equal(fmtPx(1, 'VND'), `${(1 * PL_FX_BASE.VND).toLocaleString('en-US')}₫`);
  assert.equal(fmtPx(10, 'AUD'), `A$${Math.round(10 * PL_FX_BASE.AUD)}`);
});

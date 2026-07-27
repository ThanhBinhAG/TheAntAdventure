import assert from 'node:assert/strict';
import test from 'node:test';
import { useStore } from '../lib/store';
import type { ProductPricing } from '../lib/types';
import {
  getAdjustedSell,
  getCostPrice,
  getSellPrice,
  markupPct,
  paxToExactN,
  paxToTierN,
  sumCostForProducts,
  sumSellForProducts,
} from '../lib/tour-pricing';

const samplePricing: ProductPricing = {
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
};

const otherPricing: ProductPricing = {
  ...samplePricing,
  productCode: 'AA-NV-HAN-FD-01',
  p2: 120,
  c2: 70,
};

test('paxToTierN maps pax counts to sell-rate columns', () => {
  assert.equal(paxToTierN(1), 1);
  assert.equal(paxToTierN(2), 2);
  assert.equal(paxToTierN(3), 3);
  assert.equal(paxToTierN(4), 3);
  assert.equal(paxToTierN(5), 5);
  assert.equal(paxToTierN(6), 5);
  assert.equal(paxToTierN(7), 7);
  assert.equal(paxToTierN(9), 7);
  assert.equal(paxToTierN(10), 10);
});

test('paxToExactN clamps to 1–10', () => {
  assert.equal(paxToExactN(0), 1);
  assert.equal(paxToExactN(-3), 1);
  assert.equal(paxToExactN(4), 4);
  assert.equal(paxToExactN(12), 10);
});

test('getSellPrice and getCostPrice read store tiers', () => {
  useStore.setState({ productPricing: [samplePricing] });
  assert.equal(getSellPrice('AA-NV-HAN-HD-02', 2), 80);
  assert.equal(getCostPrice('AA-NV-HAN-HD-02', 2), 55);
  assert.equal(getSellPrice('MISSING', 2), 0);
  assert.equal(getCostPrice('MISSING', 2), 0);
});

test('getAdjustedSell uses catalog sell at 30% markup, else cost×markup', () => {
  useStore.setState({ productPricing: [samplePricing] });
  assert.equal(getAdjustedSell('AA-NV-HAN-HD-02', 2, 30), 80);
  assert.equal(getAdjustedSell('AA-NV-HAN-HD-02', 2, 50), Math.round(55 * 1.5));
  assert.equal(getAdjustedSell('MISSING', 2, 40), 0);
});

test('sumSellForProducts and sumCostForProducts aggregate codes', () => {
  useStore.setState({ productPricing: [samplePricing, otherPricing] });
  assert.equal(sumSellForProducts(['AA-NV-HAN-HD-02', 'AA-NV-HAN-FD-01'], 2), 80 + 120);
  assert.equal(sumCostForProducts(['AA-NV-HAN-HD-02', 'AA-NV-HAN-FD-01'], 2), 55 + 70);
  assert.equal(sumSellForProducts(['AA-NV-HAN-HD-02'], 2, 50), Math.round(55 * 1.5));
});

test('markupPct is margin on sell (not cost markup)', () => {
  assert.equal(markupPct(100, 70), 30);
  assert.equal(markupPct(0, 70), 0);
  assert.equal(markupPct(100, 0), 0);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPricingTableRows,
  countOrphanPricing,
  emptyProductPricing,
  matchesPricingStatusFilter,
  pricingStatus,
  pruneProductPricingToProducts,
  taaTourToProductPricing,
} from '../lib/product-pricing-helpers';
import { TAA_TOURS } from '../lib/seeds/taa-tours';
import { useStore } from '../lib/store';
import type { Product, ProductPricing } from '../lib/types';
import { findProductPricing, getLibPriceLabel, getSellPrice, paxToExactN, paxToTierN } from '../lib/tour-pricing';

const sampleProduct: Product = {
  code: 'AA-NV-HAN-HD-02',
  name: 'Hanoi: Market and Street Food',
  logic: '',
  dur: 'Half Day',
  cat: 'Culinary',
  dest: 'Hanoi',
  lvl: 'Easy',
  desc: 'Test',
  usp: '',
  price: '',
  region: 'north',
};

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

test('taaTourToProductPricing maps legacy seed row', () => {
  const row = taaTourToProductPricing(TAA_TOURS[3]);
  assert.equal(row.productCode, 'AA-NV-HAN-HD-02');
  assert.equal(row.p2, 80);
  assert.equal(row.c2, 55);
  assert.equal(row.incl.m, true);
});

test('pricingStatus detects missing and complete rows', () => {
  assert.equal(pricingStatus(undefined), 'missing');
  assert.equal(pricingStatus(emptyProductPricing('X')), 'missing');
  assert.equal(pricingStatus(samplePricing), 'complete');
});

test('matchesPricingStatusFilter respects pricing status filter', () => {
  const pricingByCode = new Map([[samplePricing.productCode, samplePricing]]);
  const incompleteRow: ProductPricing = {
    ...emptyProductPricing('AA-PARTIAL-01'),
    stdCost: 55,
    p2: 80,
  };
  pricingByCode.set(incompleteRow.productCode, incompleteRow);

  assert.equal(matchesPricingStatusFilter(samplePricing.productCode, pricingByCode, ''), true);
  assert.equal(matchesPricingStatusFilter(samplePricing.productCode, pricingByCode, 'complete'), true);
  assert.equal(matchesPricingStatusFilter(samplePricing.productCode, pricingByCode, 'missing'), false);
  assert.equal(matchesPricingStatusFilter('UNKNOWN', pricingByCode, 'missing'), true);
  assert.equal(matchesPricingStatusFilter('UNKNOWN', pricingByCode, 'complete'), false);
  assert.equal(matchesPricingStatusFilter(incompleteRow.productCode, pricingByCode, 'incomplete'), true);
  assert.equal(matchesPricingStatusFilter(incompleteRow.productCode, pricingByCode, 'complete'), false);
});

test('buildPricingTableRows is product-first and marks missing pricing', () => {
  const rows = buildPricingTableRows(
    [sampleProduct, { ...sampleProduct, code: 'SV-SVC-VOA-01', name: 'Visa' }],
    [samplePricing]
  );
  const joined = rows.find((r) => r.productCode === 'AA-NV-HAN-HD-02');
  const missing = rows.find((r) => r.productCode === 'SV-SVC-VOA-01');
  assert.ok(joined);
  assert.equal(joined!.name, sampleProduct.name);
  assert.equal(joined!.pricing.p2, 80);
  assert.equal(joined!.missingProduct, false);
  assert.ok(missing?.missingProduct);
  assert.equal(missing!.orphanPricing, false);
});

test('buildPricingTableRows treats all-zero stubs as missing tiers', () => {
  const stub = emptyProductPricing(sampleProduct.code);
  const rows = buildPricingTableRows([sampleProduct], [stub]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].missingProduct, true);
  assert.equal(rows[0].pricing.p2, 0);
});

test('buildPricingTableRows omits orphan pricing without a product', () => {
  const orphan: ProductPricing = { ...samplePricing, productCode: 'AA-OLD-ORPHAN-01' };
  const rows = buildPricingTableRows([sampleProduct], [samplePricing, orphan]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].productCode, sampleProduct.code);
  assert.equal(countOrphanPricing([sampleProduct], [samplePricing, orphan]), 1);
});

test('pruneProductPricingToProducts drops codes not in catalogue', () => {
  const orphan: ProductPricing = { ...samplePricing, productCode: 'AA-OLD-ORPHAN-01' };
  const pruned = pruneProductPricingToProducts([samplePricing, orphan], [sampleProduct]);
  assert.equal(pruned.length, 1);
  assert.equal(pruned[0].productCode, sampleProduct.code);
});

test('buildEmptyPricingStubs creates one zero row per product code', async () => {
  const { buildEmptyPricingStubs } = await import('../lib/products/replace-catalogue');
  const stubs = buildEmptyPricingStubs([
    sampleProduct,
    { ...sampleProduct, code: 'AA-SV-SGN-CULI-EVE-01' },
  ]);
  assert.equal(stubs.length, 2);
  assert.equal(stubs[0].productCode, sampleProduct.code);
  assert.equal(stubs[1].productCode, 'AA-SV-SGN-CULI-EVE-01');
  assert.equal(stubs[0].p1, 0);
  assert.equal(pricingStatus(stubs[0]), 'missing');
});

test('tour-pricing reads from Zustand store', () => {
  useStore.setState({ productPricing: [samplePricing] });
  assert.ok(findProductPricing('AA-NV-HAN-HD-02'));
  assert.equal(getSellPrice('AA-NV-HAN-HD-02', 2), 80);
  assert.equal(getLibPriceLabel('AA-NV-HAN-HD-02', 2), '$80/pax');
  assert.equal(getSellPrice('UNKNOWN', 2), 0);
});

test('pax helpers clamp groups above 10 to the open 10+ rate column', () => {
  assert.equal(paxToExactN(10), 10);
  assert.equal(paxToExactN(11), 10);
  assert.equal(paxToExactN(15), 10);
  assert.equal(paxToExactN(24), 10);
  assert.equal(paxToTierN(10), 10);
  assert.equal(paxToTierN(12), 10);
  assert.equal(paxToTierN(24), 10);
  assert.equal(paxToTierN(9), 7);
  assert.equal(paxToExactN(9), 9);

  useStore.setState({ productPricing: [samplePricing] });
  assert.equal(getSellPrice('AA-NV-HAN-HD-02', paxToExactN(10)), 40);
  assert.equal(getSellPrice('AA-NV-HAN-HD-02', paxToExactN(15)), 40);
  assert.equal(getSellPrice('AA-NV-HAN-HD-02', paxToExactN(24)), 40);
  assert.equal(getSellPrice('AA-NV-HAN-HD-02', paxToTierN(15)), 40);
});

test('upsertProductPricing updates catalog and product display price', () => {
  useStore.setState({
    products: [sampleProduct],
    productPricing: [],
  });
  useStore.getState().upsertProductPricing(samplePricing);
  const state = useStore.getState();
  assert.equal(state.productPricing.length, 1);
  assert.equal(state.products[0].price, '$80/pax');
});

test('deleteProduct removes linked pricing row', () => {
  useStore.setState({
    products: [sampleProduct],
    productPricing: [samplePricing],
  });
  useStore.getState().deleteProduct(sampleProduct.code);
  const state = useStore.getState();
  assert.equal(state.products.length, 0);
  assert.equal(state.productPricing.length, 0);
});

test('deleteProduct cascades gallery photos for product code', () => {
  useStore.setState({
    products: [sampleProduct],
    productPricing: [samplePricing],
    photos: [
      { id: 'PH-1', caption: 'A', region: 'north', product: sampleProduct.code, url: 'https://x/1.jpg' },
      { id: 'PH-2', caption: 'B', region: 'north', product: 'OTHER', url: 'https://x/2.jpg' },
      { id: 'PH-3', caption: 'C', region: 'north', url: 'https://x/3.jpg' },
    ],
  });
  useStore.getState().deleteProduct(sampleProduct.code);
  const photos = useStore.getState().photos as { id: string; product?: string }[];
  assert.equal(photos.length, 2);
  assert.ok(photos.every((p) => p.product !== sampleProduct.code));
  assert.deepEqual(
    photos.map((p) => p.id).sort(),
    ['PH-2', 'PH-3']
  );
});

test('addProduct creates empty pricing row', () => {
  const code = 'AA-NV-TEST-01';
  useStore.setState({ products: [], productPricing: [] });
  useStore.getState().addProduct({ ...sampleProduct, code, name: 'Test tour' });
  const state = useStore.getState();
  assert.equal(state.products.length, 1);
  assert.equal(state.productPricing.length, 1);
  assert.equal(state.productPricing[0].productCode, code);
  assert.equal(pricingStatus(state.productPricing[0]), 'missing');
});

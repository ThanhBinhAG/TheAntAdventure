import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPricingTableRows,
  emptyProductPricing,
  pricingStatus,
  taaTourToProductPricing,
} from '../lib/product-pricing-helpers';
import { TAA_TOURS } from '../lib/seeds/taa-tours';
import { useStore } from '../lib/store';
import type { Product, ProductPricing } from '../lib/types';
import { findProductPricing, getLibPriceLabel, getSellPrice } from '../lib/tour-pricing';

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

test('buildPricingTableRows joins products and pricing', () => {
  const rows = buildPricingTableRows(
    [sampleProduct, { ...sampleProduct, code: 'SV-SVC-VOA-01', name: 'Visa' }],
    [samplePricing]
  );
  const joined = rows.find((r) => r.productCode === 'AA-NV-HAN-HD-02');
  const missing = rows.find((r) => r.productCode === 'SV-SVC-VOA-01');
  assert.ok(joined);
  assert.equal(joined!.name, sampleProduct.name);
  assert.equal(joined!.pricing.p2, 80);
  assert.ok(missing?.missingProduct);
});

test('tour-pricing reads from Zustand store', () => {
  useStore.setState({ productPricing: [samplePricing] });
  assert.ok(findProductPricing('AA-NV-HAN-HD-02'));
  assert.equal(getSellPrice('AA-NV-HAN-HD-02', 2), 80);
  assert.equal(getLibPriceLabel('AA-NV-HAN-HD-02', 2), '$80/pax');
  assert.equal(getSellPrice('UNKNOWN', 2), 0);
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

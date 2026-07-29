import test from 'node:test';
import assert from 'node:assert/strict';
import { isSelectableProduct } from '../lib/products/product-display';
import type { Product } from '../lib/types';

const base: Product = {
  code: 'A',
  name: 'Test',
  logic: '',
  dur: 'Half Day',
  cat: 'Cultural',
  dest: 'Hanoi',
  lvl: '',
  desc: '',
  usp: '',
  price: '',
  region: 'north',
};

test('isSelectableProduct allows active and undefined status', () => {
  assert.equal(isSelectableProduct(base), true);
  assert.equal(isSelectableProduct({ ...base, status: 'active' }), true);
});

test('isSelectableProduct rejects draft and archived', () => {
  assert.equal(isSelectableProduct({ ...base, status: 'draft' }), false);
  assert.equal(isSelectableProduct({ ...base, status: 'archived' }), false);
});

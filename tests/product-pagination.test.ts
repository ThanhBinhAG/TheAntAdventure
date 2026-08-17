import assert from 'node:assert/strict';
import test from 'node:test';
import { getProductPageMetadata } from '../lib/products/product-pagination';

test('keeps an empty catalogue on page 1', () => {
  assert.deepEqual(getProductPageMetadata(0, 1, 24), {
    page: 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
  });
});

test('clamps a requested page to the final available page', () => {
  assert.deepEqual(getProductPageMetadata(58, 99, 24), {
    page: 3,
    totalPages: 3,
    hasPreviousPage: true,
    hasNextPage: false,
  });
});

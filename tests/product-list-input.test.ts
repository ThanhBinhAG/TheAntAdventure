import assert from 'node:assert/strict';
import test from 'node:test';
import { productListQuerySchema } from '../lib/products/product-list-input';

test('normalizes product list pagination and filter query values', () => {
    assert.deepEqual(
        productListQuerySchema.parse({
            page: '2',
            pageSize: '48',
            q: '  hanoi  ',
            region: 'north',
            duration: 'Full Day',
            category: 'Cultural',
            destination: 'Hanoi',
            pricingStatus: 'complete',
        }),
        {
            page: 2,
            pageSize: 48,
            view: 'catalog',
            q: 'hanoi',
            region: 'north',
            duration: 'Full Day',
            category: 'Cultural',
            destination: 'Hanoi',
            pricingStatus: 'complete',
        },
    );
});

test('rejects an unknown product pricing status filter', () => {
    assert.equal(
        productListQuerySchema.safeParse({
            pricingStatus: 'unknown',
        }).success,
        false,
    );
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProductPageUrl } from '../hooks/useProductPage';

test('buildProductPageUrl sends pagination values to the server API', () => {
    assert.equal(
        buildProductPageUrl({
            page: 2,
            pageSize: 48,
            view: 'catalog',
            q: 'hanoi',
            region: 'north',
            duration: 'Full Day',
            category: 'Cultural',
            destination: 'Hanoi',
            pricingStatus: 'complete',
        }),
        '/api/products?page=2&pageSize=48&view=catalog&q=hanoi&region=north&duration=Full+Day&category=Cultural&destination=Hanoi&pricingStatus=complete',
    );
});

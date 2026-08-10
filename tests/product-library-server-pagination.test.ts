import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('Product Library renders catalogue pages returned by the server', () => {
    const source = readFileSync(
        join(process.cwd(), 'components/products/ProductLibrary.tsx'),
        'utf8',
    );

    assert.match(source, /useProductPage\(/);
    assert.match(source, /productPage\?\.items/);
    assert.match(source, /productPage\?\.facets/);
    assert.doesNotMatch(source, /usePagination\(/);
    assert.doesNotMatch(source, /paginatedItems/);
});

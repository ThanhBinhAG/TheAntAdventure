import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('product list service delegates filtered pagination to its database RPC', () => {
    const source = readFileSync(
        join(process.cwd(), 'lib/products/product-list-server.ts'),
        'utf8',
    );

    assert.match(source, /\.rpc\(\s*'list_products_page'/);
    assert.doesNotMatch(source, /\.from\('products'\)/);
});

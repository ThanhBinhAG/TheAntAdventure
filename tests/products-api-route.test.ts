import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('product list API keeps its server-side pagination guard', () => {
    const source = readFileSync(
        join(process.cwd(), 'app/api/products/route.ts'),
        'utf8',
    );
    const facetsSource = readFileSync(
        join(process.cwd(), 'app/api/products/facets/route.ts'),
        'utf8',
    );

    assert.match(source, /export const dynamic = 'force-dynamic'/);
    assert.match(source, /requiredPermission:\s*'products\.read'/);
    assert.match(source, /productListQuerySchema\.safeParse/);
    assert.match(source, /listProductsPage\(/);
    assert.match(facetsSource, /listProductFacets\(/);
    assert.match(source, /Cache-Control': 'no-store'/);
    assert.doesNotMatch(source, /Server-Timing/);
});

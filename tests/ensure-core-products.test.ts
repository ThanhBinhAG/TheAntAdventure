import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeRequiredProducts } from '../lib/ensure-core-products';
import type { Product } from '../lib/types';

const base: Product[] = [
  {
    code: 'AA-TEST',
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
  },
];

test('mergeRequiredProducts adds missing service products', () => {
  const merged = mergeRequiredProducts(base);
  assert.ok(merged.some((p) => p.code === 'SV-SVC-VOA-01'));
  assert.ok(merged.some((p) => p.code === 'SV-SGN-HD-01'));
  assert.ok(merged.some((p) => p.code === 'SV-SGN-HD-02'));
  assert.equal(merged.length, base.length + 3);
});

test('mergeRequiredProducts is noop when services exist', () => {
  const withServices = mergeRequiredProducts([
    ...base,
    { ...base[0], code: 'SV-SVC-VOA-01', name: 'E-Visa Support Service', region: 'services', dur: 'Service' },
    { ...base[0], code: 'SV-SGN-HD-01', name: 'Arrival Fast Track (Airport)', region: 'services', dur: 'Service' },
    { ...base[0], code: 'SV-SGN-HD-02', name: 'Departure Fast Track (Airport)', region: 'services', dur: 'Service' },
  ]);
  const merged = mergeRequiredProducts(withServices);
  assert.equal(merged, withServices);
});

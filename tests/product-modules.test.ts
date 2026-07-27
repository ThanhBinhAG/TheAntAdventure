import assert from 'node:assert/strict';
import test from 'node:test';
import { useStore } from '../lib/store';
import type { Product } from '../lib/types';
import {
  countModulesProducts,
  durToModuleKey,
  filterProductsForModules,
  getModulePriceRange,
  groupProductsForModules,
  isProductActive,
  moduleKeyToDur,
} from '../lib/product-modules';

function product(partial: Partial<Product> & Pick<Product, 'code' | 'name'>): Product {
  return {
    logic: '',
    dur: 'Full Day',
    cat: 'Cultural',
    dest: 'Hanoi',
    lvl: 'Easy',
    desc: 'Desc',
    usp: '',
    price: '$100/pax',
    region: 'north',
    status: 'active',
    ...partial,
  };
}

test('isProductActive treats missing status as active', () => {
  assert.equal(isProductActive(product({ code: 'A', name: 'A' })), true);
  assert.equal(isProductActive(product({ code: 'B', name: 'B', status: 'draft' })), false);
  assert.equal(isProductActive(product({ code: 'C', name: 'C', status: 'archived' })), false);
});

test('durToModuleKey maps duration strings', () => {
  assert.equal(durToModuleKey('Half Day'), '0.5');
  assert.equal(durToModuleKey('Evening'), '0.5');
  assert.equal(durToModuleKey('Full Day'), '1');
  assert.equal(durToModuleKey('2 Days 1 Night'), '2');
  assert.equal(durToModuleKey('3D2N'), '3');
  assert.equal(durToModuleKey('4 Days 3 Nights'), '4');
  assert.equal(durToModuleKey('Service only'), null);
  assert.equal(durToModuleKey(''), null);
});

test('moduleKeyToDur returns product duration labels', () => {
  assert.equal(moduleKeyToDur('0.5'), 'Half Day');
  assert.equal(moduleKeyToDur('2'), '2 Days 1 Night');
});

test('filterProductsForModules keeps active regional tours with known duration', () => {
  const products = [
    product({ code: 'N1', name: 'Hanoi Food', region: 'north', dur: 'Half Day' }),
    product({ code: 'N2', name: 'Draft', region: 'north', dur: 'Full Day', status: 'draft' }),
    product({ code: 'X1', name: 'Service', region: 'north', dur: 'Service' }),
    product({ code: 'S1', name: 'Mekong', region: 'south', dur: 'Full Day', desc: 'Delta cruise' }),
    product({ code: 'Z1', name: 'Other', region: 'other' as Product['region'], dur: 'Full Day' }),
  ];
  const all = filterProductsForModules(products, '');
  assert.equal(all.length, 2);
  assert.deepEqual(
    all.map((p) => p.code).sort(),
    ['N1', 'S1']
  );
  const q = filterProductsForModules(products, 'delta');
  assert.equal(q.length, 1);
  assert.equal(q[0].code, 'S1');
});

test('groupProductsForModules nests by region and duration key', () => {
  const products = [
    product({ code: 'N1', name: 'A', region: 'north', dur: 'Half Day' }),
    product({ code: 'N2', name: 'B', region: 'north', dur: 'Full Day' }),
    product({ code: 'C1', name: 'C', region: 'central', dur: '2 Days 1 Night' }),
  ];
  const grouped = groupProductsForModules(products);
  assert.equal(grouped.north['0.5']?.length, 1);
  assert.equal(grouped.north['1']?.length, 1);
  assert.equal(grouped.central['2']?.length, 1);
  assert.equal(countModulesProducts(grouped), 3);
});

test('getModulePriceRange uses sell tiers when pricing exists', () => {
  useStore.setState({
    productPricing: [
      {
        productCode: 'N1',
        stdCost: 10,
        p1: 100,
        p2: 80,
        p3: 70,
        p4: 60,
        p5: 50,
        p6: 45,
        p7: 40,
        p8: 35,
        p9: 30,
        p10: 25,
        c1: 50,
        c2: 40,
        c3: 35,
        c4: 30,
        c5: 25,
        c6: 22,
        c7: 20,
        c8: 18,
        c9: 16,
        c10: 15,
        incl: { g: true, tr: true, tk: false, w: true, m: false },
      },
    ],
  });
  assert.equal(getModulePriceRange('N1'), '$25–$100/pax');
  assert.equal(getModulePriceRange('MISSING', '$99/pax'), '$99/pax');
  assert.equal(getModulePriceRange('MISSING'), '—');
});

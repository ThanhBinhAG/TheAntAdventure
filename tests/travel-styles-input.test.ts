import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceTravelStylesBodySchema } from '@/lib/customers/travel-styles';

test('accepts a managed Travel Style list with active and inactive entries', () => {
  const result = replaceTravelStylesBodySchema.safeParse({
    styles: [
      { code: 'luxury', label: 'Luxury', sortOrder: 10, isActive: true },
      { code: 'wellness', label: 'Wellness', sortOrder: 20, isActive: false },
    ],
  });

  assert.equal(result.success, true);
});

test('rejects empty labels, duplicate codes, and an empty catalog', () => {
  for (const styles of [
    [],
    [{ code: 'luxury', label: ' ', sortOrder: 10, isActive: true }],
    [
      { code: 'luxury', label: 'Luxury', sortOrder: 10, isActive: true },
      { code: 'luxury', label: 'Premium Luxury', sortOrder: 20, isActive: true },
    ],
  ]) {
    assert.equal(replaceTravelStylesBodySchema.safeParse({ styles }).success, false);
  }
});

test('requires at least one active Travel Style for the Customer form', () => {
  assert.equal(replaceTravelStylesBodySchema.safeParse({
    styles: [{ code: 'luxury', label: 'Luxury', sortOrder: 10, isActive: false }],
  }).success, false);
});

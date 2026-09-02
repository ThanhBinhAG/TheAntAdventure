import assert from 'node:assert/strict';
import test from 'node:test';
import { collectActiveHotelTiers, normalizeHotelTier, SUGGESTED_HOTEL_TIERS } from '@/lib/suppliers/hotel-tiers';

test('keeps quick Hotel Tier choices to star ratings only', () => {
  assert.deepEqual(SUGGESTED_HOTEL_TIERS, ['3★', '4★', '5★']);
});

test('preserves the Hotel Tier wording and star notation entered by the user', () => {
  assert.equal(normalizeHotelTier('  ★★★  '), '★★★');
  assert.equal(normalizeHotelTier('4 star'), '4 star');
  assert.equal(normalizeHotelTier('boutique 4 stars'), 'boutique 4 stars');
});

test('collects unique alphabetical tiers from active hotels only', () => {
  assert.deepEqual(collectActiveHotelTiers([
    { stars: 'Luxury 5★', status: 'Active' },
    { stars: '4★', status: 'Active' },
    { stars: '4★', status: 'Active' },
    { stars: '3★', status: 'Inactive' },
  ]), ['4★', 'Luxury 5★']);
});

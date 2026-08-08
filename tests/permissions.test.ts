import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  canReadPage,
  canWritePage,
  PAGE_READ_PERMISSION,
  PAGE_WRITE_PERMISSION,
} from '../lib/auth/permissions';

describe('permissions checks', () => {
  it('allows wildcard (*) to read and write any page', () => {
    const codes = new Set(['*']);
    assert.strictEqual(canReadPage(codes, 'bookings'), true);
    assert.strictEqual(canWritePage(codes, 'bookings'), true);
    assert.strictEqual(canReadPage(codes, 'dashboard'), true);
    assert.strictEqual(canWritePage(codes, 'dashboard'), true);
  });

  it('restricts access to specific permissions', () => {
    const codes = new Set(['bookings.read', 'contracts.write']);

    // Bookings
    assert.strictEqual(canReadPage(codes, 'bookings'), true);
    assert.strictEqual(canWritePage(codes, 'bookings'), false);

    // Contracts
    assert.strictEqual(canReadPage(codes, 'contracts'), false);
    assert.strictEqual(canWritePage(codes, 'contracts'), true); // write is check separately, but typically read is also needed

    // Dashboard
    assert.strictEqual(canReadPage(codes, 'dashboard'), false);
  });

  it('maps page slugs to correct read and write permission codes', () => {
    assert.strictEqual(PAGE_READ_PERMISSION.bookings, 'bookings.read');
    assert.strictEqual(PAGE_WRITE_PERMISSION.bookings, 'bookings.write');
    assert.strictEqual(PAGE_READ_PERMISSION.tourdesign, 'tour_design.read');
    assert.strictEqual(PAGE_WRITE_PERMISSION.tourdesign, 'tour_design.write');
  });
});

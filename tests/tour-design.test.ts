import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDayGroups, parseDuration } from '../lib/tour-itinerary';
import { productPhotoSlotStatus } from '../lib/gallery-helpers';
import { resolveProductPhotos } from '../lib/tour-photos';
import type { Product } from '../lib/types';

const halfDay: Product = {
  code: 'A',
  name: 'Half',
  logic: '',
  dur: 'Half Day',
  cat: 'Cultural',
  dest: 'Hanoi',
  lvl: '',
  desc: 'desc',
  usp: '',
  price: '',
  region: 'north',
};

const fullDay: Product = {
  ...halfDay,
  code: 'B',
  name: 'Full',
  dur: 'Full Day',
};

describe('tour-itinerary', () => {
  it('parseDuration half day', () => {
    assert.equal(parseDuration('Half Day'), 0.5);
  });

  it('pairs two half days on one day', () => {
    const days = buildDayGroups([halfDay, { ...halfDay, code: 'A2' }]);
    assert.equal(days.length, 1);
    assert.equal(days[0].items.length, 2);
  });

  it('full day gets own day', () => {
    const days = buildDayGroups([fullDay]);
    assert.equal(days.length, 1);
    assert.equal(days[0].items[0].code, 'B');
  });
});

describe('tour-photos', () => {
  it('prefers gallery photos over fallback', () => {
    const photos = resolveProductPhotos(
      halfDay,
      [{ id: 'P1', caption: 'Gallery', region: 'north', product: 'A', url: 'https://example.com/1.jpg' }],
      2
    );
    assert.equal(photos[0].url, 'https://example.com/1.jpg');
    assert.equal(photos.length, 2);
  });

  it('uses two gallery photos when both linked to product', () => {
    const photos = resolveProductPhotos(
      halfDay,
      [
        { id: 'P1', caption: 'Gallery 1', region: 'north', product: 'A', url: 'https://example.com/1.jpg' },
        { id: 'P2', caption: 'Gallery 2', region: 'north', product: 'A', url: 'https://example.com/2.jpg' },
      ],
      2
    );
    assert.equal(photos[0].url, 'https://example.com/1.jpg');
    assert.equal(photos[1].url, 'https://example.com/2.jpg');
    assert.equal(photos.length, 2);
  });
});

describe('gallery-helpers', () => {
  it('productPhotoSlotStatus counts linked photos', () => {
    const all = [
      { id: 'P1', caption: 'A', region: 'north', product: 'CODE', url: 'https://a.jpg' },
      { id: 'P2', caption: 'B', region: 'north', product: 'CODE', url: 'https://b.jpg' },
    ];
    const status = productPhotoSlotStatus(all, 'CODE');
    assert.equal(status.linked, 2);
    assert.equal(status.complete, true);
  });
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  foldSearchCompact,
  foldSearchText,
  matchesFoldedQuery,
  photoMatchesSearchQuery,
} from '../lib/gallery/fold-search';

test('foldSearchText strips Vietnamese diacritics', () => {
  assert.equal(foldSearchText('Cần Thơ'), 'can tho');
  assert.equal(foldSearchText('Đà Nẵng'), 'da nang');
});

test('foldSearchCompact collapses spaces', () => {
  assert.equal(foldSearchCompact('Can Tho'), 'cantho');
  assert.equal(foldSearchCompact('CanTho'), 'cantho');
  assert.equal(foldSearchCompact('Cần Thơ'), 'cantho');
});

test('matchesFoldedQuery accepts Can Tho / Cần Thơ / CanTho', () => {
  const hay = 'Mekong Delta boat · Can Tho market';
  assert.ok(matchesFoldedQuery(hay, 'Can Tho'));
  assert.ok(matchesFoldedQuery(hay, 'Cần Thơ'));
  assert.ok(matchesFoldedQuery(hay, 'CanTho'));
  assert.ok(matchesFoldedQuery(hay, 'cantho'));
  assert.equal(matchesFoldedQuery(hay, 'Ha Giang'), false);
});

test('photoMatchesSearchQuery uses caption and tags', () => {
  const photo = { id: 'PH-001', caption: 'Sunset', tags: ['Cần Thơ', 'Mekong Delta'] };
  assert.ok(photoMatchesSearchQuery(photo, 'CanTho'));
  assert.ok(photoMatchesSearchQuery(photo, 'mekong'));
  assert.ok(photoMatchesSearchQuery(photo, 'PH-001'));
  assert.equal(photoMatchesSearchQuery(photo, 'Hanoi'), false);
});

test('empty query matches everything', () => {
  assert.ok(matchesFoldedQuery('anything', ''));
  assert.ok(matchesFoldedQuery('anything', '   '));
});

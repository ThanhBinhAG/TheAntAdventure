import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ALL_GALLERY_TAXONOMY_TAGS,
  EMPTY_GALLERY_PHOTO_FORM,
  GALLERY_TAG_TAXONOMY,
} from '../lib/gallery-tags';

test('GALLERY_TAG_TAXONOMY has expected categories', () => {
  assert.ok(GALLERY_TAG_TAXONOMY.REGION.includes('Hanoi'));
  assert.ok(GALLERY_TAG_TAXONOMY['TOUR TYPE'].includes('Cultural'));
  assert.ok(GALLERY_TAG_TAXONOMY.SEASON.length >= 3);
  assert.ok(GALLERY_TAG_TAXONOMY.OTHER.includes('Marketing Use OK'));
});

test('ALL_GALLERY_TAXONOMY_TAGS flattens every category without duplicates', () => {
  const fromCats = [
    ...GALLERY_TAG_TAXONOMY.REGION,
    ...GALLERY_TAG_TAXONOMY['TOUR TYPE'],
    ...GALLERY_TAG_TAXONOMY.SEASON,
    ...GALLERY_TAG_TAXONOMY.OTHER,
  ];
  assert.equal(ALL_GALLERY_TAXONOMY_TAGS.length, fromCats.length);
  assert.equal(new Set(ALL_GALLERY_TAXONOMY_TAGS).size, ALL_GALLERY_TAXONOMY_TAGS.length);
});

test('EMPTY_GALLERY_PHOTO_FORM defaults', () => {
  assert.equal(EMPTY_GALLERY_PHOTO_FORM.region, 'north');
  assert.equal(EMPTY_GALLERY_PHOTO_FORM.product, '');
  assert.deepEqual(EMPTY_GALLERY_PHOTO_FORM.tags, []);
  assert.equal(EMPTY_GALLERY_PHOTO_FORM.file, null);
});

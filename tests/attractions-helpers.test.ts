import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatHoursCompact,
  formatHoursSingleLine,
  galleryUrlForAttraction,
  getAttractionHighlight,
  getNonDuplicateAlert,
  nextAttractionId,
  photosForAttraction,
  photosLinkedToAttraction,
  truncateCell,
} from '../lib/attractions/attractions-helpers';
import type { Attraction } from '../lib/types';
import type { GalleryPhoto } from '../lib/tour-design/tour-design-types';

function attraction(partial: Partial<Attraction> & Pick<Attraction, 'id' | 'region' | 'name'>): Attraction {
  return {
    type: 'museum',
    dest: 'Hanoi',
    hours: '',
    closed: 'None',
    admission: '',
    duration: 60,
    best_time: '',
    crowd: '',
    book_req: false,
    seasonal: '',
    notes: '',
    alert: '',
    phone: '',
    photoIds: [],
    linkedPhotoIds: [],
    ...partial,
  };
}

test('formatHoursCompact abbreviates weekdays and splits segments', () => {
  assert.deepEqual(formatHoursCompact(''), ['—']);
  assert.deepEqual(formatHoursCompact('Monday–Friday 8–17; Saturday 9–12'), [
    'Mon–Fri 8–17',
    'Sat 9–12',
  ]);
  assert.equal(formatHoursSingleLine('Monday 9–17|Tuesday closed'), 'Mon 9–17 · Tue closed');
});

test('getNonDuplicateAlert suppresses redundant closure copy', () => {
  assert.equal(getNonDuplicateAlert('', 'Monday'), null);
  assert.equal(getNonDuplicateAlert('Open daily', 'None'), null);
  assert.equal(getNonDuplicateAlert('Closed Mondays', 'Mondays'), null);
  assert.equal(getNonDuplicateAlert('Book ahead for weekends', 'None'), 'Book ahead for weekends');
});

test('truncateCell ellipsizes long text', () => {
  assert.equal(truncateCell('short'), 'short');
  assert.equal(truncateCell('x'.repeat(50), 10).endsWith('…'), true);
  assert.equal(truncateCell('x'.repeat(50), 10).length, 10);
});

test('getAttractionHighlight flags closed-today and warnings', () => {
  assert.equal(getAttractionHighlight({ closed: 'Mon', alert: '' }, 'Monday'), 'closed-today');
  assert.equal(getAttractionHighlight({ closed: 'None', alert: 'CLOSED for renovation' }, 'Tue'), 'warning');
  assert.equal(getAttractionHighlight({ closed: 'None', alert: 'Book tickets' }, 'Wed'), 'warning');
  assert.equal(getAttractionHighlight({ closed: 'None', alert: '' }, 'Thu'), null);
});

test('galleryUrlForAttraction builds query string', () => {
  assert.equal(
    galleryUrlForAttraction('ATT-N-001'),
    '/gallery?attraction=ATT-N-001'
  );
  assert.equal(
    galleryUrlForAttraction('ATT-N-001', 'Temple', 'PH-1'),
    '/gallery?attraction=ATT-N-001&photo=PH-1'
  );
});

test('photosForAttraction and photosLinkedToAttraction resolve by id', () => {
  const photos: GalleryPhoto[] = [
    { id: 'P1', caption: 'One', region: 'north', url: 'https://a/1.jpg' },
    { id: 'P2', caption: 'Two', region: 'north', url: 'https://a/2.jpg' },
    { id: 'P3', caption: 'Thumb', region: 'north', thumbUrl: 'https://a/3.jpg' },
  ];
  const att = attraction({
    id: 'ATT-N-001',
    region: 'north',
    name: 'Museum',
    photoIds: ['P1', 'P2'],
    linkedPhotoIds: ['P2', 'P3'],
  });
  assert.deepEqual(
    photosForAttraction(photos, att).map((p) => p.id),
    ['P1', 'P2']
  );
  assert.deepEqual(
    photosLinkedToAttraction(photos, att).map((p) => p.id),
    ['P2', 'P3']
  );
});

test('nextAttractionId increments per region prefix', () => {
  const existing = [
    attraction({ id: 'ATT-N-001', region: 'north', name: 'A' }),
    attraction({ id: 'ATT-N-003', region: 'north', name: 'B' }),
  ];
  assert.equal(nextAttractionId(existing, 'north'), 'ATT-N-004');
  assert.equal(nextAttractionId([], 'central'), 'ATT-C-001');
  assert.equal(nextAttractionId([], 'south'), 'ATT-S-001');
});

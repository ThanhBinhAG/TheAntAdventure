import assert from 'node:assert/strict';
import test from 'node:test';
import {
  nextFeaturedAfterLink,
  nextSelectionAfterLinkToggle,
} from '../lib/gallery/photo-link-selection';

test('nextFeaturedAfterLink fills empty slots up to max', () => {
  assert.deepEqual(nextFeaturedAfterLink([], 'A', 2), ['A']);
  assert.deepEqual(nextFeaturedAfterLink(['A'], 'B', 2), ['A', 'B']);
  assert.deepEqual(nextFeaturedAfterLink(['A', 'B'], 'C', 2), ['A', 'B']);
  assert.deepEqual(nextFeaturedAfterLink(['A'], 'A', 2), ['A']);
});

test('nextSelectionAfterLinkToggle links and auto-features', () => {
  const first = nextSelectionAfterLinkToggle([], [], 'P1', 2);
  assert.deepEqual(first.linked, ['P1']);
  assert.deepEqual(first.featured, ['P1']);

  const second = nextSelectionAfterLinkToggle(first.linked, first.featured, 'P2', 2);
  assert.deepEqual(second.linked, ['P1', 'P2']);
  assert.deepEqual(second.featured, ['P1', 'P2']);

  const third = nextSelectionAfterLinkToggle(second.linked, second.featured, 'P3', 2);
  assert.deepEqual(third.linked, ['P1', 'P2', 'P3']);
  assert.deepEqual(third.featured, ['P1', 'P2']);
});

test('nextSelectionAfterLinkToggle unlinks and drops featured', () => {
  const next = nextSelectionAfterLinkToggle(['P1', 'P2'], ['P1', 'P2'], 'P1', 2);
  assert.deepEqual(next.linked, ['P2']);
  assert.deepEqual(next.featured, ['P2']);
});

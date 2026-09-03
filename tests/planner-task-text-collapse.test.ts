import assert from 'node:assert/strict';
import test from 'node:test';
import { isTaskTextCollapsible } from '../lib/planner/planner-task-utils';

test('isTaskTextCollapsible detects long or multi-line notes', () => {
  assert.equal(isTaskTextCollapsible('Short'), false);
  assert.equal(isTaskTextCollapsible('a\nb\nc\nd'), true);
  assert.equal(isTaskTextCollapsible('x'.repeat(161)), true);
});

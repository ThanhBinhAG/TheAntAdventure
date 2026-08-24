import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Planner disables every task mutation control for read-only users', () => {
  const planner = source('components/pages/Planner.tsx');
  const completedPanel = source('components/planner/CompletedTasksPanel.tsx');

  assert.match(planner, /if \(!canWrite\) \{\s+toast\.warning\('Bạn không có quyền chỉnh sửa Planner\.'/);
  assert.match(planner, /placeholder="Add today's tasks\.\.\."[\s\S]*?disabled=\{!canWrite\}/);
  assert.match(planner, /disabled=\{!noteText\.trim\(\) \|\| !canWrite\}/);
  assert.match(planner, /<TaskStatusSelect value=\{newTaskStatus\}[\s\S]*?disabled=\{!canWrite\}/);
  assert.match(planner, /<CompletedTasksPanel tasks=\{allTasks\} onStatusChange=\{changeTaskStatus\} canWrite=\{canWrite\}/);
  assert.match(completedPanel, /canWrite: boolean/);
  assert.match(completedPanel, /disabled=\{!canWrite\}/);
});

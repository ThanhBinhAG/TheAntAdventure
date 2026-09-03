import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

function source(path: string): string {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

test('Planner disables every task mutation control for read-only users', () => {
  const planner = source('components/planner/PlannerPage.tsx');
  const todayRow = source('components/planner/TodayTaskRow.tsx');
  const completedPanel = source('components/planner/CompletedTasksPanel.tsx');
  const taskModal = source('components/planner/TaskModal.tsx');

  assert.match(planner, /toast\.warning\(tp\('planner', 'noPermission'\)\)/);
  assert.match(planner, /placeholder=\{tp\('planner', 'notePlaceholder'\)\}[\s\S]*?disabled=\{!canWrite\}/);
  assert.match(planner, /disabled=\{!noteText\.trim\(\) \|\| !canWrite\}/);
  assert.match(planner, /<TaskStatusSelect value=\{newTaskStatus\}[\s\S]*?disabled=\{!canWrite\}/);
  assert.match(
    planner,
    /<CompletedTasksPanel[\s\S]*?onStatusChange=\{changeTaskStatus\}[\s\S]*?canWrite=\{canWrite\}/,
  );
  assert.match(planner, /<TaskModal/);
  assert.match(todayRow, /canWrite && \(/);
  assert.match(todayRow, /disabled=\{!canWrite\}/);
  assert.match(completedPanel, /canWrite: boolean/);
  assert.match(completedPanel, /disabled=\{!canWrite\}/);
  assert.match(completedPanel, /canWrite && \(/);
  assert.match(taskModal, /overlay open/);
  assert.match(taskModal, /onClick=\{\(\) => void requestClose\(\)\}/);
});

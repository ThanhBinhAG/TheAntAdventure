import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNoteTask, deriveTaskTitle, getTaskDisplayText, isTaskComplete, rolloverTasks, truncateTaskText } from '../lib/planner/planner-task-utils';

test('deriveTaskTitle uses first line and truncates long text', () => {
  const long = 'a'.repeat(100);
  assert.equal(deriveTaskTitle(`${long}\nsecond line`), `${'a'.repeat(79)}…`);
});

test('deriveTaskTitle falls back when empty', () => {
  assert.equal(deriveTaskTitle('   \n  '), 'Untitled task');
});

test('buildNoteTask maps note fields for today', () => {
  const task = buildNoteTask('Call client\nFollow up quote', '2026-06-28', 'inprogress');
  assert.equal(task.title, 'Call client');
  assert.equal(task.notes, 'Call client\nFollow up quote');
  assert.equal(task.date, '2026-06-28');
  assert.equal(task.status, 'inprogress');
  assert.equal(task.dept, 'General');
  assert.match(task.id ?? '', /^TK-/);
});

test('rolloverTasks moves incomplete past tasks to today', () => {
  const { tasks, changed } = rolloverTasks(
    [
      { id: 'TK-1', notes: 'Old task', date: '2026-06-26', status: 'todo' },
      { id: 'TK-2', notes: 'Done task', date: '2026-06-26', status: 'done' },
    ],
    '2026-06-28'
  );
  assert.equal(changed, true);
  assert.equal(tasks[0]?.date, '2026-06-28');
  assert.equal(tasks[1]?.date, '2026-06-26');
});

test('isTaskComplete only treats done as complete', () => {
  assert.equal(isTaskComplete('done'), true);
  assert.equal(isTaskComplete('inprogress'), false);
});

test('getTaskDisplayText prefers notes over title', () => {
  assert.equal(getTaskDisplayText({ notes: 'Full note', title: 'Short' }), 'Full note');
  assert.equal(getTaskDisplayText({ title: 'Legacy title' }), 'Legacy title');
});

test('truncateTaskText shortens long strings', () => {
  assert.equal(truncateTaskText('hello world', 5), 'hell…');
});

import type { Task } from '@/lib/types';
import { daysAgoIso } from '../core/date-utils';

const TITLE_MAX = 80;

export const TASK_STATUSES = [
  { value: 'todo', label: 'Not started' },
  { value: 'inprogress', label: 'In progress' },
  { value: 'review', label: 'Needs review' },
  { value: 'done', label: 'Completed' },
] as const;

export type TaskStatusValue = (typeof TASK_STATUSES)[number]['value'];

export function getTaskStatusLabel(status?: string): string {
  return TASK_STATUSES.find((s) => s.value === status)?.label ?? 'Not started';
}

export function isTaskComplete(status?: string): boolean {
  return status === 'done';
}

export function countActiveTasks(tasks: Task[]): number {
  return tasks.filter((t) => !isTaskComplete(t.status)).length;
}

export function getCompletedTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => isTaskComplete(t.status));
}

export const COMPLETED_TIME_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 days ago' },
  { value: '30d', label: '30 days ago' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Select date' },
] as const;

export type CompletedTimeFilter = (typeof COMPLETED_TIME_FILTERS)[number]['value'];

export interface CustomDateRange {
  from: string;
  to: string;
}

function daysBefore(today: string, days: number): string {
  return daysAgoIso(today, days);
}

export function taskMatchesTimeFilter(
  task: Task,
  filter: CompletedTimeFilter,
  today: string,
  customRange?: CustomDateRange
): boolean {
  if (filter === 'all') return true;
  const date = task.date;
  if (!date) return false;

  if (filter === 'custom') {
    if (!customRange?.from || !customRange?.to) return false;
    const from = customRange.from <= customRange.to ? customRange.from : customRange.to;
    const to = customRange.from <= customRange.to ? customRange.to : customRange.from;
    return date >= from && date <= to;
  }

  if (filter === 'today') return date === today;
  if (filter === '7d') return date >= daysBefore(today, 6) && date <= today;
  if (filter === '30d') return date >= daysBefore(today, 29) && date <= today;

  if (filter === 'month') {
    const [y, m] = today.split('-');
    return date.startsWith(`${y}-${m}`);
  }

  return true;
}

export function filterCompletedTasksByTime(
  tasks: Task[],
  filter: CompletedTimeFilter,
  today: string,
  customRange?: CustomDateRange
): Task[] {
  return tasks.filter((t) => taskMatchesTimeFilter(t, filter, today, customRange));
}

export function deriveTaskTitle(notes: string): string {
  const firstLine = notes.trim().split('\n')[0]?.trim() ?? '';
  if (!firstLine) return 'Untitled task';
  return firstLine.length > TITLE_MAX ? `${firstLine.slice(0, TITLE_MAX - 1)}…` : firstLine;
}

export function getTaskDisplayText(task: Task): string {
  return task.notes?.trim() || task.title?.trim() || 'Untitled task';
}

export function truncateTaskText(text: string, max = 40): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function buildNoteTask(notes: string, today: string, status: TaskStatusValue = 'todo'): Task {
  const trimmed = notes.trim();
  return {
    id: `TK-${Date.now()}`,
    title: deriveTaskTitle(trimmed),
    notes: trimmed,
    date: today,
    status,
    priority: 'medium',
    dept: 'General',
  };
}

export function rolloverTasks(tasks: Task[], today: string): { tasks: Task[]; changed: boolean } {
  let changed = false;
  const next = tasks.map((t) => {
    if (!isTaskComplete(t.status) && t.date && t.date < today) {
      changed = true;
      return { ...t, date: today };
    }
    return t;
  });
  return { tasks: next, changed };
}

'use client';

import { useMemo, useState } from 'react';
import {
  COMPLETED_TIME_FILTERS,
  filterCompletedTasksByTime,
  getCompletedTasks,
  getTaskDisplayText,
  getTaskStatusLabel,
  TASK_STATUSES,
  type CompletedTimeFilter,
  type CustomDateRange,
  type TaskStatusValue,
} from '@/lib/planner/planner-task-utils';
import type { Task } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import { localTodayIso } from '@/lib/core/date-utils';

function TaskStatusSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (status: TaskStatusValue) => void;
}) {
  return (
    <select
      className="planner-status-select planner-status-select-sm"
      value={value || 'todo'}
      onChange={(e) => onChange(e.target.value as TaskStatusValue)}
      aria-label="Task progress"
    >
      {TASK_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

function formatGroupDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function taskMatchesSearch(task: Task, query: string): boolean {
  const q = query.toLowerCase();
  const haystack = [
    getTaskDisplayText(task),
    task.assignee,
    task.dept,
    task.title,
    getTaskStatusLabel(task.status),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface CompletedTasksPanelProps {
  tasks: Task[];
  onStatusChange: (id: string, status: TaskStatusValue) => void;
}

export default function CompletedTasksPanel({ tasks, onStatusChange }: CompletedTasksPanelProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<CompletedTimeFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const today = localTodayIso();
  const customRange: CustomDateRange | undefined = useMemo(() => {
    if (!customFrom || !customTo) return undefined;
    return { from: customFrom, to: customTo };
  }, [customFrom, customTo]);

  const completedTasks = useMemo(() => getCompletedTasks(tasks), [tasks]);

  const timeFilteredTasks = useMemo(
    () => filterCompletedTasksByTime(completedTasks, timeFilter, today, customRange),
    [completedTasks, timeFilter, today, customRange]
  );

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return timeFilteredTasks;
    return timeFilteredTasks.filter((t) => taskMatchesSearch(t, search.trim()));
  }, [timeFilteredTasks, search]);

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Task[]>();
    for (const task of filteredTasks) {
      const key = task.date || 'unknown';
      const list = groups.get(key) ?? [];
      list.push(task);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === 'unknown') return 1;
      if (b === 'unknown') return -1;
      return b.localeCompare(a);
    });
  }, [filteredTasks]);

  return (
    <div className="planner-completed-wrap">
      <button
        type="button"
        className="planner-completed-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          📁 Completed tasks ({completedTasks.length})
        </span>
        <span className="planner-completed-chevron">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="planner-completed-panel">
          <input
            type="search"
            className="planner-completed-search"
            placeholder="🔍 Search tasks, assignees, departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="planner-completed-filters" role="group" aria-label="Filter by time">
            {COMPLETED_TIME_FILTERS.map((f) => {
              const count =
                f.value === 'custom'
                  ? customRange
                    ? filterCompletedTasksByTime(completedTasks, 'custom', today, customRange).length
                    : 0
                  : filterCompletedTasksByTime(completedTasks, f.value, today).length;
              return (
                <button
                  key={f.value}
                  type="button"
                  className={`planner-completed-filter-btn${timeFilter === f.value ? ' on' : ''}`}
                  onClick={() => {
                    setTimeFilter(f.value);
                    if (f.value === 'custom' && !customFrom && !customTo) {
                      setCustomFrom(today);
                      setCustomTo(today);
                    }
                  }}
                >
                  {f.label}
                  {count > 0 && f.value !== 'custom' && (
                    <span className="planner-completed-filter-count">{count}</span>
                  )}
                  {f.value === 'custom' && customRange && count > 0 && (
                    <span className="planner-completed-filter-count">{count}</span>
                  )}
                </button>
              );
            })}
          </div>

          {timeFilter === 'custom' && (
            <div className="planner-completed-custom-range">
              <label className="planner-completed-date-field">
                <span>From date</span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label className="planner-completed-date-field">
                <span>To date</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom || undefined}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          )}

          {timeFilter !== 'all' && (
            <div className="planner-completed-filter-summary">
              {timeFilter === 'custom' && customRange ? (
                <>
                  Display {filteredTasks.length} / {completedTasks.length} tasks
                  {' · '}
                  {formatShortDate(customRange.from)} – {formatShortDate(customRange.to)}
                </>
              ) : (
                <>Display {filteredTasks.length} / {completedTasks.length} tasks</>
              )}
            </div>
          )}

          {filteredTasks.length === 0 ? (
            <EmptyState
              className="crm-empty-state--flush"
              size="compact"
              variant="tasks"
              title={
                completedTasks.length === 0
                  ? 'No completed tasks'
                  : timeFilter !== 'all' && !search.trim()
                    ? timeFilter === 'custom' && (!customFrom || !customTo)
                      ? 'Select a date range to view tasks'
                      : 'No tasks in this range'
                    : 'No tasks found'
              }
              description={
                completedTasks.length === 0
                  ? 'Complete tasks on the Daily Planner to appear here.'
                  : 'Try changing the time filter or search keywords.'
              }
            />
          ) : (
            groupedByDate.map(([date, dateTasks]) => (
              <div key={date} className="planner-completed-group">
                <div className="planner-completed-group-hd">
                  {date === 'unknown' ? 'No date' : formatGroupDate(date)}
                </div>
                {dateTasks.map((t, i) => (
                  <div
                    key={t.id || i}
                    className={`planner-completed-item planner-priority-${t.priority || 'medium'}`}
                  >
                    <div className="planner-completed-item-text">{getTaskDisplayText(t)}</div>
                    <div className="planner-completed-item-footer">
                      <div className="planner-completed-meta">
                        <span className="planner-completed-status-pill">
                          {getTaskStatusLabel(t.status)}
                        </span>
                        {t.assignee && <span>{t.assignee}</span>}
                        {t.dept && <span>{t.dept}</span>}
                      </div>
                      {t.id && (
                        <TaskStatusSelect
                          value={t.status || 'done'}
                          onChange={(s) => onStatusChange(t.id!, s)}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

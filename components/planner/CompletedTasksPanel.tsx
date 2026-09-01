'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  COMPLETED_TIME_FILTERS,
  filterCompletedTasksByTime,
  getCompletedTasks,
  getTaskDisplayText,
  TASK_STATUSES,
  type CompletedTimeFilter,
  type CustomDateRange,
  type TaskStatusValue,
} from '@/lib/planner/planner-task-utils';
import type { Task } from '@/lib/types';
import EmptyState from '@/components/EmptyState';
import { localTodayIso } from '@/lib/core/date-utils';
import { useLanguage } from '@/hooks/useLanguage';
import { PLANNER_STATUS_KEYS, PLANNER_TIME_FILTER_KEYS } from '@/lib/i18n/pages/planner';

function TaskStatusSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (status: TaskStatusValue) => void;
  disabled?: boolean;
}) {
  const { tp } = useLanguage();

  return (
    <select
      className="planner-status-select planner-status-select-sm"
      value={value || 'todo'}
      onChange={(e) => onChange(e.target.value as TaskStatusValue)}
      aria-label={tp('planner', 'taskProgressAria')}
      disabled={disabled}
      title={disabled ? tp('planner', 'readOnlyUpdate') : undefined}
    >
      {TASK_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {tp('planner', PLANNER_STATUS_KEYS[s.value] || 'statusTodo')}
        </option>
      ))}
    </select>
  );
}

function formatGroupDate(dateStr: string, locale: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function taskMatchesSearch(task: Task, query: string, statusLabel: string): boolean {
  const q = query.toLowerCase();
  const haystack = [
    getTaskDisplayText(task),
    task.assignee,
    task.dept,
    task.title,
    statusLabel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function formatShortDate(dateStr: string, locale: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface CompletedTasksPanelProps {
  tasks: Task[];
  onStatusChange: (id: string, status: TaskStatusValue) => void;
  canWrite: boolean;
}

export default function CompletedTasksPanel({ tasks, onStatusChange, canWrite }: CompletedTasksPanelProps) {
  const { tp, tpl, language } = useLanguage();
  const dateLocale = language === 'vi' ? 'vi-VN' : 'en-US';
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [timeFilter, setTimeFilter] = useState<CompletedTimeFilter>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const taskStatusLabel = useCallback(
    (status?: string) => tp('planner', PLANNER_STATUS_KEYS[status || 'done'] || 'statusDone'),
    [tp],
  );

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
    return timeFilteredTasks.filter((t) => taskMatchesSearch(t, search.trim(), taskStatusLabel(t.status)));
  }, [timeFilteredTasks, search, taskStatusLabel]);

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
          {tpl('planner', 'completedToggle', { count: completedTasks.length })}
        </span>
        <span className="planner-completed-chevron">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="planner-completed-panel">
          <input
            type="search"
            className="planner-completed-search"
            placeholder={tp('planner', 'completedSearchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="planner-completed-filters" role="group" aria-label={tp('planner', 'filterByTimeAria')}>
            {COMPLETED_TIME_FILTERS.map((f) => {
              const count =
                f.value === 'custom'
                  ? customRange
                    ? filterCompletedTasksByTime(completedTasks, 'custom', today, customRange).length
                    : 0
                  : filterCompletedTasksByTime(completedTasks, f.value, today).length;
              const labelKey = PLANNER_TIME_FILTER_KEYS[f.value] || 'filterAll';
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
                  {tp('planner', labelKey)}
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
                <span>{tp('planner', 'fromDate')}</span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo || undefined}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label className="planner-completed-date-field">
                <span>{tp('planner', 'toDate')}</span>
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
                  {tpl('planner', 'displayCount', { shown: filteredTasks.length, total: completedTasks.length })}
                  {' · '}
                  {formatShortDate(customRange.from, dateLocale)} – {formatShortDate(customRange.to, dateLocale)}
                </>
              ) : (
                <>{tpl('planner', 'displayCount', { shown: filteredTasks.length, total: completedTasks.length })}</>
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
                  ? tp('planner', 'noCompletedTasks')
                  : timeFilter !== 'all' && !search.trim()
                    ? timeFilter === 'custom' && (!customFrom || !customTo)
                      ? tp('planner', 'selectDateRange')
                      : tp('planner', 'noTasksInRange')
                    : tp('planner', 'noTasksFound')
              }
              description={
                completedTasks.length === 0
                  ? tp('planner', 'noCompletedDesc')
                  : tp('planner', 'tryChangeFilter')
              }
            />
          ) : (
            groupedByDate.map(([date, dateTasks]) => (
              <div key={date} className="planner-completed-group">
                <div className="planner-completed-group-hd">
                  {date === 'unknown' ? tp('planner', 'noDate') : formatGroupDate(date, dateLocale)}
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
                          {taskStatusLabel(t.status)}
                        </span>
                        {t.assignee && <span>{t.assignee}</span>}
                        {t.dept && <span>{t.dept}</span>}
                      </div>
                      {t.id && (
                        <TaskStatusSelect
                          value={t.status || 'done'}
                          onChange={(s) => onStatusChange(t.id!, s)}
                          disabled={!canWrite}
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

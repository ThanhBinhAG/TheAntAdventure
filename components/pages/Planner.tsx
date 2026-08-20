'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CompletedTasksPanel from '@/components/planner/CompletedTasksPanel';
import {
  buildNoteTask,
  getTaskDisplayText,
  getTaskStatusLabel,
  isTaskComplete,
  TASK_STATUSES,
  truncateTaskText,
  type TaskStatusValue,
} from '@/lib/planner/planner-task-utils';
import type { Task } from '@/lib/types';
import { addDays, localTodayIso, mondayOfWeek } from '@/lib/core/date-utils';
import { useStore } from '@/hooks/useStore';
import { usePagePermission } from '@/hooks/usePagePermission';
import { toast } from '@/lib/toast';
import { getBffArray } from '@/lib/bff/client';

const TEAM = ['Tai Pham', 'Linh N.', 'Minh T.', 'Huong L.', 'Khoa V.'];

function TaskStatusSelect({
  value,
  onChange,
  compact,
}: {
  value: string;
  onChange: (status: TaskStatusValue) => void;
  compact?: boolean;
}) {
  return (
    <select
      className={compact ? 'planner-status-select planner-status-select-sm' : 'planner-status-select'}
      value={value || 'todo'}
      onChange={(e) => onChange(e.target.value as TaskStatusValue)}
      aria-label="Tiến độ công việc"
    >
      {TASK_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export default function Planner() {
  const { canWrite } = usePagePermission('planner');
  const tasks = useStore((s) => s.tasks) as Task[];
  const addTask = useStore((s) => s.addTask);
  const setTasks = useStore((s) => s.setTasks);
  const updateTask = useStore((s) => s.updateTask);

  const [weekOffset, setWeekOffset] = useState(0);
  const [teamF, setTeamF] = useState('');
  const [plannerView, setPlannerView] = useState<'strip' | 'grid'>('strip');
  const [noteText, setNoteText] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatusValue>('todo');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const noteBoardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    void getBffArray<Task>('/api/planner/all', 'Không thể tải danh sách công việc.')
      .then((rows) => {
        if (active) setTasks(rows);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : 'Không thể tải danh sách công việc.');
      });
    return () => {
      active = false;
    };
  }, [setTasks]);

  const today = localTodayIso();
  const allTasks = tasks as Task[];

  const weekDays = useMemo(() => {
    const monday = addDays(mondayOfWeek(today), weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [today, weekOffset]);

  const weekStartLabel = weekDays[0];
  const weekLabel = `${new Date(weekStartLabel + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(weekDays[6] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const activeTasks = allTasks.filter((t) => !isTaskComplete(t.status));
  const todayTasks = activeTasks.filter((t) => t.date === today && (!teamF || t.assignee === teamF));
  const doneCount = allTasks.filter((t) => isTaskComplete(t.status)).length;
  const totalCount = allTasks.length;

  function focusNoteBoard() {
    noteBoardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    noteBoardRef.current?.querySelector('textarea')?.focus();
  }

  async function saveNoteTask() {
    if (!noteText.trim()) return;
    const newTask = buildNoteTask(noteText, today, newTaskStatus);
    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: newTask }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Không thể tạo task mới.');
      }
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error ?? 'Không thể tạo task mới.');
      }

      addTask(newTask as Record<string, unknown>);
      setNoteText('');
      setNewTaskStatus('todo');
      toast.success('Đã thêm công việc.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Thêm công việc thất bại.');
    }
  }

  async function changeTaskStatus(id: string, status: TaskStatusValue) {
    try {
      const res = await fetch('/api/planner', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, patch: { status } }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Không thể cập nhật trạng thái.');
      }
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error ?? 'Không thể cập nhật trạng thái.');
      }

      updateTask(id, { status });
      if (status === 'done' && expandedTaskId === id) setExpandedTaskId(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Cập nhật trạng thái thất bại.');
    }
  }

  function toggleTaskExpand(id: string | undefined) {
    if (!id) return;
    setExpandedTaskId((prev) => (prev === id ? null : id));
  }

  function renderTaskChip(t: Task, key: string | number) {
    const display = getTaskDisplayText(t);
    const preview = truncateTaskText(display);
    const isExpanded = expandedTaskId === t.id;

    return (
      <div key={key} className={`planner-task planner-priority-${t.priority || 'medium'}`}>
        <button
          type="button"
          className="planner-task-chip"
          onClick={() => toggleTaskExpand(t.id)}
          title={display}
        >
          {preview}
        </button>
        {isExpanded && (
          <div className="planner-task-expand">
            <div className="planner-task-expand-text">{display}</div>
            <div className="planner-task-expand-actions">
              <TaskStatusSelect value={t.status || 'todo'} onChange={(s) => t.id && changeTaskStatus(t.id, s)} compact />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {loadError && <div className="crm-page-hydrate-error" role="alert">{loadError}</div>}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: 'var(--m)', marginBottom: 12 }}>
        📆 Task Calendar & Team Planner
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="planner-nav">
          <button type="button" onClick={() => setWeekOffset((w) => w - 1)}>
            ‹
          </button>
          <span>{weekLabel}</span>
          <button type="button" onClick={() => setWeekOffset((w) => w + 1)}>
            ›
          </button>
        </div>
        <button className="btn btn-s btn-sm" type="button" onClick={() => setWeekOffset(0)}>
          Today
        </button>
        <div className="planner-view-toggle">
          <button type="button" className={plannerView === 'strip' ? 'on' : ''} onClick={() => setPlannerView('strip')}>
            ☷ Strip
          </button>
          <button type="button" className={plannerView === 'grid' ? 'on' : ''} onClick={() => setPlannerView('grid')}>
            ☷ Grid
          </button>
        </div>
        <select value={teamF} onChange={(e) => setTeamF(e.target.value)} style={{ padding: '6px 10px', border: '1px solid var(--b)', borderRadius: 7, fontSize: 12 }}>
          <option value="">All Team Members</option>
          {TEAM.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-p btn-sm"
          type="button"
          onClick={focusNoteBoard}
          disabled={!canWrite}
          title={!canWrite ? 'You need write permission for Planner to add a task' : undefined}
        >
          + Add Task
        </button>
      </div>

      {plannerView === 'strip' ? (
        <div className="planner-week-grid">
          {weekDays.map((day) => {
            const dayTasks = activeTasks.filter((t) => t.date === day && (!teamF || t.assignee === teamF));
            const isToday = day === today;
            return (
              <div key={day} className={`planner-day-col${isToday ? ' planner-day-today' : ''}`}>
                <div className="planner-day-hd">
                  {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                {dayTasks.map((t, i) => renderTaskChip(t, t.id || i))}
                {!dayTasks.length && <div style={{ fontSize: 10, color: 'var(--m)', padding: 4 }}>—</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="planner-team-grid">
          <table className="tbl">
            <thead>
              <tr>
                <th>Team Member</th>
                {weekDays.map((day) => (
                  <th key={day} style={{ fontSize: 10.5, textAlign: 'center' }}>
                    {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEAM.filter((m) => !teamF || m === teamF).map((member) => (
                <tr key={member}>
                  <td style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{member}</td>
                  {weekDays.map((day) => {
                    const dayTasks = activeTasks.filter((t) => t.date === day && t.assignee === member);
                    return (
                      <td key={day} className={`planner-grid-cell${day === today ? ' today' : ''}`}>
                        {dayTasks.map((t, i) => renderTaskChip(t, t.id || i))}
                        {!dayTasks.length && <span style={{ color: 'var(--m)', fontSize: 10 }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginTop: 16 }}>
        <div className="card">
          <div className="card-hd">
            <span className="card-title">📋 Today&apos;s Tasks</span>
            <span style={{ fontSize: 11, color: 'var(--m)' }}>{today}</span>
          </div>

          <div ref={noteBoardRef} className="planner-note-board">
            <textarea
              className="planner-note-textarea planner-note-textarea-inline"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add today's tasks..."
              rows={6}
            />
            <div className="planner-note-board-actions">
              <TaskStatusSelect value={newTaskStatus} onChange={setNewTaskStatus} />
              <button className="btn btn-p btn-sm" type="button" onClick={saveNoteTask} disabled={!noteText.trim()}>
                Add task
              </button>
            </div>
          </div>

          <div style={{ padding: 0 }}>
            {todayTasks.length ? (
              todayTasks.map((t, i) => (
                <div key={t.id || i} className="hub-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{getTaskDisplayText(t)}</div>
                    {t.assignee && (
                      <div style={{ fontSize: 11, color: 'var(--m)', marginTop: 4 }}>{t.assignee}</div>
                    )}
                  </div>
                  <TaskStatusSelect value={t.status || 'todo'} onChange={(s) => t.id && changeTaskStatus(t.id, s)} compact />
                </div>
              ))
            ) : (
              <div style={{ padding: 16, color: 'var(--m)', fontSize: 12.5 }}>
                No tasks today. Add tasks to the white board above — tasks that are not completed will automatically move to tomorrow.
              </div>
            )}
          </div>

          <CompletedTasksPanel tasks={allTasks} onStatusChange={changeTaskStatus} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">📊 Progress Overview</span>
            </div>
            <div className="card-body">
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--g)' }}>
                {totalCount ? Math.round((doneCount / totalCount) * 100) : 0}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--m)', marginTop: 4 }}>
                {doneCount} of {totalCount} tasks done
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">⚡ Upcoming Deadlines</span>
            </div>
            <div className="card-body" style={{ padding: 12 }}>
              {activeTasks.filter((t) => t.date && t.date >= today).length ? (
                activeTasks
                  .filter((t) => t.date && t.date >= today)
                  .slice(0, 5)
                  .map((t, i) => (
                    <div key={t.id || i} style={{ fontSize: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {truncateTaskText(getTaskDisplayText(t), 28)}
                      </span>
                      <span style={{ color: 'var(--m)', flexShrink: 0 }}>{getTaskStatusLabel(t.status)}</span>
                    </div>
                  ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--m)' }}>No deadlines.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

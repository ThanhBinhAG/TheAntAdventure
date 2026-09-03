'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import CompletedTasksPanel from '@/components/planner/CompletedTasksPanel';
import TaskStatusSelect from '@/components/planner/TaskStatusSelect';
import TodayTaskRow from '@/components/planner/TodayTaskRow';
import TaskModal, { type TaskModalMode } from '@/components/planner/TaskModal';
import {
  buildNoteTask,
  deriveTaskTitle,
  getTaskDisplayText,
  isTaskComplete,
  truncateTaskText,
  type TaskStatusValue,
} from '@/lib/planner/planner-task-utils';
import type { Task } from '@/lib/types';
import { addDays, localTodayIso, mondayOfWeek } from '@/lib/core/date-utils';
import { useStore } from '@/hooks/useStore';
import { usePagePermission } from '@/hooks/usePagePermission';
import { useLanguage } from '@/hooks/useLanguage';
import { PLANNER_STATUS_KEYS } from '@/lib/i18n/pages/planner';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { getBffArray } from '@/lib/bff/client';

const TEAM = ['Tai Pham', 'Linh N.', 'Minh T.', 'Huong L.', 'Khoa V.'];

export default function PlannerPage() {
  const { tp, tpl, tc } = useLanguage();
  const { canWrite } = usePagePermission('planner');
  const tasks = useStore((s) => s.tasks) as Task[];
  const addTask = useStore((s) => s.addTask);
  const setTasks = useStore((s) => s.setTasks);
  const updateTask = useStore((s) => s.updateTask);
  const removeTask = useStore((s) => s.removeTask);

  const [weekOffset, setWeekOffset] = useState(0);
  const [teamF, setTeamF] = useState('');
  const [plannerView, setPlannerView] = useState<'strip' | 'grid'>('strip');
  const [noteText, setNoteText] = useState('');
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatusValue>('todo');
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<TaskModalMode>('view');
  const [modalSaving, setModalSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const noteBoardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const loadErrorMsg = tp('planner', 'loadError');
    void getBffArray<Task>('/api/planner/all', loadErrorMsg)
      .then((rows) => {
        if (active) {
          setTasks(rows);
          useStore.getState().rolloverIncompleteTasks();
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : loadErrorMsg);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once; error string is not refetch trigger
  }, [setTasks]);

  const taskStatusLabel = (status?: string) =>
    tp('planner', PLANNER_STATUS_KEYS[status || 'todo'] || 'statusTodo');

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
    if (!canWrite) {
      toast.warning(tp('planner', 'noPermission'));
      return;
    }
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
        throw new Error(json.error ?? tp('planner', 'taskCreateFailed'));
      }
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error ?? tp('planner', 'taskCreateFailed'));
      }

      addTask(newTask as Record<string, unknown>);
      setNoteText('');
      setNewTaskStatus('todo');
      toast.success(tp('planner', 'taskAdded'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tp('planner', 'taskAddFailed'));
    }
  }

  async function changeTaskStatus(id: string, status: TaskStatusValue) {
    if (!canWrite) {
      toast.warning(tp('planner', 'noPermission'));
      return;
    }
    try {
      const res = await fetch('/api/planner', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, patch: { status } }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? tp('planner', 'statusUpdateFailed'));
      }
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error ?? tp('planner', 'statusUpdateFailed'));
      }

      updateTask(id, { status });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tp('planner', 'statusUpdateFailedShort'));
    }
  }

  async function saveTaskEdit(id: string, text: string) {
    if (!canWrite) {
      toast.warning(tp('planner', 'noPermission'));
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    const title = deriveTaskTitle(trimmed);
    try {
      const res = await fetch('/api/planner', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, patch: { title, notes: trimmed } }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? tp('planner', 'taskUpdateFailed'));
      }
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error ?? tp('planner', 'taskUpdateFailed'));
      }

      updateTask(id, { title, notes: trimmed });
      toast.success(tp('planner', 'taskUpdated'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tp('planner', 'taskUpdateFailed'));
      throw e;
    }
  }

  async function deleteTaskById(id: string) {
    if (!canWrite) {
      toast.warning(tp('planner', 'noPermission'));
      return;
    }
    const ok = await confirmDialog(tp('planner', 'deleteTaskConfirm'), {
      title: tp('planner', 'deleteTaskTitle'),
      confirmLabel: tc('delete'),
      cancelLabel: tc('cancel'),
    });
    if (!ok) return;

    try {
      const res = await fetch('/api/planner', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? tp('planner', 'taskDeleteFailed'));
      }
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error ?? tp('planner', 'taskDeleteFailed'));
      }

      removeTask(id);
      if (modalTaskId === id) {
        setModalTaskId(null);
        setModalMode('view');
      }
      toast.success(tp('planner', 'taskDeleted'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tp('planner', 'taskDeleteFailed'));
    }
  }

  function openTaskModal(task: Task, mode: TaskModalMode = 'view') {
    if (!task.id) return;
    setModalTaskId(task.id);
    setModalMode(mode);
  }

  function closeTaskModal() {
    setModalTaskId(null);
    setModalMode('view');
    setModalSaving(false);
  }

  async function saveTaskFromModal(payload: { text: string; status: TaskStatusValue }) {
    if (!modalTaskId) return;
    setModalSaving(true);
    try {
      await saveTaskEdit(modalTaskId, payload.text);
      const current = allTasks.find((t) => t.id === modalTaskId);
      if (payload.status !== (current?.status || 'todo')) {
        await changeTaskStatus(modalTaskId, payload.status);
      }
      setModalMode('view');
    } catch {
      /* toast already shown */
    } finally {
      setModalSaving(false);
    }
  }

  function renderTaskChip(t: Task, key: string | number) {
    const display = getTaskDisplayText(t);
    const preview = truncateTaskText(display);

    return (
      <div key={key} className={`planner-task planner-priority-${t.priority || 'medium'}`}>
        <button
          type="button"
          className="planner-task-chip"
          onClick={() => openTaskModal(t, 'view')}
          title={display}
        >
          {preview}
        </button>
      </div>
    );
  }

  const modalTask = modalTaskId ? allTasks.find((t) => t.id === modalTaskId) ?? null : null;

  return (
    <div className="planner-page">
      {loadError && <div className="crm-page-hydrate-error" role="alert">{loadError}</div>}
      <div className="planner-page-eyebrow">{tp('planner', 'pageTitle')}</div>

      <div className="planner-toolbar">
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
          {tp('planner', 'today')}
        </button>
        <div className="planner-view-toggle">
          <button type="button" className={plannerView === 'strip' ? 'on' : ''} onClick={() => setPlannerView('strip')}>
            {tp('planner', 'viewStrip')}
          </button>
          <button type="button" className={plannerView === 'grid' ? 'on' : ''} onClick={() => setPlannerView('grid')}>
            {tp('planner', 'viewGrid')}
          </button>
        </div>
        <select
          className="planner-team-filter"
          value={teamF}
          onChange={(e) => setTeamF(e.target.value)}
        >
          <option value="">{tp('planner', 'allTeamMembers')}</option>
          {TEAM.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <div className="planner-toolbar-spacer" />
        <button
          className="btn btn-p btn-sm"
          type="button"
          onClick={focusNoteBoard}
          disabled={!canWrite}
          title={!canWrite ? tp('planner', 'readOnlyAdd') : undefined}
        >
          {tp('planner', 'addTask')}
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
                {!dayTasks.length && <div className="planner-day-empty">—</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="planner-team-grid">
          <table className="tbl">
            <thead>
              <tr>
                <th>{tp('planner', 'colTeamMember')}</th>
                {weekDays.map((day) => (
                  <th key={day} className="planner-grid-day-hd">
                    {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEAM.filter((m) => !teamF || m === teamF).map((member) => (
                <tr key={member}>
                  <td className="planner-grid-member">{member}</td>
                  {weekDays.map((day) => {
                    const dayTasks = activeTasks.filter((t) => t.date === day && t.assignee === member);
                    return (
                      <td key={day} className={`planner-grid-cell${day === today ? ' today' : ''}`}>
                        {dayTasks.map((t, i) => renderTaskChip(t, t.id || i))}
                        {!dayTasks.length && <span className="planner-day-empty">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="planner-main-grid">
        <div className="card">
          <div className="card-hd">
            <span className="card-title">{tp('planner', 'todaysTasks')}</span>
            <span className="planner-card-date">{today}</span>
          </div>

          <div ref={noteBoardRef} className="planner-note-board">
            <textarea
              className="planner-note-textarea planner-note-textarea-inline"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={tp('planner', 'notePlaceholder')}
              rows={8}
              disabled={!canWrite}
              title={!canWrite ? tp('planner', 'readOnlyAdd') : undefined}
            />
            <div className="planner-note-board-actions">
              <TaskStatusSelect value={newTaskStatus} onChange={setNewTaskStatus} disabled={!canWrite} />
              <button
                className="btn btn-p btn-sm"
                type="button"
                onClick={saveNoteTask}
                disabled={!noteText.trim() || !canWrite}
                title={!canWrite ? tp('planner', 'readOnlyAdd') : undefined}
              >
                {tp('planner', 'addTaskBtn')}
              </button>
            </div>
          </div>

          <div className="planner-today-list">
            {todayTasks.length ? (
              todayTasks.map((t, i) => (
                <TodayTaskRow
                  key={t.id || i}
                  task={t}
                  canWrite={canWrite}
                  onStatusChange={changeTaskStatus}
                  onEdit={(task) => openTaskModal(task, 'edit')}
                  onOpen={(task) => openTaskModal(task, 'view')}
                  onDelete={deleteTaskById}
                />
              ))
            ) : (
              <div className="planner-today-empty">{tp('planner', 'noTasksToday')}</div>
            )}
          </div>

          <CompletedTasksPanel
            tasks={allTasks}
            onStatusChange={changeTaskStatus}
            onEdit={(task) => openTaskModal(task, 'edit')}
            onOpen={(task) => openTaskModal(task, 'view')}
            onDelete={deleteTaskById}
            canWrite={canWrite}
          />
        </div>
        <div className="planner-main-rail">
          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('planner', 'progressOverview')}</span>
            </div>
            <div className="card-body">
              <div className="planner-progress-pct">
                {totalCount ? Math.round((doneCount / totalCount) * 100) : 0}%
              </div>
              <div className="planner-progress-sub">
                {tpl('planner', 'tasksDone', { done: doneCount, total: totalCount })}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-hd">
              <span className="card-title">{tp('planner', 'upcomingDeadlines')}</span>
            </div>
            <div className="card-body planner-deadlines-body">
              {activeTasks.filter((t) => t.date && t.date >= today).length ? (
                activeTasks
                  .filter((t) => t.date && t.date >= today)
                  .slice(0, 5)
                  .map((t, i) => (
                    <div key={t.id || i} className="planner-deadline-row">
                      <span className="planner-deadline-title">
                        {truncateTaskText(getTaskDisplayText(t), 28)}
                      </span>
                      <span className="planner-deadline-status">{taskStatusLabel(t.status)}</span>
                    </div>
                  ))
              ) : (
                <div className="planner-deadline-empty">{tp('planner', 'noDeadlines')}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {modalTask && (
        <TaskModal
          task={modalTask}
          mode={modalMode}
          canWrite={canWrite}
          saving={modalSaving}
          onClose={closeTaskModal}
          onModeChange={setModalMode}
          onSave={saveTaskFromModal}
          onDelete={() => void deleteTaskById(modalTask.id!)}
          onStatusChange={(s) => void changeTaskStatus(modalTask.id!, s)}
        />
      )}
    </div>
  );
}

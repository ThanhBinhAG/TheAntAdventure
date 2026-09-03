'use client';

import { useEffect, useState } from 'react';
import TaskStatusSelect from '@/components/planner/TaskStatusSelect';
import {
  getTaskDisplayText,
  type TaskStatusValue,
} from '@/lib/planner/planner-task-utils';
import type { Task } from '@/lib/types';
import { useFormDirty, useConfirmClose } from '@/hooks/useConfirmClose';
import { useLanguage } from '@/hooks/useLanguage';
import { PLANNER_STATUS_KEYS } from '@/lib/i18n/pages/planner';

export type TaskModalMode = 'view' | 'edit';

type FormState = {
  text: string;
  status: TaskStatusValue;
};

interface TaskModalProps {
  task: Task;
  mode: TaskModalMode;
  canWrite: boolean;
  saving?: boolean;
  onClose: () => void;
  onModeChange: (mode: TaskModalMode) => void;
  onSave: (payload: FormState) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
  onStatusChange: (status: TaskStatusValue) => void;
}

export default function TaskModal({
  task,
  mode,
  canWrite,
  saving = false,
  onClose,
  onModeChange,
  onSave,
  onDelete,
  onStatusChange,
}: TaskModalProps) {
  const { tp, tc, language } = useLanguage();
  const display = getTaskDisplayText(task);
  const baseline: FormState = {
    text: display,
    status: (task.status as TaskStatusValue) || 'todo',
  };
  const [form, setForm] = useState<FormState>(baseline);

  useEffect(() => {
    setForm({
      text: getTaskDisplayText(task),
      status: (task.status as TaskStatusValue) || 'todo',
    });
  }, [task, mode]);

  const dirty = useFormDirty(mode === 'edit', baseline, form, undefined, `${task.id}:${mode}`);
  const { requestClose } = useConfirmClose({
    open: true,
    dirty: mode === 'edit' && dirty,
    onClose,
    language,
  });

  const statusLabel = tp('planner', PLANNER_STATUS_KEYS[task.status || 'todo'] || 'statusTodo');

  async function handleSave() {
    const trimmed = form.text.trim();
    if (!trimmed) return;
    await onSave({ text: trimmed, status: form.status });
  }

  return (
    <div className="overlay open" onClick={() => void requestClose()}>
      <div
        className="modal planner-task-modal"
        role="dialog"
        aria-modal="true"
        aria-label={tp('planner', 'taskModalTitle')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-hd">
          <span>{mode === 'edit' ? tp('planner', 'editTaskTitle') : tp('planner', 'taskModalTitle')}</span>
          <button className="modal-close-btn" type="button" onClick={() => void requestClose()} aria-label={tc('cancel')}>
            ✕
          </button>
        </div>

        <div className="modal-body planner-task-modal-body">
          {task.date && (
            <div className="planner-task-modal-meta">
              <span>{task.date}</span>
              {task.assignee && <span>· {task.assignee}</span>}
              {task.dept && <span>· {task.dept}</span>}
            </div>
          )}

          {mode === 'edit' ? (
            <>
              <div className="fg">
                <label className="lbl">{tp('planner', 'taskDetailsLabel')}</label>
                <textarea
                  className="planner-task-modal-textarea"
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                  rows={8}
                  disabled={saving}
                  autoFocus
                />
              </div>
              <div className="fg">
                <label className="lbl">{tp('planner', 'taskProgressAria')}</label>
                <TaskStatusSelect
                  value={form.status}
                  onChange={(s) => setForm((f) => ({ ...f, status: s }))}
                  disabled={!canWrite || saving}
                />
              </div>
            </>
          ) : (
            <>
              <div className="planner-task-modal-text">{display}</div>
              <div className="planner-task-modal-view-status">
                <span className="planner-completed-status-pill">{statusLabel}</span>
                {canWrite && (
                  <TaskStatusSelect
                    value={task.status || 'todo'}
                    onChange={onStatusChange}
                    compact
                    disabled={saving}
                  />
                )}
              </div>
            </>
          )}
        </div>

        <div className="planner-task-modal-footer">
          {mode === 'edit' ? (
            <>
              <button className="btn btn-s" type="button" onClick={() => void requestClose()} disabled={saving}>
                {tc('cancel')}
              </button>
              <button
                className="btn btn-p"
                type="button"
                onClick={() => void handleSave()}
                disabled={saving || !form.text.trim()}
              >
                {tc('save')}
              </button>
            </>
          ) : (
            <>
              {canWrite && (
                <>
                  <button className="btn btn-danger btn-sm" type="button" onClick={() => void onDelete()}>
                    {tc('delete')}
                  </button>
                  <button className="btn btn-s btn-sm" type="button" onClick={() => onModeChange('edit')}>
                    {tc('edit')}
                  </button>
                </>
              )}
              <button className="btn btn-p btn-sm" type="button" onClick={() => void requestClose()}>
                {tc('close')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

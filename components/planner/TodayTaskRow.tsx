'use client';

import TaskStatusSelect from '@/components/planner/TaskStatusSelect';
import TaskExpandableText from '@/components/planner/TaskExpandableText';
import { getTaskDisplayText, type TaskStatusValue } from '@/lib/planner/planner-task-utils';
import type { Task } from '@/lib/types';
import { useLanguage } from '@/hooks/useLanguage';

interface TodayTaskRowProps {
  task: Task;
  canWrite: boolean;
  onStatusChange: (id: string, status: TaskStatusValue) => void;
  onEdit: (task: Task) => void;
  onOpen: (task: Task) => void;
  onDelete: (id: string) => void | Promise<void>;
}

export default function TodayTaskRow({
  task,
  canWrite,
  onStatusChange,
  onEdit,
  onOpen,
  onDelete,
}: TodayTaskRowProps) {
  const { tc } = useLanguage();
  const display = getTaskDisplayText(task);

  if (!task.id) return null;

  return (
    <div className="hub-row planner-task-row">
      <div className="planner-task-row-body">
        <TaskExpandableText
          text={display}
          className="planner-task-row-title"
          onExpandRequest={() => onOpen(task)}
        />
        {task.assignee && <div className="planner-task-row-meta">{task.assignee}</div>}
      </div>
      <div className="planner-task-row-actions">
        <TaskStatusSelect
          value={task.status || 'todo'}
          onChange={(s) => onStatusChange(task.id!, s)}
          compact
          disabled={!canWrite}
        />
        {canWrite && (
          <>
            <button className="btn btn-s btn-sm" type="button" onClick={() => onEdit(task)}>
              {tc('edit')}
            </button>
            <button
              className="btn btn-danger btn-sm"
              type="button"
              onClick={() => void onDelete(task.id!)}
            >
              {tc('delete')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

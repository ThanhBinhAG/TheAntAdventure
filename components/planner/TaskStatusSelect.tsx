'use client';

import { TASK_STATUSES, type TaskStatusValue } from '@/lib/planner/planner-task-utils';
import { useLanguage } from '@/hooks/useLanguage';
import { PLANNER_STATUS_KEYS } from '@/lib/i18n/pages/planner';

export default function TaskStatusSelect({
  value,
  onChange,
  compact,
  disabled = false,
}: {
  value: string;
  onChange: (status: TaskStatusValue) => void;
  compact?: boolean;
  disabled?: boolean;
}) {
  const { tp } = useLanguage();

  return (
    <select
      className={compact ? 'planner-status-select planner-status-select-sm' : 'planner-status-select'}
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

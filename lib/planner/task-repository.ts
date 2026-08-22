import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerSupabaseClient } from '@/lib/supabase/server';
import { rowToTask, taskToRow } from '@/lib/db/mappers';
import type { Task } from '@/lib/types';

/**
 * Maps partial Task app type to Supabase DB columns for safe updates.
 */
function taskPatchToRow(patch: Partial<Task>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.assignee !== undefined) row.assignee = patch.assignee;
  if (patch.date !== undefined) row.due_date = patch.date;
  if (patch.priority !== undefined) row.priority = patch.priority;
  if (patch.dept !== undefined) row.department = patch.dept;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.notes !== undefined) row.notes = patch.notes;
  return row;
}

/**
 * Lấy toàn bộ danh sách tasks từ server.
 */
export async function getAllTasksServer(): Promise<Task[]> {
  const supabase = await getServerSupabaseClient();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => rowToTask(row) as unknown as Task);
}

/**
 * Tạo mới một task trên server.
 */
export async function createTaskServer(
  supabase: SupabaseClient,
  task: Task
): Promise<Task> {
  const row = taskToRow(task as Record<string, unknown>);
  const { error } = await supabase
    .from('tasks')
    .insert(row);

  if (error) throw error;
  return task;
}

/**
 * Cập nhật một phần của task trên server.
 */
export async function updateTaskServer(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<Task>
): Promise<void> {
  const row = taskPatchToRow(patch);
  const { error } = await supabase
    .from('tasks')
    .update(row)
    .eq('id', id);

  if (error) throw error;
}

/**
 * Xóa một task trên server.
 */
export async function deleteTaskServer(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

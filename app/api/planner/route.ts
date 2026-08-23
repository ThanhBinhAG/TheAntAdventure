import { z } from 'zod';
import { bffRoute } from '@/lib/bff/route';
import type { Task } from '@/lib/types';
import {
  createTaskServer,
  updateTaskServer,
  deleteTaskServer,
} from '@/lib/planner/task-repository';

export const dynamic = 'force-dynamic';

const taskSchema = z.object({
  id: z.string().min(1, 'Task ID cannot be empty'),
  title: z.string().min(1, 'Task title cannot be empty'),
  assignee: z.string().nullable().optional().transform((v) => v || undefined),
  date: z.string().nullable().optional().transform((v) => v || undefined),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dept: z.string().nullable().optional().transform((v) => v || undefined),
  status: z.enum(['todo', 'inprogress', 'review', 'done']).optional(),
  notes: z.string().nullable().optional().transform((v) => v || undefined),
});

// POST: Tạo một task mới
export const POST = bffRoute(
  {
    requiredPermission: 'planner.write',
    bodySchema: z.object({
      task: taskSchema,
    }),
  },
  async ({ supabase, body }) => {
    const created = await createTaskServer(supabase, body.task as Task);
    return created;
  }
);

// PATCH: Cập nhật thông tin chi tiết một task
export const PATCH = bffRoute(
  {
    requiredPermission: 'planner.write',
    bodySchema: z.object({
      id: z.string().min(1),
      patch: taskSchema.partial(),
    }),
  },
  async ({ supabase, body }) => {
    await updateTaskServer(supabase, body.id, body.patch as Partial<Task>);
    return { success: true };
  }
);

// DELETE: Xóa một task
export const DELETE = bffRoute(
  {
    requiredPermission: 'planner.write',
    bodySchema: z.object({
      id: z.string().min(1),
    }),
  },
  async ({ supabase, body }) => {
    await deleteTaskServer(supabase, body.id);
    return { success: true };
  }
);

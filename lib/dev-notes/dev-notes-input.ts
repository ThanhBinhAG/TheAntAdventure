import { z } from 'zod';

const devNoteIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/);

const shortText = (max: number) => z.string().trim().max(max);

export const devNotePrioritySchema = z.enum(['high', 'medium', 'low', 'info']);

export const devNoteCategorySchema = z.enum(['feature', 'bug', 'design', 'data', 'other']);

export const devNoteStatusSchema = z.enum(['open', 'inprogress', 'done']);

export const devNoteSchema = z.object({
  id: devNoteIdSchema.optional(),
  title: shortText(500),
  body: shortText(16_000),
  assignee: shortText(200).optional(),
  priority: devNotePrioritySchema.default('medium'),
  category: devNoteCategorySchema.default('feature'),
  status: devNoteStatusSchema.default('open'),
  author: shortText(200).optional(),
  date: shortText(40).optional(),
});

export const devNoteCreateRequestSchema = z.object({
  note: devNoteSchema,
});

export const devNoteUpdateRequestSchema = z.object({
  note: z
    .object({
      status: devNoteStatusSchema.optional(),
      title: shortText(500).optional(),
      body: shortText(16_000).optional(),
      assignee: shortText(200).optional(),
      priority: devNotePrioritySchema.optional(),
      category: devNoteCategorySchema.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field is required.',
    }),
});

export type DevNoteInput = z.infer<typeof devNoteSchema>;
export type DevNoteUpdateInput = z.infer<typeof devNoteUpdateRequestSchema>['note'];

/** List/detail DTO returned by Dev Notes BFF. */
export type DevNoteListItem = {
  id: string;
  title: string;
  body?: string;
  assignee?: string;
  priority: string;
  category?: string;
  status: string;
  author?: string;
  date?: string;
};

export type DevNoteCreatePayload = {
  title: string;
  body: string;
  assignee?: string;
  priority?: string;
  category?: string;
};

export type DevNoteEditPayload = {
  title: string;
  body: string;
  assignee?: string;
  priority: 'high' | 'medium' | 'low' | 'info' | string;
  category: 'feature' | 'bug' | 'design' | 'data' | 'other' | string;
  status: 'open' | 'inprogress' | 'done' | string;
};

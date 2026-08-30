import { z } from 'zod';

const feedbackIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/);

const shortText = (max: number) => z.string().trim().max(max).default('');

const optionalDate = z
  .string()
  .trim()
  .max(40)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

export const feedbackTypeSchema = z.enum(['client', 'guide', 'ops', 'agent']);

export const feedbackSchema = z.object({
  id: feedbackIdSchema.optional(),
  type: feedbackTypeSchema.default('client'),
  date: optionalDate,
  bkid: shortText(64).optional(),
  client: shortText(200).optional(),
  nps: z.number().int().min(0).max(10).optional(),
  overall: z.union([z.string(), z.number()]).optional().transform((v) => (v == null ? undefined : String(v))),
  guide_r: z.union([z.string(), z.number()]).optional().transform((v) => (v == null ? undefined : String(v))),
  hotel_r: z.union([z.string(), z.number()]).optional().transform((v) => (v == null ? undefined : String(v))),
  best: shortText(8_000).optional(),
  improve: shortText(8_000).optional(),
  comments: shortText(8_000).optional(),
  again: shortText(40).optional(),
});

export const feedbackCreateRequestSchema = z.object({
  feedback: feedbackSchema.superRefine((value, ctx) => {
    if (value.type === 'client' && value.nps == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'NPS is required for client surveys.',
        path: ['nps'],
      });
    }
    if ((value.type === 'client' || value.type === 'ops' || value.type === 'guide') && !value.bkid?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Booking reference is required.',
        path: ['bkid'],
      });
    }
    if (value.type === 'agent' && !value.client?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Agent name is required.',
        path: ['client'],
      });
    }
  }),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type FeedbackType = z.infer<typeof feedbackTypeSchema>;

/** Payload accepted by create hook (Zod-validated server-side). */
export type FeedbackCreatePayload = Partial<FeedbackInput> & {
  type: FeedbackType;
};

/** List/detail DTO returned by Feedback BFF (safe for browser imports). */
export type FeedbackListItem = {
  id: string;
  type: string;
  date?: string;
  bkid?: string;
  client?: string;
  nps?: number;
  overall?: string;
  guide_r?: string;
  hotel_r?: string;
  best?: string;
  improve?: string;
  comments?: string;
  again?: string;
};

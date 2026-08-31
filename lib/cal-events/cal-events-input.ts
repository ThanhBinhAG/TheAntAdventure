import { z } from 'zod';

const calEventIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/);

const shortText = (max: number) => z.string().trim().max(max);

export const calEventStatusSchema = z.enum([
  'booked',
  'ontour',
  'standby',
  'unavailable',
  'training',
]);

export const calEventSchema = z.object({
  id: calEventIdSchema.optional(),
  guideId: shortText(64),
  bookingCode: shortText(64).optional(),
  tour: shortText(500).optional(),
  clients: shortText(500),
  start: shortText(40),
  end: shortText(40),
  status: calEventStatusSchema.default('booked'),
  notes: shortText(2000).optional(),
});

export const calEventCreateRequestSchema = z.object({
  event: calEventSchema.superRefine((value, ctx) => {
    if (value.end < value.start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date must be on or after start date.',
        path: ['end'],
      });
    }
  }),
});

export type CalEventInput = z.infer<typeof calEventSchema>;

/** List/detail DTO returned by cal-events BFF. */
export type CalEventListItem = {
  id: string;
  guideId: string;
  bookingCode?: string;
  tour?: string;
  clients: string;
  start: string;
  end: string;
  status: string;
  notes?: string;
};

export type CalEventCreatePayload = Omit<CalEventInput, 'id'>;

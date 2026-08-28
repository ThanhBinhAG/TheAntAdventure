import { z } from 'zod';
import { isValidBookingDate, normalizeBookingDateInput } from '@/lib/bookings/booking-dates';
import type { Booking } from '@/lib/types';

const bookingIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/);

const shortText = (max: number) => z.string().trim().max(max).default('');

const bookingDateField = z
  .string()
  .trim()
  .max(10)
  .default('')
  .transform(normalizeBookingDateInput)
  .refine(isValidBookingDate, { message: 'Date must be YYYY-MM-DD or empty.' });

export const bookingChangeSchema = z.object({
  id: z.string().trim().min(1).max(128),
  type: z.string().trim().min(1).max(32),
  date: z.string().trim().max(40).default(''),
  time: z.string().trim().max(40).optional(),
  by: z.string().trim().max(120).optional(),
  description: z.string().trim().min(1).max(2_000),
  detail: z.string().trim().max(4_000).optional(),
  costImpact: z.number().finite().optional(),
  cancelFee: z.number().finite().min(0).optional(),
  refund: z.number().finite().min(0).optional(),
});

export const bookingFieldsSchema = z.object({
  id: bookingIdSchema.optional(),
  custId: z.string().trim().min(1).max(64),
  leadId: z.string().trim().max(64).optional(),
  tour: z.string().trim().min(1).max(500),
  pax: z.number().int().min(1).max(1_000).default(1),
  start: bookingDateField,
  end: bookingDateField,
  total: z.number().finite().min(0).max(100_000_000).default(0),
  deposit: z.number().finite().min(0).max(100_000_000).default(0),
  status: z.string().trim().min(1).max(80),
  guide: shortText(200),
  hotel: shortText(500),
  changes: z.array(bookingChangeSchema).default([]),
  guideAlertPending: z.boolean().default(false),
});

function refineBookingDateRange(
  data: { start: string; end: string },
  ctx: z.RefinementCtx,
) {
  if (data.start && data.end && data.end < data.start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date must be on or after start date.',
      path: ['end'],
    });
  }
}

export const bookingSchema = bookingFieldsSchema.superRefine(refineBookingDateRange);

export const bookingCreateRequestSchema = z.object({
  booking: bookingSchema,
});

export const bookingUpdateRequestSchema = z.object({
  booking: bookingFieldsSchema
    .extend({ id: bookingIdSchema })
    .superRefine(refineBookingDateRange),
});

export type BookingChangeInput = z.infer<typeof bookingChangeSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;

/** List/detail DTO returned by Bookings BFF (safe for browser imports). */
export type BookingListItem = Booking & {
  customerName: string;
};

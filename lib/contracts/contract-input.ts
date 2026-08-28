import { z } from 'zod';

const contractIdSchema = z
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

const nullableDate = z
  .union([z.string().trim().max(40), z.null()])
  .optional()
  .transform((v) => {
    if (v == null) return null;
    return v.length > 0 ? v : null;
  });

export const contractStatusSchema = z.enum(['Draft', 'Sent', 'Signed']);

export const contractSchema = z.object({
  id: contractIdSchema.optional(),
  bookingId: shortText(64),
  clientName: z.string().trim().min(1).max(200),
  nationality: shortText(120),
  pax: z.number().int().min(1).max(1_000).default(1),
  rooms: shortText(200),
  tourName: z.string().trim().min(1).max(500),
  duration: shortText(120),
  departureDate: optionalDate,
  returnDate: optionalDate,
  route: shortText(500),
  inclusions: z.string().trim().max(20_000).default(''),
  exclusions: z.string().trim().max(20_000).default(''),
  flights: z.string().trim().max(8_000).default(''),
  currency: z.string().trim().min(1).max(8).default('USD'),
  total: z.number().finite().min(0).max(100_000_000).default(0),
  depositPct: z.number().int().min(0).max(100).default(30),
  depositAmt: z.number().finite().min(0).max(100_000_000).optional(),
  balanceDueDate: optionalDate,
  status: contractStatusSchema.default('Draft'),
  createdAt: optionalDate,
  signedAt: nullableDate,
  notes: shortText(4_000),
});

export const contractCreateRequestSchema = z.object({
  contract: contractSchema,
});

export const contractUpdateRequestSchema = z.object({
  contract: contractSchema.extend({ id: contractIdSchema }),
});

export type ContractInput = z.infer<typeof contractSchema>;
export type ContractStatus = z.infer<typeof contractStatusSchema>;

/** List/detail DTO returned by Contracts BFF (safe for browser imports). */
export type ContractListItem = {
  id: string;
  bookingId?: string;
  clientName: string;
  nationality?: string;
  pax: number;
  rooms?: string;
  tourName: string;
  duration?: string;
  departureDate?: string;
  returnDate?: string;
  route?: string;
  inclusions?: string;
  exclusions?: string;
  flights?: string;
  currency: string;
  total: number;
  depositPct: number;
  depositAmt: number;
  balanceDueDate?: string;
  status: string;
  createdAt?: string;
  signedAt?: string | null;
  notes?: string;
};

import { z } from 'zod';

const guideIdSchema = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/);
const shortText = (max: number) => z.string().trim().max(max).default('');

export const guideSchema = z.object({
  id: guideIdSchema,
  fullname: z.string().trim().min(1).max(200),
  ename: shortText(200),
  region: shortText(80),
  langs: shortText(200),
  specialty: shortText(500),
  license: shortText(200),
  rate: z.number().finite().min(0).max(1_000_000).default(0),
  rating: shortText(32),
  status: shortText(80),
  photo: z.string().trim().max(2_048).default(''),
  years: z.number().int().min(0).max(100).default(0),
  location: shortText(200),
  phone: shortText(80),
  email: shortText(254),
  shirtSize: shortText(32),
  bankAccount: shortText(500),
  address: shortText(1_000),
  bio: shortText(8_000),
  reviews: z.array(z.unknown()).default([]),
});

export const guideRequestSchema = z.object({ guide: guideSchema });
export const guideAvatarRequestSchema = z.object({ guideId: guideIdSchema });

export type GuideInput = z.infer<typeof guideSchema>;

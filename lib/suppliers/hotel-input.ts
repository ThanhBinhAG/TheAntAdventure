import { z } from 'zod';
import type { Hotel, HotelRoom } from '@/lib/types';
import { normalizeHotelTier } from '@/lib/suppliers/hotel-tiers';

const idSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/);

const shortText = (max: number) => z.string().trim().max(max).default('');

export const hotelRoomSchema = z.object({
  id: z.string().trim().max(64).optional(),
  type: z.string().trim().min(1).max(200),
  view: z.string().trim().max(200).optional(),
  sqm: z.number().finite().min(0).max(10_000).optional(),
  lm: z.number().finite().min(0).max(1_000_000).default(0),
  hm: z.number().finite().min(0).max(1_000_000).default(0),
  fm: z.number().finite().min(0).max(1_000_000).default(0),
  pm: z.number().finite().min(0).max(1_000_000).default(0),
  ln: z.number().finite().min(0).max(1_000_000).default(0),
  hn: z.number().finite().min(0).max(1_000_000).default(0),
  fn: z.number().finite().min(0).max(1_000_000).default(0),
  pn: z.number().finite().min(0).max(1_000_000).default(0),
});

export const hotelSchema = z.object({
  id: idSchema.optional(),
  name: z.string().trim().min(1).max(300),
  dest: shortText(200),
  cat: shortText(120),
  stars: shortText(40),
  region: z.enum(['north', 'central', 'south']),
  rooms: z.array(hotelRoomSchema).max(200).default([]),
  status: shortText(40).default('Active'),
});

export const hotelCreateRequestSchema = z.object({
  hotel: hotelSchema,
});

export const hotelUpdateRequestSchema = z.object({
  hotel: hotelSchema.extend({ id: idSchema }),
});

export type HotelRoomInput = z.infer<typeof hotelRoomSchema>;
export type HotelInput = z.infer<typeof hotelSchema>;

/** List/detail DTO returned by Hotels BFF (safe for browser imports). */
export type HotelListItem = Hotel;

export function inputToHotel(input: HotelInput, id: string): Hotel {
  const rooms: HotelRoom[] = (input.rooms ?? []).map((room, index) => ({
    id: room.id?.trim() || `${id}-R${index + 1}`,
    type: room.type,
    view: room.view,
    sqm: room.sqm,
    lm: room.lm,
    hm: room.hm,
    fm: room.fm,
    pm: room.pm,
    ln: room.ln,
    hn: room.hn,
    fn: room.fn,
    pn: room.pn,
  }));

  return {
    id,
    name: input.name,
    dest: input.dest,
    cat: input.cat,
    stars: normalizeHotelTier(input.stars),
    region: input.region,
    rooms,
    status: input.status || 'Active',
  };
}

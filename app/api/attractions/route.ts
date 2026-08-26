import { z } from 'zod';
import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import type { Attraction } from '@/lib/types';
import {
  createAttractionServer,
  updateAttractionServer,
  deleteAttractionServer,
} from '@/lib/attractions/attraction-repository';

export const dynamic = 'force-dynamic';

const attractionSchema = z.object({
  id: z.string().min(1, 'Attraction ID cannot be empty'),
  region: z.enum(['north', 'central', 'south']),
  type: z.string().min(1, 'Type cannot be empty'),
  name: z.string().min(1, 'Name cannot be empty'),
  dest: z.string().min(1, 'Destination cannot be empty'),
  hours: z.string().default(''),
  closed: z.string().default(''),
  admission: z.string().default(''),
  duration: z.number().default(0),
  best_time: z.string().default(''),
  crowd: z.string().default(''),
  book_req: z.boolean().default(false),
  seasonal: z.string().default(''),
  notes: z.string().default(''),
  alert: z.string().default(''),
  phone: z.string().default(''),
  photoIds: z.array(z.string()).optional(),
  linkedPhotoIds: z.array(z.string()).optional(),
});

// POST: Tạo mới địa điểm tham quan
export const POST = bffRoute(
  {
    logging: { scope: 'attractions', route: '/api/attractions' },
    requiredPermission: 'attractions.write',
    bodySchema: z.object({
      attraction: attractionSchema,
    }),
  },
  async ({ supabase, body }) => {
    const created = await createAttractionServer(supabase, body.attraction as unknown as Attraction);
    return created;
  }
);

// PATCH: Cập nhật thông tin địa điểm tham quan
export const PATCH = bffRoute(
  {
    logging: { scope: 'attractions', route: '/api/attractions' },
    requiredPermission: 'attractions.write',
    bodySchema: z.object({
      attraction: attractionSchema,
    }),
  },
  async ({ supabase, body }) => {
    const updated = await updateAttractionServer(supabase, body.attraction.id, body.attraction as unknown as Attraction);
    if (!updated) {
      return NextResponse.json({ ok: false, error: 'Không tìm thấy địa điểm tham quan.' }, { status: 404 });
    }
    return { success: true };
  }
);

// DELETE: Xóa địa điểm tham quan
export const DELETE = bffRoute(
  {
    logging: { scope: 'attractions', route: '/api/attractions' },
    requiredPermission: 'attractions.write',
    bodySchema: z.object({
      id: z.string().min(1),
    }),
  },
  async ({ supabase, body }) => {
    const deleted = await deleteAttractionServer(supabase, body.id);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: 'Không tìm thấy địa điểm tham quan.' }, { status: 404 });
    }
    return { success: true };
  }
);

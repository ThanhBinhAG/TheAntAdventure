import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import { devNoteUpdateRequestSchema } from '@/lib/dev-notes/dev-notes-input';
import {
  DevNotesRepositoryError,
  deleteDevNoteServer,
  updateDevNoteServer,
} from '@/lib/dev-notes/dev-notes-repository';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'dev-notes', route: '/api/dev-notes/[id]' },
      requiredPermission: 'devnotes.write',
      bodySchema: devNoteUpdateRequestSchema,
    },
    async ({ supabase, body }) => {
      try {
        return await updateDevNoteServer(supabase, id, body.note);
      } catch (error) {
        if (error instanceof DevNotesRepositoryError) {
          const status = error.code === 'not_found' ? 404 : 400;
          return NextResponse.json({ ok: false, error: error.message }, { status });
        }
        throw error;
      }
    },
  )(request);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  return bffRoute(
    {
      logging: { scope: 'dev-notes', route: '/api/dev-notes/[id]' },
      requiredPermission: 'devnotes.write',
    },
    async ({ supabase }) => {
      try {
        await deleteDevNoteServer(supabase, id);
        return { deleted: true };
      } catch (error) {
        if (error instanceof DevNotesRepositoryError) {
          const status = error.code === 'not_found' ? 404 : 400;
          return NextResponse.json({ ok: false, error: error.message }, { status });
        }
        throw error;
      }
    },
  )(_request);
}

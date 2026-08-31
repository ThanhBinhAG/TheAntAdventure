import { NextResponse } from 'next/server';
import { bffRoute } from '@/lib/bff/route';
import {
  devNoteCreateRequestSchema,
} from '@/lib/dev-notes/dev-notes-input';
import {
  DevNotesRepositoryError,
  createDevNoteServer,
  listDevNotesServer,
} from '@/lib/dev-notes/dev-notes-repository';

export const dynamic = 'force-dynamic';

export const GET = bffRoute(
  {
    logging: { scope: 'dev-notes', route: '/api/dev-notes' },
    requiredPermission: 'devnotes.read',
  },
  async ({ supabase }) => listDevNotesServer(supabase),
);

export const POST = bffRoute(
  {
    logging: { scope: 'dev-notes', route: '/api/dev-notes' },
    requiredPermission: 'devnotes.write',
    bodySchema: devNoteCreateRequestSchema,
  },
  async ({ supabase, body, auth }) => {
    try {
      return await createDevNoteServer(supabase, body.note, auth.email);
    } catch (error) {
      if (error instanceof DevNotesRepositoryError) {
        const status =
          error.code === 'conflict' ? 409 : error.code === 'not_found' ? 404 : 400;
        return NextResponse.json({ ok: false, error: error.message }, { status });
      }
      throw error;
    }
  },
);

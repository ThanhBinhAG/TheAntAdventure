/**
 * Company proposal templates (B2C / B2B commercial + legal copy).
 * Authenticated only — same bar as PDF export. Missing table → empty (system defaults).
 */

import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth/session';
import {
  fetchCompanyProposalTemplates,
  upsertCompanyProposalTemplate,
} from '@/lib/proposals/proposal-company-template-server';
import { parseCompanyTemplateFields } from '@/lib/proposals/proposal-company-template';
import type { ProposalVariant } from '@/lib/proposals/proposal-types';
import { captureAppError } from '@/lib/system/app-logger';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

function parseVariant(raw: unknown): ProposalVariant | null {
  return raw === 'b2c' || raw === 'b2b' ? raw : null;
}

export async function GET() {
  const auth = await getAuthContext();
  if (!auth.authenticated) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  try {
    const templates = await fetchCompanyProposalTemplates();
    return json({ ok: true, templates });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load templates';
    captureAppError('proposals/templates GET', err, message);
    return json({ ok: true, templates: { b2c: { fields: {}, source: 'system' }, b2b: { fields: {}, source: 'system' } } });
  }
}

export async function PUT(request: Request) {
  const auth = await getAuthContext();
  if (!auth.authenticated) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  let body: { variant?: unknown; fields?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const variant = parseVariant(body.variant);
  if (!variant) {
    return json({ ok: false, error: 'variant must be b2c or b2b' }, 400);
  }

  try {
    const templates = await upsertCompanyProposalTemplate(variant, parseCompanyTemplateFields(body.fields));
    return json({ ok: true, templates });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to save template';
    captureAppError('proposals/templates PUT', err, message);
    return json({ ok: false, error: message }, 500);
  }
}

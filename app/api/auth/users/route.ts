import { NextResponse } from 'next/server';
import { isBreakGlassShadowEmail } from '@/lib/auth/break-glass-supabase';
import { requireBreakGlass } from '@/lib/auth/session';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/server/env/supabase';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import { withHttpRequestLogging } from '@/lib/system/server-logger';

function getAdminClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** List Auth users — break-glass only. Hides shadow + never exposes env break-glass username. */
export const GET = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'auth/break-glass-users', route: '/api/auth/users' },
  async (_request, _context, { logger }) => {
  const ctx = await requireBreakGlass();
  if (!ctx) {
    logger.warn({ event: 'auth.break_glass_users.denied', statusCode: 403 }, 'Break-glass users access denied');
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) {
    logger.error({ event: 'auth.break_glass_users.unavailable', statusCode: 503 }, 'Break-glass user service unavailable');
    return NextResponse.json({ ok: false, error: 'Service role not configured' }, { status: 503 });
  }

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    logger.error({ event: 'auth.break_glass_users.list.failed', err: error }, 'Break-glass user list failed');
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const users = (data.users ?? [])
    .filter((u) => !isBreakGlassShadowEmail(u.email))
    .map((u) => ({
      id: u.id,
      email: u.email ?? null,
      banned: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
      bannedUntil: u.banned_until ?? null,
      lastSignInAt: u.last_sign_in_at ?? null,
      createdAt: u.created_at ?? null,
    }));

  return NextResponse.json({ ok: true, users, actor: 'break_glass' });
  },
);

type UnbanBody = {
  action?: string;
  userId?: string;
};

/** Unban a Supabase Auth user — break-glass recovery. */
export const POST = withHttpRequestLogging<{ params: Promise<Record<string, never>> }>(
  { scope: 'auth/break-glass-users', route: '/api/auth/users' },
  async (request, _context, { logger }) => {
  const ctx = await requireBreakGlass();
  if (!ctx) {
    logger.warn({ event: 'auth.break_glass_users.denied', statusCode: 403 }, 'Break-glass users access denied');
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: UnbanBody;
  try {
    body = (await request.json()) as UnbanBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 });
  }

  if (body.action !== 'unban' || !body.userId?.trim()) {
    return NextResponse.json({ ok: false, error: 'Expected action=unban and userId' }, { status: 400 });
  }

  const admin = getAdminClient();
  if (!admin) {
    logger.error({ event: 'auth.break_glass_users.unavailable', statusCode: 503 }, 'Break-glass user service unavailable');
    return NextResponse.json({ ok: false, error: 'Service role not configured' }, { status: 503 });
  }

  const { data: userData, error: getError } = await admin.auth.admin.getUserById(body.userId.trim());
  if (getError) {
    logger.error({ event: 'auth.break_glass_users.lookup.failed', err: getError }, 'Break-glass user lookup failed');
    return NextResponse.json({ ok: false, error: getError.message }, { status: 500 });
  }
  if (isBreakGlassShadowEmail(userData.user?.email)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin.auth.admin.updateUserById(body.userId.trim(), {
    ban_duration: 'none',
  });

  if (error) {
    logger.error({ event: 'auth.break_glass_users.unban.failed', err: error }, 'Break-glass user unban failed');
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  logger.info({ event: 'auth.break_glass_users.unban.succeeded' }, 'Break-glass user unbanned');
  return NextResponse.json({ ok: true, actor: 'break_glass' });
  },
);

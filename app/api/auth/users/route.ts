import { NextResponse } from 'next/server';
import { isBreakGlassShadowEmail } from '@/lib/auth/break-glass-supabase';
import { requireBreakGlass } from '@/lib/auth/session';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/env';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';

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
export async function GET() {
  const ctx = await requireBreakGlass();
  if (!ctx) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Service role not configured' }, { status: 503 });
  }

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
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
}

type UnbanBody = {
  action?: string;
  userId?: string;
};

/** Unban a Supabase Auth user — break-glass recovery. */
export async function POST(request: Request) {
  const ctx = await requireBreakGlass();
  if (!ctx) {
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
    return NextResponse.json({ ok: false, error: 'Service role not configured' }, { status: 503 });
  }

  const { data: userData, error: getError } = await admin.auth.admin.getUserById(body.userId.trim());
  if (getError) {
    return NextResponse.json({ ok: false, error: getError.message }, { status: 500 });
  }
  if (isBreakGlassShadowEmail(userData.user?.email)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await admin.auth.admin.updateUserById(body.userId.trim(), {
    ban_duration: 'none',
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, actor: 'break_glass' });
}

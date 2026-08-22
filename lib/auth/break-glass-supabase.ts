import 'server-only';
import { randomBytes } from 'crypto';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/env';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';

/** Fixed shadow Auth user so break-glass gets RLS `authenticated` access. Not used for privilege checks. */
export const BREAK_GLASS_SHADOW_EMAIL = 'breakglass.internal@invalid';

function getAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensureShadowUser(admin: SupabaseClient): Promise<string | null> {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listError) return null;

  const existing = listed.users.find(
    (u) => (u.email ?? '').toLowerCase() === BREAK_GLASS_SHADOW_EMAIL,
  );
  if (existing) {
    // Ensure not banned so magic link / OTP can succeed.
    if (existing.banned_until && new Date(existing.banned_until) > new Date()) {
      await admin.auth.admin.updateUserById(existing.id, { ban_duration: 'none' });
    }
    return existing.id;
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: BREAK_GLASS_SHADOW_EMAIL,
    password: randomBytes(32).toString('base64url'),
    email_confirm: true,
    user_metadata: { break_glass_shadow: true },
  });
  if (createError || !created.user) return null;
  return created.user.id;
}

/**
 * Create a real Supabase session for the shadow user so CRM RLS works.
 * The caller stores its tokens only in the server-side CRM session.
 */
export async function getBreakGlassSupabaseSession(): Promise<Session | null> {
  const admin = getAdminClient();
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  if (!admin || !url || !anon) return null;

  const userId = await ensureShadowUser(admin);
  if (!userId) return null;

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: BREAK_GLASS_SHADOW_EMAIL,
  });
  if (linkError) return null;

  const tokenHash = linkData.properties?.hashed_token;
  if (!tokenHash) return null;

  const supabase = createClient(url, anon, {
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error: otpError } = await supabase.auth.verifyOtp({
    type: 'email',
    token_hash: tokenHash,
  });

  return otpError ? null : data.session;
}

export function isBreakGlassShadowEmail(email: string | null | undefined): boolean {
  return (email ?? '').toLowerCase() === BREAK_GLASS_SHADOW_EMAIL;
}

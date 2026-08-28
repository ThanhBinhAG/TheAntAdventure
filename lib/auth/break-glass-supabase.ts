import 'server-only';
import { randomBytes } from 'crypto';
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/server/env/supabase';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import { debugLog } from '@/lib/system/debug-logger';

function publicError(error: { message?: string; code?: string; status?: number } | null | undefined) {
  if (!error) return undefined;
  return { message: error.message, code: error.code, status: error.status };
}

/**
 * Hidden Auth user so break-glass gets a real JWT for RLS/RPC.
 * Privilege comes from verified recovery credentials plus this user's
 * `super_admin` role.
 */
export const BREAK_GLASS_SHADOW_EMAIL = 'breakglass.internal@invalid';
export const BREAK_GLASS_SHADOW_DISPLAY_NAME = 'Break-glass';

function getAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, {
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function findShadowUserId(admin: SupabaseClient): Promise<string | null> {
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', BREAK_GLASS_SHADOW_EMAIL)
    .maybeSingle();

  if (profile?.id) return profile.id;

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: BREAK_GLASS_SHADOW_EMAIL,
  });
  if (linkError) {
    debugLog('auth', 'break-glass shadow lookup failed', {
      level: 'warn',
      meta: { step: 'generateLink', error: publicError(linkError) },
    });
  }

  return linkData?.user?.id ?? null;
}

async function grantBreakGlassPrivileges(
  admin: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: 'none',
    app_metadata: { break_glass_shadow: true },
    user_metadata: { break_glass_shadow: true },
  });
  if (authError) {
    debugLog('auth', 'break-glass privilege grant failed', {
      level: 'warn',
      meta: { step: 'updateUserById', error: publicError(authError) },
    });
    return false;
  }

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: userId,
      email: BREAK_GLASS_SHADOW_EMAIL,
      display_name: BREAK_GLASS_SHADOW_DISPLAY_NAME,
      is_active: true,
      deleted_at: null,
    },
    { onConflict: 'id' },
  );
  if (profileError) {
    debugLog('auth', 'break-glass privilege grant failed', {
      level: 'warn',
      meta: { step: 'profiles.upsert', error: publicError(profileError) },
    });
    return false;
  }

  const { error: roleError } = await admin.from('user_roles').upsert(
    {
      user_id: userId,
      role_code: 'super_admin',
    },
    { onConflict: 'user_id' },
  );
  if (roleError) {
    debugLog('auth', 'break-glass privilege grant failed', {
      level: 'warn',
      meta: { step: 'user_roles.upsert', error: publicError(roleError) },
    });
    return false;
  }

  return true;
}

async function ensureShadowUser(admin: SupabaseClient): Promise<string | null> {
  let userId = await findShadowUserId(admin);

  if (!userId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: BREAK_GLASS_SHADOW_EMAIL,
      password: randomBytes(32).toString('base64url'),
      email_confirm: true,
      app_metadata: { break_glass_shadow: true },
      user_metadata: { break_glass_shadow: true },
    });

    if (created?.user) {
      userId = created.user.id;
    } else if (createError) {
      userId = await findShadowUserId(admin);
    }
  }

  if (!userId) return null;
  await grantBreakGlassPrivileges(admin, userId);
  return userId;
}

/** Ensure the shadow Auth user exists, is active, and holds `super_admin`. */
export async function ensureBreakGlassShadowPrivileges(): Promise<boolean> {
  const admin = getAdminClient();
  if (!admin) return false;
  const userId = await ensureShadowUser(admin);
  return Boolean(userId);
}

let privilegeEnsure: Promise<boolean> | null = null;

/** Idempotent per process so an already-open break-glass session gets the role after deploy. */
export function ensureBreakGlassShadowPrivilegesOnce(): Promise<boolean> {
  if (!privilegeEnsure) {
    privilegeEnsure = ensureBreakGlassShadowPrivileges().then(
      (ok) => {
        if (!ok) privilegeEnsure = null;
        return ok;
      },
      (error: unknown) => {
        privilegeEnsure = null;
        throw error;
      },
    );
  }
  return privilegeEnsure;
}

/**
 * Create a real Supabase session for the shadow user so CRM RLS/RPC work.
 * The caller stores tokens only in Supabase SSR HttpOnly cookies.
 * Also grants the hidden `super_admin` role used by Access Control and core RLS.
 */
export async function getBreakGlassSupabaseSession(): Promise<Session | null> {
  const admin = getAdminClient();
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  if (!admin || !url || !anon) {
    debugLog('auth', 'break-glass supabase session missing config', {
      level: 'error',
      meta: { hasAdmin: Boolean(admin), hasUrl: Boolean(url), hasAnon: Boolean(anon) },
    });
    return null;
  }

  const userId = await ensureShadowUser(admin);
  if (!userId) {
    debugLog('auth', 'break-glass shadow user missing', { level: 'error' });
    return null;
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: BREAK_GLASS_SHADOW_EMAIL,
  });
  if (linkError) {
    debugLog('auth', 'break-glass magic link failed', {
      level: 'error',
      meta: { error: publicError(linkError) },
    });
    return null;
  }

  const tokenHash = linkData.properties?.hashed_token;
  if (!tokenHash) {
    debugLog('auth', 'break-glass magic link missing token hash', { level: 'error' });
    return null;
  }

  const supabase = createClient(url, anon, {
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error: otpError } = await supabase.auth.verifyOtp({
    type: 'email',
    token_hash: tokenHash,
  });

  if (otpError || !data.session) {
    debugLog('auth', 'break-glass verifyOtp failed', {
      level: 'error',
      meta: { error: publicError(otpError), hasSession: Boolean(data.session) },
    });
    return null;
  }

  return data.session;
}

export function isBreakGlassShadowEmail(email: string | null | undefined): boolean {
  return (email ?? '').toLowerCase() === BREAK_GLASS_SHADOW_EMAIL;
}

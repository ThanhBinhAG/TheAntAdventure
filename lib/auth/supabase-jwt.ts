import 'server-only';

import {
  createRemoteJWKSet,
  customFetch,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';
import { getServerSupabaseUrl, getSupabaseJwtIssuer } from '@/lib/env';
import { getSupabaseFetch } from '@/lib/supabase/insecure-fetch';

const SUPABASE_AUDIENCE = 'authenticated';
const REMOTE_JWKS_CACHE_MAX_AGE_MS = 10 * 60 * 1000;
const REMOTE_JWKS_COOLDOWN_MS = 30 * 1000;

export type VerifiedSupabaseAccessToken = {
  userId: string;
  email: string | null;
  sessionId: string | null;
};

type VerifyOptions = {
  issuer?: string;
  audience?: string;
  jwks?: JWTVerifyGetKey;
};

const remoteJwksByIssuer = new Map<string, JWTVerifyGetKey>();

export function getSupabaseAuthIssuer(supabaseUrl = getServerSupabaseUrl()): string | null {
  const configuredIssuer = getSupabaseJwtIssuer().replace(/\/$/, '');
  if (configuredIssuer) return configuredIssuer;

  const origin = supabaseUrl.replace(/\/$/, '');
  return origin ? `${origin}/auth/v1` : null;
}

function getRemoteJwks(issuer: string): JWTVerifyGetKey {
  const existing = remoteJwksByIssuer.get(issuer);
  if (existing) return existing;

  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
    cacheMaxAge: REMOTE_JWKS_CACHE_MAX_AGE_MS,
    cooldownDuration: REMOTE_JWKS_COOLDOWN_MS,
    [customFetch]: getSupabaseFetch() as never,
  });
  remoteJwksByIssuer.set(issuer, jwks);
  return jwks;
}

/** Verify a Supabase-issued access token using its public JWKS. */
export async function verifySupabaseAccessToken(
  token: string | undefined,
  options: VerifyOptions = {},
): Promise<VerifiedSupabaseAccessToken | null> {
  if (!token) return null;
  const issuer = options.issuer ?? getSupabaseAuthIssuer();
  if (!issuer) return null;

  try {
    const { payload } = await jwtVerify(token, options.jwks ?? getRemoteJwks(issuer), {
      issuer,
      audience: options.audience ?? SUPABASE_AUDIENCE,
      algorithms: ['ES256', 'EdDSA', 'RS256'],
    });
    if (
      typeof payload.exp !== 'number'
      || typeof payload.sub !== 'string'
      || !payload.sub
    ) return null;

    return {
      userId: payload.sub,
      email: typeof payload.email === 'string' ? payload.email : null,
      sessionId: typeof payload.session_id === 'string' ? payload.session_id : null,
    };
  } catch {
    return null;
  }
}

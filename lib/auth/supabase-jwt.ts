import 'server-only';

import {
  createRemoteJWKSet,
  customFetch,
  jwtVerify,
  type JWTVerifyGetKey,
} from 'jose';
import {
  getServerSupabaseUrl,
  getSupabaseJwtIssuer,
  getSupabaseUrl,
} from '@/lib/env';
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
  issuer?: string | string[];
  audience?: string;
  jwks?: JWTVerifyGetKey;
};

const remoteJwksByUrl = new Map<string, JWTVerifyGetKey>();

/** Expected JWT `iss` — may be a private LAN URL when GoTrue stamps API_EXTERNAL_URL. */
export function getSupabaseAuthIssuer(supabaseUrl = getServerSupabaseUrl()): string | null {
  const configuredIssuer = getSupabaseJwtIssuer().replace(/\/$/, '');
  if (configuredIssuer) return configuredIssuer;

  const origin = supabaseUrl.replace(/\/$/, '');
  return origin ? `${origin}/auth/v1` : null;
}

/**
 * Issuers accepted during verify. Includes the configured issuer (possibly private)
 * and the browser-facing public Auth issuer so either GoTrue stamp can succeed.
 */
export function getSupabaseAuthIssuers(supabaseUrl = getServerSupabaseUrl()): string[] {
  const issuers = new Set<string>();
  const primary = getSupabaseAuthIssuer(supabaseUrl);
  if (primary) issuers.add(primary);

  const publicOrigin = getSupabaseUrl().replace(/\/$/, '');
  if (publicOrigin) issuers.add(`${publicOrigin}/auth/v1`);

  return [...issuers];
}

/**
 * JWKS must be fetched from a host the CRM process can reach.
 * Private issuer hosts (Docker/LAN) often return EHOSTUNREACH from WSL/dev.
 */
export function getSupabaseJwksUrl(): URL | null {
  const publicOrigin = getSupabaseUrl().replace(/\/$/, '');
  const serverOrigin = getServerSupabaseUrl().replace(/\/$/, '');
  const origin = publicOrigin || serverOrigin;
  if (!origin) return null;
  return new URL(`${origin}/auth/v1/.well-known/jwks.json`);
}

function getRemoteJwks(): JWTVerifyGetKey | null {
  const jwksUrl = getSupabaseJwksUrl();
  if (!jwksUrl) return null;

  const key = jwksUrl.href;
  const existing = remoteJwksByUrl.get(key);
  if (existing) return existing;

  const jwks = createRemoteJWKSet(jwksUrl, {
    cacheMaxAge: REMOTE_JWKS_CACHE_MAX_AGE_MS,
    cooldownDuration: REMOTE_JWKS_COOLDOWN_MS,
    [customFetch]: getSupabaseFetch() as never,
  });
  remoteJwksByUrl.set(key, jwks);
  return jwks;
}

/** Verify a Supabase-issued access token using its public JWKS. */
export async function verifySupabaseAccessToken(
  token: string | undefined,
  options: VerifyOptions = {},
): Promise<VerifiedSupabaseAccessToken | null> {
  if (!token) return null;
  const issuer = options.issuer ?? getSupabaseAuthIssuers();
  if (!issuer || (Array.isArray(issuer) && issuer.length === 0)) return null;

  const jwks = options.jwks ?? getRemoteJwks();
  if (!jwks) return null;

  try {
    const { payload } = await jwtVerify(token, jwks, {
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

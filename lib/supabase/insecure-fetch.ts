/**
 * Server-only fetch for self-hosted Supabase with untrusted TLS.
 * Must never be imported from middleware or client components (undici uses node:).
 */

import 'server-only';

import { Agent, fetch as undiciFetch } from 'undici';
import { shouldUseInsecureTlsForUrl } from '@/lib/supabase/tls-config';

let insecureAgent: Agent | null = null;

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function getInsecureAgent(): Agent {
  if (!insecureAgent) {
    insecureAgent = new Agent({
      connect: { rejectUnauthorized: false },
    });
  }
  return insecureAgent;
}

/** Fetch that skips TLS verify for company Supabase HTTPS hosts (Node runtime only). */
export function getSupabaseFetch(): typeof fetch {
  const customFetch: typeof fetch = (input, init) => {
    const url = resolveRequestUrl(input as RequestInfo | URL);
    if (!shouldUseInsecureTlsForUrl(url)) {
      return fetch(input, init);
    }
    return undiciFetch(input as string | URL | Request, {
      ...(init as object),
      dispatcher: getInsecureAgent(),
    }) as unknown as Promise<Response>;
  };
  return customFetch;
}

/** Spread into createClient / createServerClient options (Node route handlers / RSC). */
export function getSupabaseGlobalFetchOptions() {
  return { global: { fetch: getSupabaseFetch() } };
}

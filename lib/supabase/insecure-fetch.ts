/**
 * Server-only fetch for self-hosted Supabase with untrusted TLS.
 * Must never be imported from middleware or client components (undici uses node:).
 */

import 'server-only';

import { Agent, fetch as undiciFetch, type RequestInit as UndiciRequestInit } from 'undici';
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

/**
 * Build undici init from global fetch args.
 * Always call undici with a URL string — DOM `Request` is not assignable to undici's
 * `RequestInfo` (undici `Request` requires `duplex`).
 */
function toUndiciInit(input: RequestInfo | URL, init?: RequestInit): UndiciRequestInit {
  const fromInit = { ...(init as UndiciRequestInit | undefined) };

  if (typeof input === 'string' || input instanceof URL) {
    return fromInit;
  }

  const req = input as globalThis.Request;
  const method = fromInit.method ?? req.method;
  const headers = fromInit.headers ?? req.headers;
  const body =
    fromInit.body !== undefined
      ? fromInit.body
      : method === 'GET' || method === 'HEAD'
        ? undefined
        : (req.body as UndiciRequestInit['body']);

  const next: UndiciRequestInit = {
    ...fromInit,
    method,
    headers,
    body,
  };

  if (body != null && next.duplex == null) {
    next.duplex = 'half';
  }

  return next;
}

/** Fetch that skips TLS verify for company Supabase HTTPS hosts (Node runtime only). */
export function getSupabaseFetch(): typeof fetch {
  const customFetch: typeof fetch = (input, init) => {
    const url = resolveRequestUrl(input as RequestInfo | URL);
    if (!shouldUseInsecureTlsForUrl(url)) {
      return fetch(input, init);
    }
    return undiciFetch(url, {
      ...toUndiciInit(input as RequestInfo | URL, init),
      dispatcher: getInsecureAgent(),
    }) as unknown as Promise<Response>;
  };
  return customFetch;
}

/** Spread into createClient / createServerClient options (Node route handlers / RSC). */
export function getSupabaseGlobalFetchOptions() {
  return { global: { fetch: getSupabaseFetch() } };
}

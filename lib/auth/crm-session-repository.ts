import 'server-only';

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getSessionEncryptionKey } from '@/lib/server/env/auth';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/server/env/supabase';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import {
  createSessionToken,
  assertValidSessionEncryptionKey,
  decryptSessionSecret,
  encryptSessionSecret,
  hashSessionToken,
} from '@/lib/auth/crm-session-crypto';

type QueryResult = PromiseLike<{ data: Record<string, unknown> | null; error: unknown }>;

type CrmSessionsQuery = PromiseLike<{ data: Record<string, unknown> | null; error: unknown }> & {
  insert: (row: Record<string, unknown>) => {
    select: (columns: string) => { single: () => QueryResult };
  };
  select: (columns: string) => CrmSessionsQuery;
  update: (row: Record<string, unknown>) => CrmSessionsQuery;
  eq: (column: string, value: unknown) => CrmSessionsQuery;
  is: (column: string, value: null) => CrmSessionsQuery;
  gt: (column: string, value: string) => CrmSessionsQuery;
  maybeSingle: () => QueryResult;
};

type SupabaseTableClient = {
  from: (table: string) => unknown;
  rpc?: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;
};

function sessions(client: SupabaseTableClient): CrmSessionsQuery {
  return client.from('crm_sessions') as CrmSessionsQuery;
}

type CrmSessionRow = {
  sid: string;
  user_id: string;
  access_token_ciphertext: string;
  refresh_token_ciphertext: string;
  access_token_expires_at: string;
  expires_at: string;
};

export type ActiveCrmSession = {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  expiresAt: Date;
};

export class CrmSessionStoreUnavailableError extends Error {
  constructor() {
    super('CRM durable session store is unavailable.');
    this.name = 'CrmSessionStoreUnavailableError';
  }
}

function asActiveSession(row: CrmSessionRow, encryptionKey: string): ActiveCrmSession {
  return {
    id: row.sid,
    userId: row.user_id,
    accessToken: decryptSessionSecret(row.access_token_ciphertext, encryptionKey),
    refreshToken: decryptSessionSecret(row.refresh_token_ciphertext, encryptionKey),
    accessTokenExpiresAt: new Date(row.access_token_expires_at),
    expiresAt: new Date(row.expires_at),
  };
}

export function createCrmSessionRepository(client: SupabaseTableClient, encryptionKey: string) {
  return {
    async create(input: {
      userId: string;
      accessToken: string;
      refreshToken: string;
      accessTokenExpiresAt: Date;
      expiresAt: Date;
    }): Promise<{ id: string; token: string }> {
      const token = createSessionToken();
      const row = {
        sid: randomUUID(),
        token_hash: hashSessionToken(token),
        user_id: input.userId,
        access_token_ciphertext: encryptSessionSecret(input.accessToken, encryptionKey),
        refresh_token_ciphertext: encryptSessionSecret(input.refreshToken, encryptionKey),
        access_token_expires_at: input.accessTokenExpiresAt.toISOString(),
        expires_at: input.expiresAt.toISOString(),
      };
      const { data, error } = await sessions(client).insert(row).select('sid').single();
      if (error || !data?.sid) throw new CrmSessionStoreUnavailableError();
      return { id: data.sid as string, token };
    },

    async lookup(token: string): Promise<ActiveCrmSession | null> {
      try {
        const { data, error } = await sessions(client)
          .select('sid,user_id,access_token_ciphertext,refresh_token_ciphertext,access_token_expires_at,expires_at')
          .eq('token_hash', hashSessionToken(token))
          .is('revoked_at', null)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();
        if (error) throw new CrmSessionStoreUnavailableError();
        if (!data) return null;

        const session = asActiveSession(data as CrmSessionRow, encryptionKey);
        // Supabase query builders are lazy: attach handlers so this best-effort
        // audit update is actually dispatched without delaying authentication.
        void sessions(client).update({ last_used_at: new Date().toISOString() }).eq('sid', session.id).then(
          () => undefined,
          () => undefined,
        );
        return session;
      } catch (error) {
        if (error instanceof CrmSessionStoreUnavailableError) throw error;
        return null;
      }
    },

    async rotateCredentials(input: {
      id: string;
      token: string;
      accessToken: string;
      refreshToken: string;
      accessTokenExpiresAt: Date;
      expiresAt: Date;
    }): Promise<void> {
      if (!client.rpc) throw new CrmSessionStoreUnavailableError();
      const { data, error } = await client.rpc('rotate_crm_session_credentials', {
        p_sid: input.id,
        p_token_hash: hashSessionToken(input.token),
        p_access_token_ciphertext: encryptSessionSecret(input.accessToken, encryptionKey),
        p_refresh_token_ciphertext: encryptSessionSecret(input.refreshToken, encryptionKey),
        p_access_token_expires_at: input.accessTokenExpiresAt.toISOString(),
        p_expires_at: input.expiresAt.toISOString(),
      });
      if (error || data !== true) throw new CrmSessionStoreUnavailableError();
    },

    async revoke(token: string): Promise<void> {
      const { error } = await sessions(client)
        .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('token_hash', hashSessionToken(token))
        .is('revoked_at', null);
      if (error) throw new CrmSessionStoreUnavailableError();
    },

    async revokeAllForUser(userId: string): Promise<void> {
      const { error } = await sessions(client)
        .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('revoked_at', null);
      if (error) throw new CrmSessionStoreUnavailableError();
    },

    async cleanupExpired(retentionDays = 30): Promise<void> {
      if (!client.rpc) throw new CrmSessionStoreUnavailableError();
      const { error } = await client.rpc('cleanup_crm_sessions', {
        p_retention_days: retentionDays,
      });
      if (error) throw new CrmSessionStoreUnavailableError();
    },
  };
}

function getSessionStoreClient(): SupabaseTableClient {
  const url = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!url || !serviceRoleKey) throw new CrmSessionStoreUnavailableError();
  return createClient(url, serviceRoleKey, {
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getCrmSessionRepository() {
  const encryptionKey = getSessionEncryptionKey();
  assertValidSessionEncryptionKey(encryptionKey);
  return createCrmSessionRepository(getSessionStoreClient(), encryptionKey);
}

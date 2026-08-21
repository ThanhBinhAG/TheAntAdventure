import 'server-only';

import { createClient } from '@supabase/supabase-js';
import { getServerSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';

export type DurableCrmSession = {
  sid: string;
  payloadCiphertext: string;
  expiresAt: string;
  revokedAt: string | null;
};

function getCrmSessionStoreClient() {
  const url = getServerSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY chưa được cấu hình cho CRM session store.');
  }
  return createClient(url, serviceRoleKey, {
    ...getSupabaseGlobalFetchOptions(),
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function createDurableCrmSession(session: DurableCrmSession): Promise<void> {
  const { error } = await getCrmSessionStoreClient().from('crm_sessions').insert({
    sid: session.sid,
    payload_ciphertext: session.payloadCiphertext,
    expires_at: session.expiresAt,
  });
  if (error) throw new Error('Không thể tạo CRM session durable.');
}

export async function findDurableCrmSession(sid: string): Promise<DurableCrmSession | null> {
  const { data, error } = await getCrmSessionStoreClient()
    .from('crm_sessions')
    .select('sid, payload_ciphertext, expires_at, revoked_at')
    .eq('sid', sid)
    .maybeSingle();
  if (error) throw new Error('Không thể đọc CRM session durable.');
  if (!data) return null;

  return {
    sid: String(data.sid),
    payloadCiphertext: String(data.payload_ciphertext),
    expiresAt: String(data.expires_at),
    revokedAt: data.revoked_at ? String(data.revoked_at) : null,
  };
}

export async function updateDurableCrmSession(session: DurableCrmSession): Promise<void> {
  const { error } = await getCrmSessionStoreClient()
    .from('crm_sessions')
    .update({ payload_ciphertext: session.payloadCiphertext, expires_at: session.expiresAt, updated_at: new Date().toISOString() })
    .eq('sid', session.sid)
    .is('revoked_at', null);
  if (error) throw new Error('Không thể cập nhật CRM session durable.');
}

export async function revokeDurableCrmSession(sid: string): Promise<void> {
  const { error } = await getCrmSessionStoreClient()
    .from('crm_sessions')
    .update({ revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('sid', sid)
    .is('revoked_at', null);
  if (error) throw new Error('Không thể revoke CRM session durable.');
}

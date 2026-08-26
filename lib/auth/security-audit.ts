import 'server-only';

import { createHash } from 'node:crypto';
import { getAdminSupabaseClient } from '@/lib/supabase/server';
import { serverLogger } from '@/lib/system/server-logger';

export type AuthSecurityEventType =
  | 'login_succeeded'
  | 'login_failed'
  | 'logout_succeeded'
  | 'logout_failed'
  | 'refresh_succeeded'
  | 'refresh_failed'
  | 'user_locked'
  | 'user_unlocked';

/** Best-effort audit trail. Authentication must remain available if audit storage is unavailable. */
export async function recordAuthSecurityEvent(input: {
  eventType: AuthSecurityEventType;
  userId?: string | null;
  sessionId?: string | null;
  ip?: string | null;
}): Promise<void> {
  try {
    const ipHash = input.ip
      ? createHash('sha256').update(input.ip).digest('hex')
      : null;
    await getAdminSupabaseClient()
      .from('auth_security_events')
      .insert({
        event_type: input.eventType,
        user_id: input.userId ?? null,
        session_id: input.sessionId ?? null,
        ip_hash: ipHash,
      });
  } catch (err) {
    serverLogger.warn(
      { scope: 'auth/security-audit', event: 'auth_security_audit.write_failed', auditEvent: input.eventType, err },
      'Auth security audit write failed'
    );
  }
}

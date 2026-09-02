/**
 * Server-only module for creating Supabase Auth users for Access Control.
 *
 * Features:
 * - Uses SUPABASE_SERVICE_ROLE_KEY to create Auth users.
 * - Never exposes the service-role key to the browser.
 * - Includes rollback to delete newly created Auth users if profile/role assignment fails.
 *
 * Notes:
 * - Only server-side Access Control API should import this file.
 * - users.manage permission check is done at the API and database RPC level.
 */

import 'server-only';

import {
    createClient,
    type SupabaseClient,
} from '@supabase/supabase-js';
import {
    BREAK_GLASS_SHADOW_EMAIL,
} from '@/lib/auth/break-glass-supabase';
import {
    getSupabaseServiceRoleKey,
    getSupabaseUrl,
} from '@/lib/server/env/supabase';
import { getSupabaseGlobalFetchOptions } from '@/lib/supabase/insecure-fetch';
import { getCrmSessionRepository } from '@/lib/auth/crm-session-repository';

/** Dedicated error class so API can return appropriate HTTP status. */
export class AccessControlAuthAdminError extends Error {
    constructor(
        message: string,
        public readonly status: 400 | 403 | 503,
    ) {
        super(message);
        this.name = 'AccessControlAuthAdminError';
    }
}

/** Create a Supabase Admin client (server-only). */
function getAccessControlAdminClient(): SupabaseClient | null {
    const url = getSupabaseUrl();
    const serviceRoleKey = getSupabaseServiceRoleKey();

    if (!url || !serviceRoleKey) {
        return null;
    }

    return createClient(url, serviceRoleKey, {
        ...getSupabaseGlobalFetchOptions(),
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

/** Create an Auth user with the email/password provided by the Super Admin. */
export async function createAccessControlAuthUser(input: {
    email: string;
    password: string;
}): Promise<string> {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Must not create or overwrite the shadow user reserved for break-glass.
    if (normalizedEmail === BREAK_GLASS_SHADOW_EMAIL) {
        throw new AccessControlAuthAdminError(
            'This email cannot be used.',
            403,
        );
    }

    const admin = getAccessControlAdminClient();

    if (!admin) {
        throw new AccessControlAuthAdminError(
            'Server has not configured SUPABASE_SERVICE_ROLE_KEY.',
            503,
        );
    }

    const { data, error } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: input.password,
        email_confirm: true,
    });

    if (error || !data.user) {
        // Do not expose detailed Supabase error to avoid leaking email information.
        throw new AccessControlAuthAdminError(
            'Unable to create account. The email may already exist.',
            400,
        );
    }

  return data.user.id;
}

/** Ban/unban the Auth account so refresh/login are revoked with CRM account status. */
export async function setAccessControlAuthUserActive(
    userId: string,
    isActive: boolean,
): Promise<void> {
    const admin = getAccessControlAdminClient();
    if (!admin) {
        throw new AccessControlAuthAdminError(
            'Server has not configured SUPABASE_SERVICE_ROLE_KEY.',
            503,
        );
    }

    const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: isActive ? 'none' : '876000h',
    });
    if (error) {
        throw new AccessControlAuthAdminError(
            isActive
                ? 'Unable to activate the Supabase Auth account.'
                : 'Unable to lock the Supabase Auth account.',
            503,
        );
    }

    if (!isActive) {
        try {
            await getCrmSessionRepository().revokeAllForUser(userId);
        } catch {
            throw new AccessControlAuthAdminError(
                'Unable to revoke active CRM sessions.',
                503,
            );
        }
    }
}

/** Update user password using the Supabase Admin SDK. */
export async function updateAccessControlUserPassword(
    userId: string,
    newPassword: string,
): Promise<void> {
    const admin = getAccessControlAdminClient();
    if (!admin) {
        throw new AccessControlAuthAdminError(
            'Server has not configured SUPABASE_SERVICE_ROLE_KEY.',
            503,
        );
    }

    const { error } = await admin.auth.admin.updateUserById(userId, {
        password: newPassword,
    });

    if (error) {
        throw new AccessControlAuthAdminError(
            'Unable to change user password.',
            503,
        );
    }
}

/**
 * Delete a newly created Auth user when profile/role assignment fails.
 *
 * Only use for rollback immediately after a partially failed createUser.
 * Do not use this function for normal "delete user" operations.
 */
export async function rollbackNewAccessControlAuthUser(
    userId: string,
): Promise<void> {
    const admin = getAccessControlAdminClient();

    if (!admin) return;

    await admin.auth.admin.deleteUser(userId);
}

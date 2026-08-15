import 'server-only';

import type { AccessControlStaffRole } from '@/lib/access-control/server';
import { getRedisClient } from '@/lib/redis/client';

const STAFF_ROLES_CACHE_KEY = 'cache:access-control:staff-roles';
const STAFF_ROLES_CACHE_TTL_SECONDS = 5 * 60;

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isAccessControlStaffRole(value: unknown): value is AccessControlStaffRole {
  if (!value || typeof value !== 'object') return false;

  const role = value as Record<string, unknown>;

  return (
    typeof role.role_code === 'string' &&
    typeof role.role_label === 'string' &&
    (typeof role.role_description === 'string' || role.role_description === null) &&
    typeof role.is_active === 'boolean' &&
    typeof role.sort_order === 'number' &&
    isStringArray(role.permission_codes) &&
    typeof role.assigned_user_count === 'number'
  );
}

/** `undefined` means Redis is unavailable, empty, or has an invalid cached value. */
export async function getCachedAccessControlStaffRoles(): Promise<
  AccessControlStaffRole[] | undefined
> {
  try {
    const client = await getRedisClient();
    if (!client) return undefined;

    const raw = await client.get(STAFF_ROLES_CACHE_KEY);
    if (!raw) return undefined;

    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.every(isAccessControlStaffRole)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

export async function setCachedAccessControlStaffRoles(
  roles: AccessControlStaffRole[]
): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.set(
      STAFF_ROLES_CACHE_KEY,
      JSON.stringify(roles),
      { EX: STAFF_ROLES_CACHE_TTL_SECONDS }
    );
  } catch {
    // Redis lỗi không được làm API Access Control thất bại.
  }
}

/** Call after a successful staff-role write or a user role assignment. */
export async function invalidateAccessControlStaffRolesCache(): Promise<void> {
  try {
    const client = await getRedisClient();
    if (!client) return;

    await client.del(STAFF_ROLES_CACHE_KEY);
  } catch {
    // Redis lỗi không được làm thao tác ghi role thất bại.
  }
}

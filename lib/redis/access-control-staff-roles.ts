import 'server-only';

import type { AccessControlStaffRole } from '@/lib/access-control/server';
import { cacheGet, cacheSet, cacheDel } from './cache-helper';

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
    (role.role_description === null || typeof role.role_description === 'string') &&
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
  const value = await cacheGet<unknown>(STAFF_ROLES_CACHE_KEY);
  if (value === null) return undefined;

  return Array.isArray(value) && value.every(isAccessControlStaffRole)
    ? (value as AccessControlStaffRole[])
    : undefined;
}

export async function setCachedAccessControlStaffRoles(
  roles: AccessControlStaffRole[]
): Promise<void> {
  await cacheSet(
    STAFF_ROLES_CACHE_KEY,
    roles,
    STAFF_ROLES_CACHE_TTL_SECONDS
  );
}

/** Call after a successful staff-role write or a user role assignment. */
export async function invalidateAccessControlStaffRolesCache(): Promise<void> {
  await cacheDel(STAFF_ROLES_CACHE_KEY);
}

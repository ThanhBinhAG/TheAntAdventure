/**
 * Browser compatibility env — CRM data uses BFF routes only (D2.13).
 * Server configuration lives under `lib/server/env/`.
 */
export function isRemoteDataEnabled() {
  return false;
}

export function isAutoSyncEnabled() {
  return false;
}

export function isSupabaseReadOnly() {
  return true;
}

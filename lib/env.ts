/**
 * Browser compatibility boundary while Dev 2 removes the generic Supabase
 * hydrate/sync stack. Private Supabase configuration belongs in `lib/server/env`.
 */
export function getSupabaseUrl() { return ''; }
export function getSupabaseAnonKey() { return ''; }
export function isUseSupabaseEnabled() { return false; }
export function isSupabaseConfigured() { return false; }
export function isRemoteDataEnabled() { return false; }
export function isAutoSyncEnabled() { return false; }
export function isSupabaseReadOnly() { return true; }

/**
 * Public hydrate API - re-exports internal modules under `./hydrate/`.
 * Callers should keep importing from `@/lib/db/hydrate`.
 */

export { isRemoteDataEnabled } from '../env';
export {
  getHydrationState,
  subscribeHydration,
  type HydrationState,
} from './sync-lifecycle';

export {
  checkSupabaseConnection,
  quickSupabasePing,
  readCachedConnectionStatus,
  resetQuickSupabasePingCache,
  type ConnectionStatus,
} from './hydrate/connection';

export { persistRouteCacheFromStore } from './hydrate/route-persist';

export { resetShellHydrateGuard, cancelDelayedRevalidate } from './hydrate/shared';

export {
  ensurePageBootLoaded,
  ensureTablesLoaded,
  ensureMessagesLoaded,
  ensurePageDataLoaded,
  routeBootSatisfied,
  setActivePageBoot,
  cancelPageBoot,
} from './hydrate/page-boot';

export {
  hydrateShellFromSupabase,
  ensureAllTablesLoaded,
  hydrateFromSupabase,
  verifyLocalMatchesRemote,
  clearLocalPersistedData,
  completeMigrationToSupabase,
  type VerifyResult,
} from './hydrate/full-hydrate';

export { pushSnapshotToSupabase, pushTablesToSupabase } from './sync-push';

'use client';

import { createContext, useContext } from 'react';
import type { AutoSyncState } from '@/lib/db/auto-sync';
import type { ConnectionStatus, VerifyResult } from '@/lib/db/hydrate';

export type SupabaseContextValue = {
  remoteEnabled: boolean;
  remote: boolean;
  conn: ConnectionStatus | null;
  verify: VerifyResult | null;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  runConnectionCheck: () => Promise<void>;
  checking: boolean;
  syncing: boolean;
  autoSync: AutoSyncState;
};

export const SupabaseContext = createContext<SupabaseContextValue | null>(null);

export function useSupabasePanel() {
  return useContext(SupabaseContext);
}

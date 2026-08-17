'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar, { QuickNav } from '@/components/Topbar';
import AiCopilot from '@/components/AiCopilot';
import { AiCopilotProvider } from '@/components/AiCopilotContext';
import { StoreProvider } from '@/components/StoreProvider';
import { PermissionsProvider } from '@/components/PermissionsProvider';
import ToastHost from '@/components/ToastHost';
import ConfirmHost from '@/components/ConfirmHost';
import type { PermissionCode } from '@/lib/auth/permissions';

const PIN_KEY = 'crm.sidebarPinned';

function readPinned(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = localStorage.getItem(PIN_KEY);
    if (raw === null) return true;
    return raw !== 'false';
  } catch {
    return true;
  }
}

const pinListeners = new Set<() => void>();

function emitPinChange() {
  pinListeners.forEach((listener) => listener());
}

function subscribePinned(onStoreChange: () => void) {
  pinListeners.add(onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    pinListeners.delete(onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

/**
 * CRM chrome: store + permissions + sidebar/topbar + toast/confirm hosts.
 */
type CRMShellProps = {
  children: React.ReactNode;

  // Quyền đã được lấy từ server trong app/(crm)/layout.tsx.
  initialPermissionCodes: PermissionCode[];
};

export default function CRMShell({
  children,
  initialPermissionCodes,
}: CRMShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarPinned = useSyncExternalStore(subscribePinned, readPinned, () => true);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const setPinned = useCallback((pinned: boolean) => {
    try {
      localStorage.setItem(PIN_KEY, pinned ? 'true' : 'false');
    } catch {
      /* ignore quota / private mode */
    }
    emitPinChange();
    if (pinned) setMenuOpen(false);
  }, []);

  const appClass = `crm-app${!sidebarPinned ? ' sb-unpinned' : ''}`;

  return (
    <StoreProvider>
      <PermissionsProvider initialPermissionCodes={initialPermissionCodes}>
        <AiCopilotProvider>
          <div className={appClass}>
            <Sidebar
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              pinned={sidebarPinned}
              onPinnedChange={setPinned}
            />
            <div id="main">
              <Topbar
                onMenuToggle={() => setMenuOpen((v) => !v)}
                showMenuToggle={!sidebarPinned}
              />
              <QuickNav />
              <div id="content">{children}</div>
            </div>
            <AiCopilot />
            <ToastHost />
            <ConfirmHost />
          </div>
        </AiCopilotProvider>
      </PermissionsProvider>
    </StoreProvider>
  );
}

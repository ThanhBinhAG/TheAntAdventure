'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar, { QuickNav } from '@/components/Topbar';
import AiCopilot from '@/components/AiCopilot';
import { AiCopilotProvider } from '@/components/AiCopilotContext';
import { StoreProvider } from '@/components/StoreProvider';
import { PermissionsProvider } from '@/components/PermissionsProvider';
import ToastHost from '@/components/ToastHost';
import ConfirmHost from '@/components/ConfirmHost';

/**
 * CRM chrome: store + permissions + sidebar/topbar + toast/confirm hosts.
 */
export default function CRMShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <StoreProvider>
      <PermissionsProvider>
        <AiCopilotProvider>
          <div className="crm-app">
            <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
            <div id="main">
              <Topbar onMenuToggle={() => setMenuOpen((v) => !v)} />
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

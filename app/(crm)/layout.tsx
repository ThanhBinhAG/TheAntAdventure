'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar, { QuickNav } from '@/components/Topbar';
import AiCopilot from '@/components/AiCopilot';
import { StoreProvider } from '@/components/StoreProvider';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <StoreProvider>
      <div className="crm-app">
        <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div id="main">
          <Topbar onMenuToggle={() => setMenuOpen((v) => !v)} />
          <QuickNav />
          <div id="content">{children}</div>
        </div>
        <AiCopilot />
      </div>
    </StoreProvider>
  );
}

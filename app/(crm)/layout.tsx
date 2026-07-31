/**
 * File này là layout chung cho các trang CRM đã đăng nhập.
 *
 * Chức năng:
 * - Ghép Sidebar, Topbar, QuickNav và AI Copilot thành khung CRM thống nhất.
 * - Cung cấp StoreProvider cho dữ liệu CRM và PermissionsProvider cho quyền user.
 * - Không áp dụng cho /login hoặc các trang system/debug ngoài nhóm (crm).
 */

'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar, { QuickNav } from '@/components/Topbar';
import AiCopilot from '@/components/AiCopilot';
import { AiCopilotProvider } from '@/components/AiCopilotContext';
import { StoreProvider } from '@/components/StoreProvider';
import { PermissionsProvider } from '@/components/PermissionsProvider';

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <StoreProvider>
      {/* Tải quyền một lần để mọi trang CRM dùng cùng kết quả kiểm tra quyền. */}
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
          </div>
        </AiCopilotProvider>
      </PermissionsProvider>
    </StoreProvider>
  );
}

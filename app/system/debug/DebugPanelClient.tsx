'use client';

import { useSearchParams } from 'next/navigation';
import { DebugPanel } from '@/components/system/DebugPanel';

export function DebugPanelClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-title">System Debug</div>
            <div className="login-subtitle">Thiếu token</div>
          </div>
          <p className="login-hint">
            Truy cập với query <code>?token=YOUR_SYSTEM_DEBUG_TOKEN</code> (lấy từ env server).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page debug-page-wrap">
      <DebugPanel token={token} />
    </div>
  );
}

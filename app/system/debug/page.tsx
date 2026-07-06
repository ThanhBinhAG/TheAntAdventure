import { Suspense } from 'react';
import { DebugPanelClient } from './DebugPanelClient';

export default function SystemDebugPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page">
          <div className="login-card">Đang tải diagnostics…</div>
        </div>
      }
    >
      <DebugPanelClient />
    </Suspense>
  );
}

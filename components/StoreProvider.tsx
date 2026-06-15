'use client';

import { useCallback, useEffect, useState } from 'react';
import { AutoSyncListener } from '@/components/AutoSyncListener';
import {
  getAutoSyncState,
  subscribeAutoSync,
  type AutoSyncState,
} from '@/lib/db/auto-sync';
import {
  checkSupabaseConnection,
  completeMigrationToSupabase,
  hydrateFromSupabase,
  isRemoteDataEnabled,
  pushSnapshotToSupabase,
  quickSupabasePing,
  verifyLocalMatchesRemote,
  type ConnectionStatus,
  type VerifyResult,
} from '@/lib/db/hydrate';
import { isAutoSyncEnabled } from '@/lib/env';
import { SupabaseContext } from '@/lib/SupabaseContext';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [remote, setRemote] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [conn, setConn] = useState<ConnectionStatus | null>(null);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [autoSync, setAutoSync] = useState<AutoSyncState>(getAutoSyncState);

  const remoteEnabled = isRemoteDataEnabled();
  const autoSyncOn = isAutoSyncEnabled();

  useEffect(() => subscribeAutoSync(setAutoSync), []);

  const runConnectionCheck = useCallback(async () => {
    if (!remoteEnabled) return;
    setChecking(true);
    const status = await checkSupabaseConnection();
    setConn(status);
    setChecking(false);
  }, [remoteEnabled]);

  useEffect(() => {
    let cancelled = false;

    // Supabase init runs in background — UI is never blocked
    async function initSupabase() {
      if (!remoteEnabled) return;

      try {
        const ok = await hydrateFromSupabase();
        if (cancelled) return;
        setRemote(ok);

        const status = await quickSupabasePing();
        if (!cancelled) setConn(status);
      } catch (e) {
        console.warn('[CRM] Supabase background init failed:', e);
        if (!cancelled) {
          setConn({
            ok: false,
            latencyMs: 0,
            tables: {},
            error: e instanceof Error ? e.message : 'Connection failed',
          });
        }
      }
    }

    initSupabase();
    return () => {
      cancelled = true;
    };
  }, [remoteEnabled]);

  async function handleSync() {
    setSyncing(true);
    const result = await pushSnapshotToSupabase();
    setSyncing(false);
    if (result.ok) {
      await runConnectionCheck();
      const v = await verifyLocalMatchesRemote();
      setVerify(v);
      alert(`Đã push lên Supabase.\n\n${formatCounts(result.counts)}`);
    } else alert(result.error || 'Sync failed');
  }

  async function handleVerify() {
    setChecking(true);
    const v = await verifyLocalMatchesRemote();
    setVerify(v);
    await runConnectionCheck();
    setChecking(false);
  }

  async function handleCompleteMigration() {
    const ok = window.confirm(
      'Bước này sẽ:\n' +
        '1. Push toàn bộ data local lên Supabase\n' +
        '2. So sánh số dòng local vs remote\n' +
        '3. Xóa cache localStorage (ant-crm-v43)\n' +
        '4. Load lại từ Supabase\n\n' +
        'Tiếp tục?'
    );
    if (!ok) return;

    setSyncing(true);
    const result = await completeMigrationToSupabase();
    setSyncing(false);
    setVerify(result.verify ?? null);
    await runConnectionCheck();

    if (result.ok) {
      setRemote(true);
      alert('Migration hoàn tất! Trang sẽ reload để dùng Supabase làm nguồn chính.');
      window.location.reload();
    } else {
      alert(result.error || 'Migration failed');
    }
  }

  return (
    <SupabaseContext.Provider
      value={{
        remoteEnabled,
        remote,
        conn,
        verify,
        panelOpen,
        setPanelOpen,
        runConnectionCheck,
        checking,
        syncing,
        autoSync,
      }}
    >
      <AutoSyncListener />
      <div className={`crm-remote-banner${panelOpen ? ' open' : ''}${remoteEnabled ? '' : ' crm-remote-off'}`}>
        <button
          type="button"
          className="crm-remote-toggle"
          onClick={() => setPanelOpen((o) => !o)}
          title="Supabase migration panel"
        >
          <span className={`crm-conn-dot${conn?.ok ? ' ok' : conn ? ' fail' : remoteEnabled ? '' : ' fail'}`} />
          ☁ {remote ? 'Supabase loaded' : remoteEnabled ? 'Supabase mode' : 'Supabase (off)'}
          {autoSyncOn && autoSync.status === 'syncing' ? ' · đang lưu…' : ''}
          {autoSyncOn && autoSync.status === 'synced' && autoSync.lastSyncedAt
            ? ` · đã lưu ${autoSync.lastSyncedAt}`
            : ''}
          {autoSyncOn && autoSync.status === 'error' ? ' · lỗi lưu' : ''}
          {conn?.ok && conn.latencyMs ? ` · ${conn.latencyMs}ms` : ''}
        </button>

        {panelOpen && (
          <div className="crm-remote-panel">
            <div className="crm-remote-panel-head">
              <strong>Supabase Migration</strong>
              <button type="button" className="crm-remote-close" onClick={() => setPanelOpen(false)}>
                ✕
              </button>
            </div>

            {!remoteEnabled && (
              <div className="crm-remote-status">
                <span className="crm-status-fail">
                  ✗ Chưa bật Supabase. Kiểm tra .env.local: USE_SUPABASE=true, URL, anon key — rồi restart npm run dev
                </span>
              </div>
            )}

            {remoteEnabled && (
              <>
                <div className="crm-remote-status">
                  {conn?.ok ? (
                    <span className="crm-status-ok">✓ Kết nối OK ({conn.latencyMs}ms)</span>
                  ) : (
                    <span className="crm-status-fail">✗ {conn?.error || 'Đang kết nối…'}</span>
                  )}
                  {autoSyncOn && (
                    <div style={{ marginTop: 4, opacity: 0.95 }}>
                      Auto-sync:{' '}
                      {autoSync.status === 'idle' && 'bật — lưu lên Supabase sau ~2.5s khi bạn sửa'}
                      {autoSync.status === 'pending' && 'chờ lưu…'}
                      {autoSync.status === 'syncing' && 'đang lưu lên Supabase…'}
                      {autoSync.status === 'synced' && `đã lưu lúc ${autoSync.lastSyncedAt ?? '—'}`}
                      {autoSync.status === 'error' && `lỗi: ${autoSync.lastError ?? 'unknown'}`}
                    </div>
                  )}
                </div>

                <div className="crm-remote-actions">
                  <button type="button" onClick={runConnectionCheck} disabled={checking}>
                    {checking ? '…' : 'Test connection'}
                  </button>
                  <button type="button" onClick={handleSync} disabled={syncing}>
                    {syncing ? '…' : 'Push full snapshot'}
                  </button>
                  <button type="button" onClick={handleVerify} disabled={checking}>
                    Verify counts
                  </button>
                  <button type="button" className="danger" onClick={handleCompleteMigration} disabled={syncing}>
                    Hoàn tất migration
                  </button>
                </div>

                {verify && (
                  <div className="crm-remote-verify">
                    {verify.ok ? (
                      <div className="crm-status-ok">✓ Local và Supabase khớp nhau</div>
                    ) : (
                      <div className="crm-status-fail">
                        {verify.mismatches.length
                          ? verify.mismatches.map((m) => <div key={m}>{m}</div>)
                          : 'Verify failed'}
                      </div>
                    )}
                  </div>
                )}

                {conn?.ok && conn.tables && Object.keys(conn.tables).length > 0 && (
                  <details className="crm-remote-counts">
                    <summary>Row counts on Supabase</summary>
                    <ul>
                      {Object.entries(conn.tables)
                        .filter(([, n]) => n > 0)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([t, n]) => (
                          <li key={t}>
                            {t}: {n}
                          </li>
                        ))}
                    </ul>
                  </details>
                )}
              </>
            )}
          </div>
        )}
      </div>
      {children}
    </SupabaseContext.Provider>
  );
}

function formatCounts(counts?: Record<string, number>) {
  if (!counts) return '';
  return Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}: ${n}`)
    .join('\n');
}

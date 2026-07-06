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
  clearLocalPersistedData,
  completeMigrationToSupabase,
  getHydrationState,
  hydrateFromSupabase,
  isRemoteDataEnabled,
  pushSnapshotToSupabase,
  quickSupabasePing,
  subscribeHydration,
  verifyLocalMatchesRemote,
  type ConnectionStatus,
  type HydrationState,
  type VerifyResult,
} from '@/lib/db/hydrate';
import { markHydrationFailed, updateBaselineCounts } from '@/lib/db/sync-lifecycle';
import { countBackupRows } from '@/lib/db/sync-config';
import { isAutoSyncEnabled, isSupabaseReadOnly } from '@/lib/env';
import { useStore } from '@/lib/store';
import { SupabaseContext } from '@/lib/SupabaseContext';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [remote, setRemote] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [conn, setConn] = useState<ConnectionStatus | null>(null);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [autoSync, setAutoSync] = useState<AutoSyncState>(getAutoSyncState);
  const [hydration, setHydration] = useState<HydrationState>(getHydrationState);

  const remoteEnabled = isRemoteDataEnabled();
  const autoSyncOn = isAutoSyncEnabled();
  const readOnly = isSupabaseReadOnly();

  useEffect(() => subscribeAutoSync(setAutoSync), []);
  useEffect(() => subscribeHydration(setHydration), []);

  useEffect(() => {
    clearLocalPersistedData();
    if (!remoteEnabled) {
      markHydrationFailed(
        'Supabase bắt buộc — bật NEXT_PUBLIC_USE_SUPABASE=true và cấu hình URL + anon key trong .env.local'
      );
    }
  }, [remoteEnabled]);

  const runConnectionCheck = useCallback(async () => {
    if (!remoteEnabled) return;
    setChecking(true);
    const status = await checkSupabaseConnection();
    setConn(status);
    setChecking(false);
  }, [remoteEnabled]);

  const runHydrate = useCallback(async () => {
    if (!remoteEnabled) return false;
    const ok = await hydrateFromSupabase();
    if (ok) useStore.getState().rolloverIncompleteTasks();
    setRemote(ok);
    const status = await quickSupabasePing();
    setConn(status);
    return ok;
  }, [remoteEnabled]);

  useEffect(() => {
    let cancelled = false;

    async function initSupabase() {
      if (!remoteEnabled) return;

      try {
        const ok = await hydrateFromSupabase();
        if (cancelled) return;
        if (ok) useStore.getState().rolloverIncompleteTasks();
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

  async function handleSync(force = false) {
    if (force) {
      const backup = useStore.getState().exportBackup();
      const counts = countBackupRows(backup);
      const summary = Object.entries(counts)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k}: ${n}`)
        .join('\n');
      const ok = window.confirm(
        'Push toàn bộ snapshot lên Supabase?\n\n' +
          'Catalogue (products) chỉ upsert — không xóa orphan.\n' +
          'Các bảng khác có thể mirror nếu bạn chọn force.\n\n' +
          (summary || '(empty)') +
          '\n\nTiếp tục?'
      );
      if (!ok) return;
    }

    setSyncing(true);
    const result = await pushSnapshotToSupabase({ force });
    setSyncing(false);
    if (result.ok) {
      await runConnectionCheck();
      const v = await verifyLocalMatchesRemote();
      setVerify(v);
      if (v.ok) {
        updateBaselineCounts(countBackupRows(useStore.getState().exportBackup()));
      }
      const warn = result.warnings?.length ? `\n\nCảnh báo:\n${result.warnings.join('\n')}` : '';
      alert(`Đã push lên Supabase.${warn}\n\n${formatCounts(result.counts)}`);
    } else alert(result.error || 'Sync failed');
  }

  async function handleVerify() {
    setChecking(true);
    const v = await verifyLocalMatchesRemote();
    setVerify(v);
    await runConnectionCheck();
    setChecking(false);
  }

  async function handleRetryHydrate() {
    setChecking(true);
    await runHydrate();
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

  const hydrationLabel =
    hydration.phase === 'pending'
      ? 'Đang tải từ Supabase…'
      : hydration.phase === 'ready'
        ? 'Dữ liệu sẵn sàng'
        : `Lỗi tải: ${hydration.error ?? 'unknown'}`;

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
        hydration,
        readOnly,
      }}
    >
      <AutoSyncListener />
      {panelOpen && (
        <div className={`crm-remote-banner open${remoteEnabled ? '' : ' crm-remote-off'}`}>
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
                  ✗ CRM chỉ dùng Supabase — không còn lưu localStorage. Kiểm tra .env.local: USE_SUPABASE=true, URL, anon key — rồi restart npm run dev
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
                  <div style={{ marginTop: 4, opacity: 0.95 }}>
                    Hydrate: {hydrationLabel}
                  </div>
                  {readOnly && (
                    <div style={{ marginTop: 4, opacity: 0.95 }} className="crm-status-fail">
                      Chế độ chỉ đọc — không ghi lên Supabase
                    </div>
                  )}
                  {autoSyncOn && !readOnly && (
                    <div style={{ marginTop: 4, opacity: 0.95 }}>
                      Auto-sync:{' '}
                      {hydration.phase !== 'ready' && 'chờ hydrate…'}
                      {hydration.phase === 'ready' && autoSync.status === 'idle' && 'bật — lưu sau ~2.5s khi bạn sửa'}
                      {autoSync.status === 'pending' && 'chờ lưu…'}
                      {autoSync.status === 'syncing' && 'đang lưu lên Supabase…'}
                      {autoSync.status === 'synced' && `đã lưu lúc ${autoSync.lastSyncedAt ?? '—'}`}
                      {autoSync.status === 'blocked' && `bị chặn: ${autoSync.lastError ?? '—'}`}
                      {autoSync.status === 'error' && `lỗi: ${autoSync.lastError ?? 'unknown'}`}
                    </div>
                  )}
                </div>

                <div className="crm-remote-actions">
                  <button type="button" onClick={runConnectionCheck} disabled={checking}>
                    {checking ? '…' : 'Test connection'}
                  </button>
                  {hydration.phase === 'failed' && (
                    <button type="button" onClick={handleRetryHydrate} disabled={checking}>
                      {checking ? '…' : 'Thử load lại'}
                    </button>
                  )}
                  <button type="button" onClick={() => handleSync(false)} disabled={syncing || readOnly}>
                    {syncing ? '…' : 'Push snapshot'}
                  </button>
                  <button type="button" onClick={() => handleSync(true)} disabled={syncing || readOnly}>
                    {syncing ? '…' : 'Push có xác nhận'}
                  </button>
                  <button type="button" onClick={handleVerify} disabled={checking}>
                    Verify counts
                  </button>
                  <button type="button" className="danger" onClick={handleCompleteMigration} disabled={syncing || readOnly}>
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
        </div>
      )}
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

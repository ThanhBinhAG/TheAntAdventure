'use client';

import { useCallback, useEffect, useState } from 'react';
import type { DiagnosticsReport } from '@/lib/system/run-diagnostics';
import type { DebugLogEntry } from '@/lib/system/debug-logger';

type DebugPanelProps = {
  token: string;
};

export function DebugPanel({ token }: DebugPanelProps) {
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = { 'X-Debug-Token': token };

  const runDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/system/diagnostics', { headers });
      if (!res.ok) {
        setError(res.status === 404 ? 'Debug mode tắt hoặc token sai.' : `HTTP ${res.status}`);
        return;
      }
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Diagnostics failed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/system/logs', { headers });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs ?? []);
      }
    } catch {
      /* ignore refresh errors */
    }
  }, [token]);

  useEffect(() => {
    void runDiagnostics();
    void fetchLogs();
    const id = setInterval(() => void fetchLogs(), 5000);
    return () => clearInterval(id);
  }, [runDiagnostics, fetchLogs]);

  return (
    <div className="debug-page">
      <div className="debug-header">
        <h1 className="debug-title">System Diagnostics</h1>
        <p className="debug-subtitle">Chế độ debug — chỉ dùng khi troubleshoot. Tắt SYSTEM_DEBUG sau khi xong.</p>
        <button className="btn btn-p btn-sm" type="button" onClick={() => void runDiagnostics()} disabled={loading}>
          {loading ? 'Đang chạy…' : 'Run diagnostics'}
        </button>
      </div>

      {error && <div className="login-error debug-block">{error}</div>}

      {report && (
        <div className="card debug-block">
          <div className="card-hd">
            <span className="card-title">Kết quả ({report.summary.passed}/{report.summary.total} pass)</span>
            <span className="debug-ts">{report.generatedAt}</span>
          </div>
          <div className="debug-checks">
            {report.checks.map((check) => (
              <div key={check.name} className={`debug-check${check.ok ? ' ok' : ' fail'}`}>
                <div className="debug-check-hd">
                  <span className="debug-check-icon">{check.ok ? '✓' : '✗'}</span>
                  <strong>{check.name}</strong>
                  {check.latencyMs != null && <span className="debug-latency">{check.latencyMs}ms</span>}
                </div>
                {check.error && <div className="debug-check-err">{check.error}</div>}
                {check.hint && <div className="debug-check-hint">{check.hint}</div>}
                {check.details && (
                  <pre className="debug-check-details">{JSON.stringify(check.details, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card debug-block">
        <div className="card-hd">
          <span className="card-title">Recent logs ({logs.length})</span>
          <button className="btn btn-s btn-sm" type="button" onClick={() => void fetchLogs()}>
            Refresh
          </button>
        </div>
        <div className="debug-logs">
          {logs.length === 0 ? (
            <p className="debug-empty">Chưa có log. Thử đăng nhập hoặc navigate để sinh log.</p>
          ) : (
            logs
              .slice()
              .reverse()
              .map((entry) => (
                <div key={entry.id} className={`debug-log-row level-${entry.level}`}>
                  <span className="debug-log-ts">{entry.ts.slice(11, 19)}</span>
                  <span className="debug-log-cat">{entry.category}</span>
                  <span className="debug-log-msg">{entry.message}</span>
                  {entry.meta && (
                    <pre className="debug-log-meta">{JSON.stringify(entry.meta)}</pre>
                  )}
                </div>
              ))
          )}
        </div>
      </div>

      <div className="card debug-block">
        <div className="card-hd">
          <span className="card-title">Hướng dẫn admin (SSH)</span>
        </div>
        <div className="debug-admin-help">
          <p>Log stdout (pm2):</p>
          <pre className="debug-cmd">pm2 logs --lines 200 | grep system-debug</pre>
          <p>Test SSL domain:</p>
          <pre className="debug-cmd">curl -vI https://your-domain.com 2&gt;&amp;1 | head -40</pre>
          <p>Test Supabase từ server:</p>
          <pre className="debug-cmd">curl -sI &quot;$NEXT_PUBLIC_SUPABASE_URL/auth/v1/health&quot;</pre>
          <p className="login-hint">Sau khi fix xong: set SYSTEM_DEBUG=false và restart app.</p>
        </div>
      </div>
    </div>
  );
}

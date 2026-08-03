'use client';

import { useState, type FormEvent } from 'react';
import { DebugPanel } from '@/components/system/DebugPanel';

const STORAGE_KEY = 'system-debug-token';

function getStoredToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function DebugPanelClient() {
  const [token, setToken] = useState(getStoredToken);
  const [draft, setDraft] = useState(getStoredToken);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = draft.trim();
    setToken(next);
    try {
      if (next) sessionStorage.setItem(STORAGE_KEY, next);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const clearToken = () => {
    setToken('');
    setDraft('');
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  if (!token) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-title">System Debug</div>
            <div className="login-subtitle">Nhập debug token</div>
          </div>
          <p className="login-hint">
            Token lấy từ env server <code>SYSTEM_DEBUG_TOKEN</code>. Gửi qua header{' '}
            <code>X-Debug-Token</code> (không dùng query string).
          </p>
          <form onSubmit={submit} className="login-form">
            <label className="lbl" htmlFor="debug-token">
              Debug token
            </label>
            <input
              id="debug-token"
              className="inp"
              type="password"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="SYSTEM_DEBUG_TOKEN"
            />
            <button className="btn btn-p" type="submit" disabled={!draft.trim()}>
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page debug-page-wrap">
      <div className="debug-token-bar" style={{ marginBottom: 12, textAlign: 'right' }}>
        <button className="btn btn-sm" type="button" onClick={clearToken}>
          Clear token
        </button>
      </div>
      <DebugPanel token={token} />
    </div>
  );
}

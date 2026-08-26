'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { PAGE_TITLES } from '@/lib/constants';
import { localTodayIso } from '@/lib/core/date-utils';
import { useLanguage } from '@/hooks/useLanguage';
import { useStore } from '@/hooks/useStore';
import { useSupabasePanel } from '@/lib/context/SupabaseContext';
import { isAutoSyncEnabled } from '@/lib/env';
import { cancelSessionRefreshRequest } from '@/lib/auth/refresh-request-control';
import { AiCopilotTrigger } from '@/components/AiCopilot';
import type { PageSlug } from '@/lib/types';
import { toast } from '@/lib/toast';

interface TopbarProps {
  onMenuToggle: () => void;
  /** When true, show the sidebar hamburger on desktop (unpinned mode). Mobile always shows via CSS. */
  showMenuToggle?: boolean;
  /** Server-masked login email (e.g. nv***************); omit welcome when null. */
  sessionEmailMasked?: string | null;
}

export default function Topbar({
  onMenuToggle,
  showMenuToggle = false,
  sessionEmailMasked = null,
}: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const page = (pathname.split('/').pop() || 'dashboard') as PageSlug;
  const { language, setLanguage, pageTitle, t } = useLanguage();
  const exportBackup = useStore((s) => s.exportBackup);
  const importBackup = useStore((s) => s.importBackup);
  const setLastBackup = useStore((s) => s.setLastBackup);
  const lastBackup = useStore((s) => s.lastBackup);
  const customers = useStore((s) => s.customers);
  const leads = useStore((s) => s.leads);
  const bookings = useStore((s) => s.bookings);
  const fileRef = useRef<HTMLInputElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const supabase = useSupabasePanel();

  const title = pageTitle(PAGE_TITLES[page] || page);

  useEffect(() => {
    if (!toolsOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [toolsOpen]);

  const connDotClass = `crm-conn-dot${
    supabase?.conn?.ok ? ' ok' : supabase?.conn ? ' fail' : supabase?.remoteEnabled ? '' : ' fail'
  }`;

  const autoSyncOn = isAutoSyncEnabled();
  const readOnly = Boolean(supabase?.readOnly);

  const syncStatusLine =
    (supabase?.remoteEnabled && supabase.autoSync?.status === 'synced' && supabase.autoSync.lastSyncedAt
      ? `Supabase saved: ${supabase.autoSync.lastSyncedAt} · `
      : supabase?.remoteEnabled && supabase.autoSync?.status === 'error'
        ? `Supabase save failed${supabase.autoSync.lastError ? `: ${supabase.autoSync.lastError}` : ''} · `
        : supabase?.remoteEnabled && readOnly
          ? 'Read-only · '
          : supabase?.remoteEnabled && autoSyncOn
            ? 'Auto-sync on · '
            : supabase?.remoteEnabled
              ? 'Auto-sync off · '
              : '') + `Last backup: ${lastBackup || 'never'}`;

  const handleExport = () => {
    const data = exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ant-crm-backup-${localTodayIso()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const ts = new Date().toLocaleString("en-US");
    setLastBackup(ts);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        importBackup(data);
      } catch {
        toast.error('Invalid backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLogout = async () => {
    cancelSessionRefreshRequest();
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* redirect even if logout fails */
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <div id="topbar">
      <button
        id="menu-toggle"
        className={showMenuToggle ? 'menu-toggle-visible' : undefined}
        onClick={onMenuToggle}
        title="Menu"
        type="button"
        aria-label="Mở menu điều hướng"
      >
        ☰
      </button>
      <div className="tb-heading">
        <span className="tb-title">{title}</span>
        {sessionEmailMasked ? (
          <span className="tb-welcome" title={sessionEmailMasked}>
            {' '}
            {t('Welcome', 'Chào mừng')}, <span className="tb-welcome-id">{sessionEmailMasked}</span>
          </span>
        ) : null}
      </div>
      <div style={{ flex: 1 }} />
      <div id="gsearch-wrap" style={{ position: 'relative', maxWidth: 280, flex: 1 }}>
        <input
          id="gsearch-input"
          type="text"
          placeholder="🔍 Search clients, tours, bookings…"
          style={{
            width: '100%',
            padding: '6px 12px',
            border: '1.5px solid var(--b)',
            borderRadius: 8,
            fontFamily: 'inherit',
            fontSize: 12,
            background: 'var(--bg)',
            color: 'var(--t)',
            boxSizing: 'border-box',
            outline: 'none',
          }}
          onChange={(e) => {
            const q = e.target.value.toLowerCase();
            if (q.length < 2) return;
            const results = [
              ...customers.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 3),
              ...leads.filter((l) => l.tour.toLowerCase().includes(q)).slice(0, 3),
              ...bookings.filter((b) => b.tour.toLowerCase().includes(q)).slice(0, 3),
            ];
            if (results.length === 0 && q.length >= 2) {
              /* dropdown could be expanded later */
            }
          }}
        />
      </div>
      <AiCopilotTrigger />
      <div
        className="tb-lang"
        title="Switch language / Đổi ngôn ngữ"
      >
        <button
          id="lang-en-btn"
          onClick={() => setLanguage('en')}
          type="button"
          className={`tb-lang-btn${language === 'en' ? ' is-active' : ''}`}
        >
          EN
        </button>
        <button
          id="lang-vi-btn"
          onClick={() => setLanguage('vi')}
          type="button"
          className={`tb-lang-btn${language === 'vi' ? ' is-active' : ''}`}
        >
          VN
        </button>
      </div>
      <div className="tb-tools" ref={toolsRef}>
        <div
          id="tb-tools-rail"
          className={`tb-tools-rail${toolsOpen ? ' is-open' : ''}`}
          aria-hidden={!toolsOpen}
        >
          <button
            className="btn btn-s btn-sm crm-supabase-topbtn"
            type="button"
            title={
              supabase?.remoteEnabled
                ? `Supabase — click to open panel · ${syncStatusLine}`
                : 'Supabase chưa bật — kiểm tra .env.local'
            }
            onClick={() => supabase?.setPanelOpen(!supabase?.panelOpen)}
            style={supabase?.remoteEnabled ? undefined : { opacity: 0.55 }}
            tabIndex={toolsOpen ? undefined : -1}
          >
            <span className={connDotClass} />
            ☁ Supabase
            {supabase?.autoSync?.status === 'syncing' ? ' ↻' : ''}
            {supabase?.autoSync?.status === 'pending' ? ' …' : ''}
          </button>
          <button
            className="btn btn-s btn-sm"
            onClick={handleExport}
            type="button"
            title={`Download JSON backup · Last backup: ${lastBackup || 'never'}`}
            tabIndex={toolsOpen ? undefined : -1}
          >
            ⬇ Backup
          </button>
          <button
            className="btn btn-s btn-sm"
            onClick={() => fileRef.current?.click()}
            type="button"
            title="Restore from backup"
            tabIndex={toolsOpen ? undefined : -1}
          >
            ⬆ Restore
          </button>
          <button
            className="btn btn-s btn-sm"
            onClick={handleLogout}
            type="button"
            title="Đăng xuất"
            tabIndex={toolsOpen ? undefined : -1}
          >
            ⎋ Logout
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
        <button
          className="btn btn-s btn-sm tb-tools-toggle"
          type="button"
          title={
            toolsOpen
              ? 'Thu gọn công cụ hệ thống'
              : `Mở công cụ hệ thống · ${syncStatusLine}`
          }
          aria-expanded={toolsOpen}
          aria-controls="tb-tools-rail"
          aria-label={toolsOpen ? 'Thu gọn công cụ hệ thống' : 'Mở công cụ hệ thống'}
          onClick={() => setToolsOpen((v) => !v)}
        >
          {!toolsOpen && <span className={connDotClass} aria-hidden />}
          <span className="tb-tools-toggle-icon" aria-hidden>
            ☰
          </span>
        </button>
      </div>
    </div>
  );
}

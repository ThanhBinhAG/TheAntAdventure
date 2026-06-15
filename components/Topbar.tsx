'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { PAGE_TITLES, QUICK_NAV_PAGES } from '@/lib/constants';
import { useLanguage } from '@/hooks/useLanguage';
import { useStore } from '@/hooks/useStore';
import { useSupabasePanel } from '@/lib/SupabaseContext';
import type { PageSlug } from '@/lib/types';

interface TopbarProps {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const pathname = usePathname();
  const page = (pathname.split('/').pop() || 'dashboard') as PageSlug;
  const { language, setLanguage, pageTitle } = useLanguage();
  const exportBackup = useStore((s) => s.exportBackup);
  const importBackup = useStore((s) => s.importBackup);
  const setLastBackup = useStore((s) => s.setLastBackup);
  const lastBackup = useStore((s) => s.lastBackup);
  const customers = useStore((s) => s.customers);
  const leads = useStore((s) => s.leads);
  const bookings = useStore((s) => s.bookings);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = useSupabasePanel();

  const title = pageTitle(PAGE_TITLES[page] || page);

  const handleExport = () => {
    const data = exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ant-crm-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div id="topbar">
      <button id="menu-toggle" onClick={onMenuToggle} title="Menu" type="button">
        ☰
      </button>
      <span className="tb-title">{title}</span>
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginLeft: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            className="btn btn-s btn-sm crm-supabase-topbtn"
            type="button"
            title={supabase?.remoteEnabled ? 'Supabase — click to open panel' : 'Supabase chưa bật — kiểm tra .env.local'}
            onClick={() => supabase?.setPanelOpen(!supabase?.panelOpen)}
            style={supabase?.remoteEnabled ? undefined : { opacity: 0.55 }}
          >
            <span
              className={`crm-conn-dot${
                supabase?.conn?.ok ? ' ok' : supabase?.conn ? ' fail' : supabase?.remoteEnabled ? '' : ' fail'
              }`}
            />
            ☁ Supabase
            {supabase?.autoSync?.status === 'syncing' ? ' ↻' : ''}
            {supabase?.autoSync?.status === 'pending' ? ' …' : ''}
          </button>
          <button className="btn btn-s btn-sm" onClick={handleExport} type="button" title="Download JSON backup">
            ⬇ Backup
          </button>
          <button className="btn btn-s btn-sm" onClick={() => fileRef.current?.click()} type="button" title="Restore from backup">
            ⬆ Restore
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
        <div id="last-backup-label" style={{ fontSize: 10, color: 'var(--m)', whiteSpace: 'nowrap' }}>
          {supabase?.remoteEnabled && supabase.autoSync?.status === 'synced' && supabase.autoSync.lastSyncedAt
            ? `Supabase saved: ${supabase.autoSync.lastSyncedAt} · `
            : supabase?.remoteEnabled && supabase.autoSync?.status === 'error'
              ? 'Supabase save failed · '
              : supabase?.remoteEnabled
                ? 'Auto-sync on · '
                : ''}
          Last backup: {lastBackup || 'never'}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          background: 'var(--bg)',
          border: '1px solid var(--b)',
          borderRadius: 8,
          padding: 3,
          gap: 2,
          marginLeft: 8,
        }}
        title="Switch language / Đổi ngôn ngữ"
      >
        <button
          id="lang-en-btn"
          onClick={() => setLanguage('en')}
          type="button"
          style={{
            padding: '5px 14px',
            borderRadius: 6,
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: language === 'en' ? 'var(--g)' : 'transparent',
            color: language === 'en' ? '#fff' : 'var(--m)',
            letterSpacing: '0.5px',
          }}
        >
          EN
        </button>
        <button
          id="lang-vi-btn"
          onClick={() => setLanguage('vi')}
          type="button"
          style={{
            padding: '5px 14px',
            borderRadius: 6,
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            background: language === 'vi' ? 'var(--g)' : 'transparent',
            color: language === 'vi' ? '#fff' : 'var(--m)',
            letterSpacing: '0.5px',
          }}
        >
          VN
        </button>
      </div>
    </div>
  );
}

export function QuickNav() {
  const pathname = usePathname();
  const current = (pathname.split('/').pop() || 'dashboard') as PageSlug;
  const { t } = useLanguage();

  const labels: Record<string, { en: string; vi: string; icon: string }> = {
    dashboard: { en: 'Dashboard', vi: 'Bảng điều hành', icon: '◈' },
    sales: { en: 'Sales Pipeline', vi: 'Kênh bán hàng', icon: '◉' },
    tourdesign: { en: 'Tour Design', vi: 'Thiết kế tour', icon: '✦' },
    bookings: { en: 'Bookings', vi: 'Đặt tour', icon: '▣' },
  };

  return (
    <div id="quicknav">
      {QUICK_NAV_PAGES.map((p) => (
        <Link
          key={p}
          href={`/${p}`}
          id={`qnav-${p}`}
          className={`qnav-btn${current === p ? ' active' : ''}`}
        >
          {labels[p]?.icon} {labels[p] ? t(labels[p].en, labels[p].vi) : p}
        </Link>
      ))}
    </div>
  );
}

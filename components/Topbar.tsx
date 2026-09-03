'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { localTodayIso } from '@/lib/core/date-utils';
import { useStore } from '@/hooks/useStore';
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
  const { language, setLanguage, pageTitle, tp } = useLanguage();
  const exportBackup = useStore((s) => s.exportBackup);
  const importBackup = useStore((s) => s.importBackup);
  const setLastBackup = useStore((s) => s.setLastBackup);
  const lastBackup = useStore((s) => s.lastBackup);
  const fileRef = useRef<HTMLInputElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const [toolsOpen, setToolsOpen] = useState(false);

  const title = pageTitle(page);

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

  const backupStatusLine = tp('chrome', 'toolsExpand').replace(
    '{status}',
    lastBackup || tp('chrome', 'lastBackupNever')
  );

  const handleExport = () => {
    const data = exportBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ant-crm-backup-${localTodayIso()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    const ts = new Date().toLocaleString('en-US');
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
        toast.error(tp('chrome', 'toastInvalidBackup'));
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
        title={tp('chrome', 'menuTitle')}
        type="button"
        aria-label={tp('chrome', 'menuAriaOpen')}
      >
        ☰
      </button>
      <div className="tb-heading">
        <span className="tb-title">{title}</span>
        {sessionEmailMasked ? (
          <span className="tb-welcome" title={sessionEmailMasked}>
            {' '}
            {tp('chrome', 'welcome')}, <span className="tb-welcome-id">{sessionEmailMasked}</span>
          </span>
        ) : null}
      </div>
      <div style={{ flex: 1 }} />
      <AiCopilotTrigger />
      <div
        className="tb-lang"
        title={tp('chrome', 'langSwitchTitle')}
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
            className="btn btn-s btn-sm"
            onClick={handleExport}
            type="button"
            title={backupStatusLine}
            tabIndex={toolsOpen ? undefined : -1}
          >
            {tp('chrome', 'backup')}
          </button>
          <button
            className="btn btn-s btn-sm"
            onClick={() => fileRef.current?.click()}
            type="button"
            title={tp('chrome', 'restoreTitle')}
            tabIndex={toolsOpen ? undefined : -1}
          >
            {tp('chrome', 'restore')}
          </button>
          <button
            className="btn btn-s btn-sm"
            onClick={handleLogout}
            type="button"
            title={tp('chrome', 'logoutTitle')}
            tabIndex={toolsOpen ? undefined : -1}
          >
            {tp('chrome', 'logout')}
          </button>
          <input ref={fileRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
        </div>
        <button
          className="btn btn-s btn-sm tb-tools-toggle"
          type="button"
          title={
            toolsOpen
              ? tp('chrome', 'toolsCollapse')
              : tp('chrome', 'toolsExpand').replace(
                  '{status}',
                  lastBackup || tp('chrome', 'lastBackupNever')
                )
          }
          aria-expanded={toolsOpen}
          aria-controls="tb-tools-rail"
          aria-label={toolsOpen ? tp('chrome', 'toolsCollapse') : tp('chrome', 'toolsExpand').replace('{status}', lastBackup || tp('chrome', 'lastBackupNever'))}
          onClick={() => setToolsOpen((v) => !v)}
        >
          <span className="tb-tools-toggle-icon" aria-hidden>
            ☰
          </span>
        </button>
      </div>
    </div>
  );
}

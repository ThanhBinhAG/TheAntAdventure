'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { NAV_SECTIONS, type NavItem } from '@/lib/constants';
import { useLanguage } from '@/hooks/useLanguage';
import { useStore } from '@/hooks/useStore';
import { countActiveTasks } from '@/lib/planner-task-utils';
import { countTourDesignAttention } from '@/lib/tour-design-leads';
import type { Lead, PageSlug, Task, TourDraft } from '@/lib/types';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const current = (pathname.split('/').pop() || 'dashboard') as PageSlug;
  const tasks = useStore((s) => s.tasks) as Task[];
  const leads = useStore((s) => s.leads) as Lead[];
  const tourDrafts = useStore((s) => s.tourDrafts) as TourDraft[];
  const messages = useStore((s) => s.messages);

  const activeTaskCount = useMemo(() => countActiveTasks(tasks), [tasks]);
  const pendingTourDesign = useMemo(
    () => countTourDesignAttention(leads, tourDrafts),
    [leads, tourDrafts]
  );

  const groupPages = useMemo(
    () =>
      new Set(
        NAV_SECTIONS.flatMap((s) => s.items)
          .filter((i) => i.children?.length)
          .flatMap((i) => i.children!.map((c) => c.page))
      ),
    []
  );
  const [openGroup, setOpenGroup] = useState<PageSlug | null>(null);

  // Keep the group holding the active page open across navigations.
  useEffect(() => {
    if (!groupPages.has(current)) return;
    const owner = NAV_SECTIONS.flatMap((s) => s.items).find((i) =>
      i.children?.some((c) => c.page === current)
    );
    if (owner) setOpenGroup(owner.page);
  }, [current, groupPages]);

  const chatUnread = useMemo(() => {
    let count = 0;
    Object.values(messages).forEach((ch) => {
      count += Array.isArray(ch) ? ch.length : 0;
    });
    return count > 0 ? Math.min(count, 99) : 0;
  }, [messages]);

  return (
    <>
      <div id="sb-overlay" className={open ? 'open' : ''} onClick={onClose} />
      <div id="sb" className={open ? 'open' : ''}>
        <div className="sb-logo" style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div
            style={{
              width: 112,
              height: 112,
              borderRadius: '50%',
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
              overflow: 'hidden',
            }}
          >
            <Image src="/Logo-3.svg" alt="The Ant Adventures" width={100} height={100} style={{ height: 'auto', display: 'block' }} priority />
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: 9,
              color: 'rgba(255,255,255,0.65)',
              letterSpacing: '0.8px',
              fontStyle: 'italic',
              lineHeight: 1.4,
              marginBottom: 5,
            }}
          >
            Where Authentic Adventure Begins
          </div>
          <div className="sb-sub" style={{ textAlign: 'center' }}>
            CRM System · v4.3
          </div>
        </div>

        {NAV_SECTIONS.map((section) => (
          <div key={section.en}>
            <div className="sb-sec">{language === 'vi' ? section.vi : section.en}</div>
            {section.items.map((item) =>
              item.children?.length ? (
                <NavGroup
                  key={item.page}
                  item={item}
                  current={current}
                  open={openGroup === item.page}
                  label={t(item.en, item.vi)}
                  onToggle={() => setOpenGroup((prev) => (prev === item.page ? null : item.page))}
                  onNavigate={onClose}
                  translate={t}
                />
              ) : (
              <Link
                key={item.page}
                href={`/${item.page}`}
                className={`sbi${current === item.page ? ' on' : ''}`}
                title={t(item.en, item.vi)}
                onClick={onClose}
              >
                <span className="sb-icon">{item.icon}</span>
                <span className="sb-label">{t(item.en, item.vi)}</span>
                {item.badge && item.badgeType === 'ceo' && <span className="sb-badge">{item.badge}</span>}
                {item.badge && item.badgeType === 'new' && <span className="sb-new">{item.badge}</span>}
                {item.page === 'planner' && activeTaskCount > 0 && (
                  <span className="sb-overdue-badge">{activeTaskCount}</span>
                )}
                {item.page === 'tourdesign' && pendingTourDesign > 0 && (
                  <span className="sb-overdue-badge">{pendingTourDesign}</span>
                )}
                {item.page === 'teamchat' && chatUnread > 0 && (
                  <span className="sb-chat-badge">{chatUnread}</span>
                )}
              </Link>
              )
            )}
          </div>
        ))}
      </div>
    </>
  );
}

interface NavGroupProps {
  item: NavItem;
  current: PageSlug;
  open: boolean;
  label: string;
  onToggle: () => void;
  onNavigate: () => void;
  translate: (en: string, vi: string) => string;
}

function NavGroup({ item, current, open, label, onToggle, onNavigate, translate }: NavGroupProps) {
  const children = item.children ?? [];
  const activeChild = children.find((c) => c.page === current);

  return (
    <div className={`sb-group${open ? ' open' : ''}`}>
      <button
        type="button"
        className={`sbi sb-group-head${activeChild ? ' on' : ''}`}
        onClick={onToggle}
        aria-expanded={open}
        title={label}
      >
        <span className="sb-icon">{item.icon}</span>
        <span className="sb-label">{label}</span>
        <span className={`sb-caret${open ? ' open' : ''}`}>▸</span>
      </button>

      {open && (
        <div className="sb-subnav">
          {children.map((child) => (
            <Link
              key={child.page}
              href={`/${child.page}`}
              className={`sbi sb-subitem${current === child.page ? ' on' : ''}`}
              title={translate(child.en, child.vi)}
              onClick={onNavigate}
            >
              <span className="sb-icon sb-subicon">{child.icon}</span>
              <span className="sb-label">{translate(child.en, child.vi)}</span>
              {child.badge && child.badgeType === 'new' && <span className="sb-new">{child.badge}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { NAV_SECTIONS } from '@/lib/constants';
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
            {section.items.map((item) => (
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
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

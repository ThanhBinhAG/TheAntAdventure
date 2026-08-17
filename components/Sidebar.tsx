'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { NAV_SECTIONS, type NavItem } from '@/lib/constants';
import { useLanguage } from '@/hooks/useLanguage';
import { useStore } from '@/hooks/useStore';
import { countActiveTasks } from '@/lib/planner/planner-task-utils';
import { countTourDesignAttention } from '@/lib/tour-design/tour-design-leads';
import type { Lead, PageSlug, Task, TourDraft } from '@/lib/types';
import { canReadPage, canWritePage } from '@/lib/auth/permissions';
import { usePermissions } from '@/components/PermissionsProvider';
import CompanyLogoEditor from '@/components/sidebar/CompanyLogoEditor';
import StorageImage from '@/components/gallery/StorageImage';
import {
  fetchCompanyLogoUrlClient,
  getCachedCompanyLogoUrl,
} from '@/lib/storage/company-logo-client';

const DEFAULT_LOGO = '/Logo-3.svg';

function subscribeCompanyLogoCache() {
  return () => {};
}

function getServerCompanyLogoUrl(): undefined {
  return undefined;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  pinned: boolean;
  onPinnedChange: (pinned: boolean) => void;
}

export default function Sidebar({ open, onClose, pinned, onPinnedChange }: SidebarProps) {
  const pathname = usePathname();
  const { language, t } = useLanguage();
  const { permissionCodes, loading, error } = usePermissions();
  const current = (pathname.split('/').pop() || 'dashboard') as PageSlug;
  const tasks = useStore((s) => s.tasks) as Task[];
  const leads = useStore((s) => s.leads) as Lead[];
  const tourDrafts = useStore((s) => s.tourDrafts) as TourDraft[];
  const messages = useStore((s) => s.messages);
  /**
   * undefined = unknown; null = default SVG; string = custom Storage URL.
   * Server snapshot stays undefined so SSR HTML matches hydration.
   * After hydrate, useSyncExternalStore reads the module/localStorage cache
   * without a layout-effect setState.
   */
  const cachedLogoUrl = useSyncExternalStore(
    subscribeCompanyLogoCache,
    getCachedCompanyLogoUrl,
    getServerCompanyLogoUrl
  );
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(undefined);
  const [logoEditorOpen, setLogoEditorOpen] = useState(false);
  const displayLogoUrl = logoUrl !== undefined ? logoUrl : cachedLogoUrl;

  useEffect(() => {
    let cancelled = false;
    void fetchCompanyLogoUrlClient().then((url) => {
      if (!cancelled) setLogoUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Badge counts: 0 until Planner / Tour Design / sales (etc.) hydrate those tables.
  // No global sidebar prefetch on unrelated routes (e.g. Access Control).
  const activeTaskCount = useMemo(() => countActiveTasks(tasks), [tasks]);
  const pendingTourDesign = useMemo(
    () => countTourDesignAttention(leads, tourDrafts),
    [leads, tourDrafts]
  );

  // Chỉ giữ các menu mà user có quyền xem.
  const visibleSections = useMemo(
    () =>
      NAV_SECTIONS
        .map((section) => ({
          ...section,
          items: section.items
            .map((item) => {
              // Menu nhóm: chỉ giữ các menu con được phép.
              if (item.children?.length) {
                const children = item.children.filter((child) =>
                  canReadPage(permissionCodes, child.page),
                );

                return children.length > 0
                  ? { ...item, children }
                  : null;
              }

              // Menu đơn: giữ khi có quyền xem trang tương ứng.
              return canReadPage(permissionCodes, item.page)
                ? item
                : null;
            })
            .filter((item): item is NavItem => item !== null),
        }))
        .filter((section) => section.items.length > 0),
    [permissionCodes],
  );

  const groupPages = useMemo(() => {
    return new Set(
      visibleSections
        .flatMap((section) => section.items)
        .filter((item) => item.children?.length)
        .flatMap((item) => item.children!.map((child) => child.page)),
    );
  }, [visibleSections]);
  const [openGroup, setOpenGroup] = useState<PageSlug | null>(null);
  const [previousPage, setPreviousPage] = useState(current);

  // Keep the group holding the active page open across navigations.
  if (current !== previousPage) {
    setPreviousPage(current);
    if (groupPages.has(current)) {
      const owner = visibleSections.flatMap((s) => s.items).find((i) =>
        i.children?.some((c) => c.page === current)
      );
      setOpenGroup(owner?.page ?? null);
    }
  }

  // Unread badge: 0 until messages idle-load / Team Chat hydrate (not part of shell boot).
  const chatUnread = useMemo(() => {
    if (!messages || typeof messages !== 'object') return 0;
    let count = 0;
    Object.values(messages).forEach((ch) => {
      count += Array.isArray(ch) ? ch.length : 0;
    });
    return count > 0 ? Math.min(count, 99) : 0;
  }, [messages]);

  const canEditLogo = canWritePage(permissionCodes, 'about');
  const isPendingLogo = displayLogoUrl === undefined;
  const isCustomLogo = typeof displayLogoUrl === 'string' && displayLogoUrl.length > 0;

  return (
    <>
      <div id="sb-overlay" className={open ? 'open' : ''} onClick={onClose} />
      <div id="sb" className={open ? 'open' : ''}>
        <div className="sb-logo" style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="sb-logo-head">
            <button
              type="button"
              className={`sb-pin-btn${pinned ? ' is-pinned' : ''}`}
              title={pinned ? 'Bỏ ghim cột (ẩn sidebar)' : 'Ghim cột (luôn hiện)'}
              aria-pressed={pinned}
              aria-label={pinned ? 'Bỏ ghim cột điều hướng' : 'Ghim cột điều hướng'}
              onClick={() => onPinnedChange(!pinned)}
            >
              {pinned ? '📌' : '📍'}
            </button>
          </div>
          <div
            className={`sb-logo-avatar${isCustomLogo ? ' sb-logo-avatar--custom' : ''}${isPendingLogo ? ' sb-logo-avatar--pending' : ''}`}
          >
            <div className="sb-logo-avatar-img" aria-busy={isPendingLogo || undefined}>
              {isPendingLogo ? null : isCustomLogo ? (
                <StorageImage
                  src={displayLogoUrl}
                  alt="The Ant Adventures"
                  width={112}
                  height={112}
                  className="sb-logo-custom"
                  style={{ objectFit: 'cover', width: 112, height: 112 }}
                  loading="eager"
                  unoptimized
                />
              ) : (
                <Image
                  src={DEFAULT_LOGO}
                  alt="The Ant Adventures"
                  width={100}
                  height={100}
                  style={{ height: 'auto', display: 'block' }}
                  priority
                />
              )}
            </div>
            {canEditLogo && (
              <button
                type="button"
                className="sb-logo-edit"
                title="Change company logo"
                aria-label="Change company logo"
                onClick={() => setLogoEditorOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.1-1.6A1.5 1.5 0 0 1 10 3.5h4a1.5 1.5 0 0 1 1.2.9L16.3 6h1.2A2.5 2.5 0 0 1 20 8.5v9A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-9Z"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="13" r="3.25" stroke="currentColor" strokeWidth="1.75" />
                </svg>
              </button>
            )}
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

        {loading ? (
          <div className="sb-sec">Đang tải quyền…</div>
        ) : error ? (
          <div className="sb-sec">Không thể tải quyền</div>
        ) : (
          visibleSections.map((section) => (
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
          )))}
      </div>
      <CompanyLogoEditor
        open={logoEditorOpen}
        onClose={() => setLogoEditorOpen(false)}
        onSaved={setLogoUrl}
      />
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

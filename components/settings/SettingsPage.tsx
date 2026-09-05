'use client';

import { useCallback, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { usePermissions } from '@/components/PermissionsProvider';
import { canWritePage } from '@/lib/auth/permissions';
import { useLanguage } from '@/hooks/useLanguage';
import type { CrmCatalogKind } from '@/lib/settings/catalog-kinds';
import CatalogKindsNav from '@/components/settings/CatalogKindsNav';
import CatalogItemsPanel from '@/components/settings/CatalogItemsPanel';
import ThemePanel from '@/components/settings/ThemePanel';

type SettingsSection = 'catalogs' | 'theme';

const SETTINGS_SECTIONS: {
  id: SettingsSection;
  en: string;
  vi: string;
  enDesc: string;
  viDesc: string;
  icon: string;
}[] = [
  {
    id: 'catalogs',
    en: 'Catalogs',
    vi: 'Danh mục',
    enDesc: 'Countries, nationalities, sources, languages, budgets, salespeople, travel styles.',
    viDesc: 'Quốc gia, quốc tịch, nguồn, ngôn ngữ, ngân sách, sales, phong cách tour.',
    icon: '☰',
  },
  {
    id: 'theme',
    en: 'Theme',
    vi: 'Giao diện',
    enDesc: 'Color presets and font size for your CRM view.',
    viDesc: 'Bộ màu và cỡ chữ cho giao diện CRM của bạn.',
    icon: '◐',
  },
];

function parseSection(param: string | null): SettingsSection | null {
  if (param === 'catalogs' || param === 'theme') return param;
  return null;
}

export default function SettingsPage() {
  const { language } = useLanguage();
  const { permissionCodes } = usePermissions();
  const canWrite = canWritePage(permissionCodes, 'settings');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = parseSection(searchParams.get('section'));

  const [kind, setKind] = useState<CrmCatalogKind>('country');

  const openSection = useCallback(
    (id: SettingsSection) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('section', id);
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const backToHub = useCallback(() => {
    router.push(pathname);
  }, [pathname, router]);

  const sectionMeta = useMemo(
    () => SETTINGS_SECTIONS.find((entry) => entry.id === section) ?? null,
    [section],
  );

  if (section === 'catalogs') {
    return (
      <div className="settings-page">
        <div className="settings-page__header">
          <button type="button" className="settings-page__back" onClick={backToHub}>
            ← {language === 'vi' ? 'Cài đặt' : 'Settings'}
          </button>
          <h1 className="settings-page__title">
            {sectionMeta ? (language === 'vi' ? sectionMeta.vi : sectionMeta.en) : 'Catalogs'}
          </h1>
          <p className="settings-page__subtitle">
            {language === 'vi'
              ? 'Quản lý danh mục dùng trong form Clients và Tour Design.'
              : 'Manage catalogs used by Clients and Tour Design forms.'}
          </p>
        </div>
        <div className="settings-page__body">
          <CatalogKindsNav activeKind={kind} onSelect={setKind} />
          <CatalogItemsPanel key={kind} kind={kind} canWrite={canWrite} />
        </div>
      </div>
    );
  }

  if (section === 'theme') {
    return (
      <div className="settings-page">
        <div className="settings-page__header">
          <button type="button" className="settings-page__back" onClick={backToHub}>
            ← {language === 'vi' ? 'Cài đặt' : 'Settings'}
          </button>
          <h1 className="settings-page__title">
            {sectionMeta ? (language === 'vi' ? sectionMeta.vi : sectionMeta.en) : 'Theme'}
          </h1>
          <p className="settings-page__subtitle">
            {language === 'vi'
              ? 'Chọn bộ màu và cỡ chữ cho thiết bị này (không đồng bộ server).'
              : 'Choose colors and font size for this device (stored locally, not synced).'}
          </p>
        </div>
        <ThemePanel />
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">{language === 'vi' ? 'Cài đặt' : 'Settings'}</h1>
        <p className="settings-page__subtitle">
          {language === 'vi'
            ? 'Chọn một nhóm cài đặt để mở.'
            : 'Choose a settings area to open.'}
        </p>
      </div>
      <div className="settings-hub">
        {SETTINGS_SECTIONS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="settings-hub__card"
            onClick={() => openSection(entry.id)}
          >
            <span className="settings-hub__icon" aria-hidden>
              {entry.icon}
            </span>
            <span className="settings-hub__text">
              <span className="settings-hub__name">{language === 'vi' ? entry.vi : entry.en}</span>
              <span className="settings-hub__desc">{language === 'vi' ? entry.viDesc : entry.enDesc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

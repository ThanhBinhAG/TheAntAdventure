'use client';

import { CATALOG_KIND_META, type CrmCatalogKind } from '@/lib/settings/catalog-kinds';
import { useLanguage } from '@/hooks/useLanguage';

type Props = {
  activeKind: CrmCatalogKind;
  onSelect: (kind: CrmCatalogKind) => void;
};

export default function CatalogKindsNav({ activeKind, onSelect }: Props) {
  const { language } = useLanguage();

  return (
    <nav className="settings-catalog-nav" aria-label="Catalog kinds">
      <div className="settings-catalog-nav__title">{language === 'vi' ? 'Danh mục' : 'Catalogs'}</div>
      <ul className="settings-catalog-nav__list">
        {CATALOG_KIND_META.map((meta) => {
          const selected = meta.kind === activeKind;
          return (
            <li key={meta.kind}>
              <button
                type="button"
                className={`settings-catalog-nav__item${selected ? ' is-active' : ''}`}
                aria-current={selected ? 'page' : undefined}
                onClick={() => onSelect(meta.kind)}
              >
                {language === 'vi' ? meta.vi : meta.en}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

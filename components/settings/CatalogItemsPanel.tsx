'use client';

import { useEffect, useState } from 'react';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import { useLanguage } from '@/hooks/useLanguage';
import { CATALOG_KIND_META, type CatalogItem, type CrmCatalogKind } from '@/lib/settings/catalog-kinds';

type Props = {
  kind: CrmCatalogKind;
  canWrite: boolean;
};

function alphabetize(items: CatalogItem[]) {
  return [...items].sort((a, b) => a.label.localeCompare(b.label));
}

function newItem(kind: CrmCatalogKind, index: number): CatalogItem {
  return {
    kind,
    code: `custom-${crypto.randomUUID()}`,
    label: '',
    sortOrder: (index + 1) * 10,
    isActive: true,
  };
}

export default function CatalogItemsPanel({ kind, canWrite }: Props) {
  const { language } = useLanguage();
  const meta = CATALOG_KIND_META.find((entry) => entry.kind === kind);
  const title = meta ? (language === 'vi' ? meta.vi : meta.en) : kind;

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [drafts, setDrafts] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/settings/catalogs?kind=${encodeURIComponent(kind)}`, {
      credentials: 'same-origin',
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: CatalogItem[]; error?: string };
        if (!response.ok || !body.ok || !Array.isArray(body.data)) {
          throw new Error(body.error ?? 'Failed to load catalog');
        }
        const next = alphabetize(body.data);
        setItems(next);
        setDrafts(next);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load catalog');
        setItems([]);
        setDrafts([]);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [kind]);

  function update(index: number, changes: Partial<CatalogItem>) {
    setDrafts((current) => current.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  }

  async function save() {
    const normalized = alphabetize(drafts).map((item, index) => ({
      ...item,
      kind,
      label: item.label.trim(),
      sortOrder: (index + 1) * 10,
    }));
    if (normalized.some((item) => !item.label)) {
      setError(language === 'vi' ? 'Nhãn không được để trống.' : 'Label cannot be empty.');
      return;
    }
    const names = normalized.map((item) => item.label.toLocaleLowerCase());
    if (new Set(names).size !== names.length) {
      setError(language === 'vi' ? 'Nhãn phải là duy nhất.' : 'Labels must be unique.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/catalogs', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          items: normalized.map(({ code, label, sortOrder, isActive }) => ({ code, label, sortOrder, isActive })),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: CatalogItem[]; error?: string };
      if (!response.ok || !body.ok || !Array.isArray(body.data)) {
        throw new Error(body.error ?? 'Save failed');
      }
      const next = alphabetize(body.data);
      setItems(next);
      setDrafts(next);
      toast.success(language === 'vi' ? 'Đã lưu danh mục.' : 'Catalog saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: CatalogItem) {
    const confirmed = await confirmDialog(
      language === 'vi'
        ? `Xóa “${item.label}”? Không thể xóa nếu đang được khách hàng dùng — hãy tắt Active.`
        : `Delete “${item.label}”? Cannot delete if customers use it — deactivate instead.`,
      {
        title: language === 'vi' ? 'Xóa mục' : 'Delete item',
        confirmLabel: language === 'vi' ? 'Xóa' : 'Delete',
        cancelLabel: language === 'vi' ? 'Hủy' : 'Cancel',
      },
    );
    if (!confirmed) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/settings/catalogs?kind=${encodeURIComponent(kind)}&code=${encodeURIComponent(item.code)}`,
        { method: 'DELETE', credentials: 'same-origin' },
      );
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; data?: CatalogItem[]; error?: string };
      if (!response.ok || !body.ok || !Array.isArray(body.data)) {
        throw new Error(body.error ?? 'Delete failed');
      }
      const next = alphabetize(body.data);
      setItems(next);
      setDrafts(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    drafts.length !== items.length ||
    drafts.some((draft, index) => {
      const original = items[index];
      if (!original) return true;
      return (
        draft.code !== original.code ||
        draft.label !== original.label ||
        draft.isActive !== original.isActive
      );
    });

  return (
    <section className="settings-catalog-panel">
      <div className="settings-catalog-panel__hd">
        <h2 className="settings-catalog-panel__title">{title}</h2>
        <p className="settings-catalog-panel__hint">
          {language === 'vi'
            ? 'Thêm / sửa nhãn. Tắt Active để ẩn khỏi form nhưng giữ dữ liệu cũ.'
            : 'Add or edit labels. Deactivate to hide from forms while keeping historical values.'}
        </p>
      </div>

      {loading ? (
        <div className="settings-catalog-panel__empty">{language === 'vi' ? 'Đang tải…' : 'Loading…'}</div>
      ) : (
        <>
          <div className="settings-catalog-panel__list">
            {drafts.map((item, index) => (
              <div key={item.code} className="settings-catalog-panel__row">
                <input
                  aria-label={`Label ${index + 1}`}
                  value={item.label}
                  onChange={(event) => update(index, { label: event.target.value })}
                  disabled={saving || !canWrite}
                />
                <label className="settings-catalog-panel__active">
                  <input
                    type="checkbox"
                    checked={item.isActive}
                    onChange={(event) => update(index, { isActive: event.target.checked })}
                    disabled={saving || !canWrite}
                  />
                  Active
                </label>
                {canWrite && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => void remove(item)}
                    disabled={saving || drafts.length === 1}
                    aria-label={`Delete ${item.label || 'item'}`}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {canWrite && (
            <div className="settings-catalog-panel__actions">
              <button
                type="button"
                className="btn btn-s btn-sm"
                disabled={saving}
                onClick={() => setDrafts((current) => [...current, newItem(kind, current.length)])}
              >
                {language === 'vi' ? '+ Thêm' : '+ Add'}
              </button>
              <button type="button" className="btn btn-p btn-sm" disabled={saving || !dirty} onClick={() => void save()}>
                {saving ? (language === 'vi' ? 'Đang lưu…' : 'Saving…') : language === 'vi' ? 'Lưu' : 'Save'}
              </button>
            </div>
          )}
          {error && (
            <div className="nc-form-error" role="alert" style={{ marginTop: 12 }}>
              {error}
            </div>
          )}
        </>
      )}
    </section>
  );
}

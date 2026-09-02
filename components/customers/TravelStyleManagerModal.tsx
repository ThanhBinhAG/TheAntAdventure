'use client';

import { useState } from 'react';
import type { TravelStyle } from '@/lib/customers/travel-styles';
import { confirmDialog } from '@/lib/confirm';

type Props = {
  open: boolean;
  styles: TravelStyle[];
  saving: boolean;
  onClose: () => void;
  onSave: (styles: TravelStyle[]) => Promise<void>;
  onDelete: (style: TravelStyle) => Promise<void>;
};

function alphabetize(styles: TravelStyle[]) {
  return [...styles].sort((a, b) => a.label.localeCompare(b.label));
}

function newStyle(index: number): TravelStyle {
  return {
    code: `custom-${crypto.randomUUID()}`,
    label: '',
    sortOrder: (index + 1) * 10,
    isActive: true,
  };
}

export default function TravelStyleManagerModal({ open, styles, saving, onClose, onSave, onDelete }: Props) {
  const stylesKey = styles.map((style) => `${style.code}:${style.label}:${style.sortOrder}:${style.isActive}`).join('|');
  const [previousKey, setPreviousKey] = useState(`${open}-${stylesKey}`);
  const [drafts, setDrafts] = useState<TravelStyle[]>(() => alphabetize(styles));
  const [error, setError] = useState<string | null>(null);
  const currentKey = `${open}-${stylesKey}`;

  if (currentKey !== previousKey) {
    setPreviousKey(currentKey);
    setDrafts(alphabetize(styles));
    setError(null);
  }

  if (!open) return null;

  function update(index: number, changes: Partial<TravelStyle>) {
    setDrafts((current) => current.map((style, itemIndex) => itemIndex === index ? { ...style, ...changes } : style));
  }

  async function save() {
    const normalized = alphabetize(drafts).map((style, index) => ({
      ...style,
      label: style.label.trim(),
      sortOrder: (index + 1) * 10,
    }));
    if (normalized.some((style) => !style.label)) {
      setError('Vui lòng nhập tên cho mọi Travel Style.');
      return;
    }
    const names = normalized.map((style) => style.label.toLocaleLowerCase());
    if (new Set(names).size !== names.length) {
      setError('Tên Travel Style không được trùng nhau.');
      return;
    }
    setError(null);
    try {
      await onSave(normalized);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu Travel Style.');
    }
  }

  async function remove(style: TravelStyle) {
    const confirmed = await confirmDialog(
      `Xóa Travel Style “${style.label}”? Thao tác sẽ bị chặn nếu đang có khách hàng sử dụng.`,
      { title: 'Xóa Travel Style', confirmLabel: 'Xóa', cancelLabel: 'Hủy' },
    );
    if (!confirmed) return;
    setError(null);
    try {
      await onDelete(style);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không thể xóa Travel Style.');
    }
  }

  return (
    <div className="overlay open" role="presentation" onClick={() => !saving && onClose()}>
      <div className="modal nc-modal" role="dialog" aria-modal="true" aria-labelledby="travel-style-manager-title" style={{ maxWidth: 600 }} onClick={(event) => event.stopPropagation()}>
        <div className="modal-hd modal-hd-green nc-modal-hd">
          <div>
            <div id="travel-style-manager-title" style={{ fontSize: 15, fontWeight: 600 }}>Manage Travel Styles</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', marginTop: 1 }}>Danh sách được sắp xếp tự động theo chữ cái.</div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={saving} aria-label="Close Travel Style manager">×</button>
        </div>
        <div className="nc-modal-body">
          {drafts.map((style, index) => (
            <div key={style.code} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input aria-label={`Travel Style ${index + 1}`} value={style.label} onChange={(event) => update(index, { label: event.target.value })} disabled={saving} />
              <label style={{ display: 'flex', gap: 5, alignItems: 'center', fontSize: 12, whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={style.isActive} onChange={(event) => update(index, { isActive: event.target.checked })} disabled={saving} /> Active
              </label>
              <button className="btn btn-danger btn-sm" type="button" onClick={() => void remove(style)} disabled={saving || drafts.length === 1} aria-label={`Delete ${style.label || 'Travel Style'}`}>✕</button>
            </div>
          ))}
          <button className="btn btn-s btn-sm" type="button" onClick={() => setDrafts((current) => [...current, newStyle(current.length)])} disabled={saving}>+ Add Travel Style</button>
          {error && <div className="nc-form-error" role="alert" style={{ marginTop: 12 }}>{error}</div>}
        </div>
        <div className="nc-modal-ft">
          <div className="nc-modal-ft-actions">
            <button className="btn btn-s" type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-p" type="button" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save Travel Styles'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

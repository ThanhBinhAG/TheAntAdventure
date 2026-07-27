'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string | number | null;
  onSave: (value: string | number | null) => Promise<void> | void;
  /** When false, render a plain read-only value. When true, show an input. */
  editing: boolean;
  type?: 'text' | 'number' | 'multiline';
  placeholder?: string;
  align?: 'left' | 'right';
  suffix?: string;
  format?: (value: number) => string;
  disabled?: boolean;
  compact?: boolean;
};

function displayValue(value: string | number | null, format?: (v: number) => string): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number') return format ? format(value) : String(value);
  return value;
}

export default function InlineEdit({
  value,
  onSave,
  editing,
  type = 'text',
  placeholder = '—',
  align = 'left',
  suffix,
  format,
  disabled,
  compact,
}: Props) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const wasEditing = useRef(false);

  useEffect(() => {
    if (editing && !wasEditing.current) {
      setDraft(value == null ? '' : String(value));
      setError(false);
    }
    wasEditing.current = editing;
  }, [editing, value]);

  const commit = async () => {
    const trimmed = draft.trim();
    const next: string | number | null =
      type === 'number' ? (trimmed === '' ? null : Number(trimmed)) : trimmed;

    if (type === 'number' && next !== null && !Number.isFinite(next as number)) {
      setError(true);
      return;
    }
    if (next === (value ?? (type === 'number' ? null : ''))) return;

    setSaving(true);
    setError(false);
    try {
      await onSave(next);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  if (!editing || disabled) {
    const shown = displayValue(value, format);
    return (
      <span
        className={`pcx-value${align === 'right' ? ' right' : ''}${compact ? ' compact' : ''}${
          type === 'multiline' ? ' multi' : ''
        }`}
      >
        {shown ? (
          <>
            {shown}
            {suffix && <span className="pcx-edit-suffix">{suffix}</span>}
          </>
        ) : (
          <span className="pcx-edit-empty">{placeholder}</span>
        )}
      </span>
    );
  }

  const shared = {
    ref: inputRef as never,
    value: draft,
    onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
    onBlur: () => void commit(),
    className: `pcx-edit-input${align === 'right' ? ' right' : ''}${error ? ' error' : ''}${
      saving ? ' saving' : ''
    }${compact ? ' compact' : ''}`,
  };

  if (type === 'multiline') {
    return (
      <textarea
        {...shared}
        rows={4}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(value == null ? '' : String(value));
            setError(false);
          }
        }}
      />
    );
  }

  return (
    <input
      {...shared}
      type={type === 'number' ? 'number' : 'text'}
      step="any"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
        if (e.key === 'Escape') {
          setDraft(value == null ? '' : String(value));
          setError(false);
        }
      }}
    />
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  tone: 'incl' | 'excl';
  items: string[];
  onChange: (next: string[]) => void;
  onFocusAnchor?: () => void;
}

export default function ProposalTemplateChipList({ title, tone, items, onChange, onFocusAnchor }: Props) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const editRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (editing == null) return;
    const el = editRef.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [editing]);

  function commitEdit(index: number, text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      onChange(items.filter((_, i) => i !== index));
    } else if (items[index] !== trimmed) {
      const next = [...items];
      next[index] = trimmed;
      onChange(next);
    }
    setEditing(null);
  }

  function handleChipClick(index: number) {
    onFocusAnchor?.();
    if (active === index) {
      setEditing(index);
      return;
    }
    setActive(index);
  }

  function handleAdd() {
    onFocusAnchor?.();
    setOpen(true);
    onChange([...items, '']);
    setEditing(items.length);
    setActive(items.length);
  }

  function handleRemove(index: number) {
    onChange(items.filter((_, i) => i !== index));
    setEditing((cur) => (cur === index ? null : cur != null && cur > index ? cur - 1 : cur));
    setActive((cur) => (cur === index ? null : cur != null && cur > index ? cur - 1 : cur));
  }

  const count = items.filter((line) => line.trim()).length;

  return (
    <section className={`proposal-chip-section proposal-chip-section--${tone}`}>
      <div className="proposal-chip-hd">
        <button
          type="button"
          className="proposal-chip-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="proposal-chip-chevron" aria-hidden>
            {open ? '▾' : '▸'}
          </span>
          <span className="lbl">{title}</span>
          <span className="proposal-chip-count">{count}</span>
        </button>
        <button type="button" className="btn btn-s" onClick={handleAdd}>
          + Add
        </button>
      </div>

      {open && (
        <div className="proposal-chip-body">
          {items.length === 0 && (
            <p className="proposal-chip-empty">No items yet. Use + Add.</p>
          )}
          <div className="proposal-chip-wrap">
            {items.map((line, index) =>
              editing === index ? (
                <div key={`edit-${index}`} className="proposal-chip-editor">
                  <textarea
                    ref={editRef}
                    rows={2}
                    value={line}
                    placeholder="Describe this item…"
                    onChange={(e) => {
                      const next = [...items];
                      next[index] = e.target.value;
                      onChange(next);
                    }}
                    onInput={(e) => {
                      e.currentTarget.style.height = 'auto';
                      e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
                    }}
                    onBlur={(e) => commitEdit(index, e.target.value)}
                    onFocus={() => onFocusAnchor?.()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        commitEdit(index, (e.target as HTMLTextAreaElement).value);
                      }
                      if (e.key === 'Escape') setEditing(null);
                    }}
                  />
                </div>
              ) : (
                <span
                  key={`chip-${index}-${line.slice(0, 12)}`}
                  className={`proposal-chip${active === index ? ' is-active' : ''}`}
                  title={line.trim() || 'Empty item'}
                  onClick={() => handleChipClick(index)}
                >
                  <span className="proposal-chip-text">{line.trim() || 'New item…'}</span>
                  <button
                    type="button"
                    className="proposal-chip-edit"
                    title="Edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFocusAnchor?.();
                      setEditing(index);
                    }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="proposal-chip-x"
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index);
                    }}
                  >
                    ×
                  </button>
                </span>
              )
            )}
          </div>
        </div>
      )}
    </section>
  );
}

'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

interface DestFilterComboboxProps {
  destFilter: string;
  destList: string[];
  destCounts: Record<string, number>;
  destTotal: number;
  onDestFilterChange: (v: string) => void;
  compact?: boolean;
}

export default function DestFilterCombobox({
  destFilter,
  destList,
  destCounts,
  destTotal,
  onDestFilterChange,
  compact = false,
}: DestFilterComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(destFilter);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return destList;
    return destList.filter((d) => d.toLowerCase().includes(q));
  }, [destList, query]);

  const pick = (value: string) => {
    onDestFilterChange(value);
    setQuery(value);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      setQuery(destFilter);
      return;
    }
    if (!open) return;

    const options = ['', ...suggestions];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      pick(options[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className={`tp-dest-combo${compact ? ' tp-dest-combo--compact' : ''}`} ref={rootRef}>
      <input
        type="search"
        className="tp-dest-combo-input"
        value={open ? query : destFilter}
        placeholder="Destination…"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
        role="combobox"
        onFocus={() => {
          setOpen(true);
          setQuery(destFilter);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
          if (!e.target.value.trim()) onDestFilterChange('');
        }}
        onKeyDown={onKeyDown}
      />
      {destFilter && (
        <button
          type="button"
          className="tp-dest-combo-clear"
          aria-label="Clear destination"
          onClick={() => {
            onDestFilterChange('');
            setQuery('');
          }}
        >
          ×
        </button>
      )}
      {open && (
        <ul id={listId} className="tp-dest-combo-list" role="listbox">
          <li role="option" aria-selected={destFilter === ''}>
            <button
              type="button"
              className={`tp-facet-item${destFilter === '' ? ' on' : ''}${activeIndex === 0 ? ' tp-dest-combo-active' : ''}`}
              onMouseEnter={() => setActiveIndex(0)}
              onClick={() => pick('')}
            >
              <span>All destinations</span>
              <span className="tp-facet-count">{destTotal}</span>
            </button>
          </li>
          {suggestions.map((dest, i) => (
            <li key={dest} role="option" aria-selected={destFilter === dest}>
              <button
                type="button"
                className={`tp-facet-item${destFilter === dest ? ' on' : ''}${activeIndex === i + 1 ? ' tp-dest-combo-active' : ''}`}
                onMouseEnter={() => setActiveIndex(i + 1)}
                onClick={() => pick(dest)}
              >
                <span className="tp-facet-item-label">{dest}</span>
                <span className="tp-facet-count">{destCounts[dest]}</span>
              </button>
            </li>
          ))}
          {suggestions.length === 0 && <li className="tp-dest-combo-empty">No destinations match</li>}
        </ul>
      )}
    </div>
  );
}

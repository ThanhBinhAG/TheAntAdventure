'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { filterSearchableOptions } from '@/lib/customers/searchable-options';

type Props = {
  id: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
  placeholder: string;
  invalid?: boolean;
};

export default function SearchableSelect({ id, value, options, onChange, placeholder, invalid = false }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = `${id}-options`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const filtered = useMemo(() => filterSearchableOptions(options, query), [options, query]);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(filtered.findIndex((option) => option === value));
  }, [filtered, open, value]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, listId, open]);

  function select(option: string) {
    onChange(option);
    setQuery('');
    setOpen(false);
    setActiveIndex(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Home') {
      if (!open) return;
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === 'End') {
      if (!open) return;
      event.preventDefault();
      setActiveIndex(Math.max(filtered.length - 1, 0));
    } else if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault();
      select(filtered[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div
      ref={rootRef}
      className="searchable-select"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <div className={`searchable-select__control${invalid ? ' nc-field-invalid' : ''}`}>
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open}
          aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
          aria-invalid={invalid}
          autoComplete="off"
          value={open ? query : value}
          onFocus={() => {
            setQuery('');
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
        />
        <button type="button" className="searchable-select__toggle" aria-label="Show options" onMouseDown={(event) => event.preventDefault()} onClick={() => {
          setQuery('');
          setOpen((shown) => !shown);
        }}>
          ▾
        </button>
      </div>
      {open && (
        <div id={listId} className="searchable-select__options" role="listbox">
          {filtered.length ? filtered.map((option, index) => (
            <div
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`searchable-select__option${index === activeIndex ? ' is-active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option)}
            >
              {option}
            </div>
          )) : <div className="searchable-select__empty" role="status">No matching options</div>}
        </div>
      )}
    </div>
  );
}

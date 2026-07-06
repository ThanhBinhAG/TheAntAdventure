'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  deriveDestinationOptions,
  filterDestinationSuggestions,
  resolveDestCode,
} from '@/lib/product-code';

interface DestinationComboboxProps {
  value: string;
  region: string;
  products: { dest?: string; region?: string }[];
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
}

export default function DestinationCombobox({
  value,
  region,
  products,
  onChange,
  required,
  disabled,
}: DestinationComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const allOptions = useMemo(
    () => deriveDestinationOptions(region, products),
    [region, products]
  );

  const suggestions = useMemo(
    () => filterDestinationSuggestions(value, allOptions, 10),
    [value, allOptions]
  );

  const destCode = value.trim() ? resolveDestCode(value) : null;
  const isCatalogMatch = Boolean(destCode);
  const showHint = value.trim() && region !== 'services' && !isCatalogMatch;

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (label: string) => {
    onChange(label);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (!open || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      pick(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const placeholder =
    region === 'services'
      ? 'Type to search — e.g. All Vietnam, SGN / HAN / DAD'
      : 'Type to search — e.g. H → Hanoi, Halong Bay';

  return (
    <div className="dest-combobox" ref={rootRef}>
      <input
        type="text"
        value={value}
        disabled={disabled}
        required={required}
        list={listId}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <datalist id={listId}>
        {allOptions.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
      {open && suggestions.length > 0 && (
        <ul className="dest-combobox-menu" role="listbox">
          {suggestions.map((opt, i) => (
            <li key={opt}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={i === activeIndex ? 'dest-combobox-opt active' : 'dest-combobox-opt'}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(opt)}
              >
                <span className="dest-combobox-opt-label">{opt}</span>
                {resolveDestCode(opt) && (
                  <span className="dest-combobox-opt-code">{resolveDestCode(opt)}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {isCatalogMatch && (
        <p className="dest-combobox-meta">Catalog code: {destCode}</p>
      )}
      {showHint && (
        <p className="dest-combobox-warn">Pick a suggested destination so the product code can be generated.</p>
      )}
    </div>
  );
}

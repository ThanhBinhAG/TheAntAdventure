'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  filterClientNameSuggestions,
  type ClientNameSuggestion,
} from '@/lib/contracts/contract-booking-fill';
import type { BookingListItem } from '@/lib/bookings/booking-input';
import type { Customer } from '@/lib/types';

import { useLanguage } from '@/hooks/useLanguage';

type ContractClientNameComboboxProps = {
  value: string;
  customers: Customer[];
  bookings: BookingListItem[];
  invalid?: boolean;
  inputId?: string;
  onChange: (name: string) => void;
  onPick: (suggestion: ClientNameSuggestion) => void;
};

export default function ContractClientNameCombobox({
  value,
  customers,
  bookings,
  invalid,
  inputId,
  onChange,
  onPick,
}: ContractClientNameComboboxProps) {
  const { tp } = useLanguage();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const suggestions = useMemo(
    () => filterClientNameSuggestions(value, customers, bookings as BookingListItem[], 10),
    [value, customers, bookings],
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const pick = (item: ClientNameSuggestion) => {
    onPick(item);
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

  return (
    <div className="dest-combobox" ref={rootRef}>
      <input
        id={inputId}
        className={invalid ? 'nc-field-invalid' : undefined}
        value={value}
        list={listId}
        placeholder={tp('contracts', 'formClientSearchPlaceholder')}
        autoComplete="off"
        aria-autocomplete="list"
        aria-invalid={invalid}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onKeyDown={onKeyDown}
      />
      <datalist id={listId}>
        {suggestions.map((item) => (
          <option key={item.key} value={item.name} />
        ))}
      </datalist>
      {open && suggestions.length > 0 ? (
        <ul className="dest-combobox-menu" role="listbox">
          {suggestions.map((item, i) => (
            <li key={item.key}>
              <button
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={i === activeIndex ? 'dest-combobox-opt active' : 'dest-combobox-opt'}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(item)}
              >
                <span className="dest-combobox-opt-label">{item.name}</span>
                <span className="dest-combobox-opt-code">{item.subtitle}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

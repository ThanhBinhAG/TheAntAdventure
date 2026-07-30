'use client';

import { useCallback, useEffect, useState } from 'react';
import { PAGE_SIZE } from '@/lib/constants';

export const PAGE_SIZE_OPTIONS = [12, 24, 48, 96] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export const PAGE_SIZE_STORAGE_KEY = 'crm.pageSize';

function isPageSizeOption(value: number): value is PageSizeOption {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

function readStoredPageSize(): number {
  if (typeof window === 'undefined') return PAGE_SIZE;
  try {
    const raw = window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY);
    if (!raw) return PAGE_SIZE;
    const parsed = Number(raw);
    return isPageSizeOption(parsed) ? parsed : PAGE_SIZE;
  } catch {
    return PAGE_SIZE;
  }
}

/** Global CRM list/grid page size, persisted in localStorage. */
export function usePageSize(): {
  pageSize: number;
  setPageSize: (size: number) => void;
} {
  const [pageSize, setPageSizeState] = useState(PAGE_SIZE);

  useEffect(() => {
    setPageSizeState(readStoredPageSize());
  }, []);

  const setPageSize = useCallback((size: number) => {
    if (!isPageSizeOption(size)) return;
    setPageSizeState(size);
    try {
      window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  return { pageSize, setPageSize };
}

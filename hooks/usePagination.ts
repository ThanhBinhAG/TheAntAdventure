'use client';

import { useMemo, useState } from 'react';
import { PAGE_SIZE } from '@/lib/constants';

export function usePagination<T>(
  items: T[],
  pageSize: number = PAGE_SIZE,
  resetDeps: unknown[] = []
): {
  paginatedItems: T[];
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  total: number;
  pageSize: number;
  rangeStart: number;
  rangeEnd: number;
} {
  const [page, setPage] = useState(1);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const [previousResetDeps, setPreviousResetDeps] = useState(resetDeps);
  const resetChanged =
    resetDeps.length !== previousResetDeps.length ||
    resetDeps.some((dependency, index) => !Object.is(dependency, previousResetDeps[index]));
  const nextPage = resetChanged ? 1 : Math.min(page, totalPages);

  if (resetChanged) {
    setPreviousResetDeps(resetDeps);
  }
  if (page !== nextPage) {
    setPage(nextPage);
  }

  const safePage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const rangeStart = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, total);

  return {
    paginatedItems,
    page: safePage,
    setPage,
    totalPages,
    total,
    pageSize,
    rangeStart,
    rangeEnd,
  };
}

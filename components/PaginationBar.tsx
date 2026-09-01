'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { PAGE_SIZE_OPTIONS } from '@/hooks/usePageSize';

export interface PaginationBarProps {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  total: number;
  pageSize: number;
  rangeStart: number;
  rangeEnd: number;
  /** When set, shows per-page selector and persists via caller (e.g. usePageSize). */
  onPageSizeChange?: (size: number) => void;
}

export default function PaginationBar({
  page,
  setPage,
  totalPages,
  total,
  pageSize,
  rangeStart,
  rangeEnd,
  onPageSizeChange,
}: PaginationBarProps) {
  const { tc, fmt } = useLanguage();

  const showSizeSelect = typeof onPageSizeChange === 'function';
  if (total === 0) return null;
  if (!showSizeSelect && total <= pageSize) return null;

  const handlePageSizeChange = (next: number) => {
    if (!onPageSizeChange || next === pageSize) return;
    onPageSizeChange(next);
    setPage(1);
  };

  return (
    <div className="pagination-bar">
      <span className="pagination-range">
        {fmt(tc('showingRange'), { start: rangeStart, end: rangeEnd, total })}
      </span>
      <div className="pagination-controls">
        {showSizeSelect && (
          <label className="pagination-size">
            <span className="pagination-size-label">{tc('perPage')}</span>
            <select
              className="pagination-size-select"
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              aria-label={tc('itemsPerPage')}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        )}
        {totalPages > 1 && (
          <>
            <button
              type="button"
              className="btn btn-s btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {tc('previous')}
            </button>
            <span className="pagination-page">
              {fmt(tc('pageOf'), { page, total: totalPages })}
            </span>
            <button
              type="button"
              className="btn btn-s btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              {tc('next')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

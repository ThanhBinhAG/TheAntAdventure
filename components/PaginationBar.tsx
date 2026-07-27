'use client';

import { useLanguage } from '@/hooks/useLanguage';

export interface PaginationBarProps {
  page: number;
  setPage: (page: number) => void;
  totalPages: number;
  total: number;
  pageSize: number;
  rangeStart: number;
  rangeEnd: number;
}

export default function PaginationBar({
  page,
  setPage,
  totalPages,
  total,
  pageSize,
  rangeStart,
  rangeEnd,
}: PaginationBarProps) {
  const { t } = useLanguage();

  if (total <= pageSize) return null;

  return (
    <div className="pagination-bar">
      <span className="pagination-range">
        {t(`Showing ${rangeStart}–${rangeEnd} of ${total}`, `Hiển thị ${rangeStart}–${rangeEnd} / ${total}`)}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-s btn-sm"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          {t('Previous', 'Trước')}
        </button>
        <span className="pagination-page">
          {t(`Page ${page} of ${totalPages}`, `Trang ${page} / ${totalPages}`)}
        </span>
        <button
          type="button"
          className="btn btn-s btn-sm"
          disabled={page >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          {t('Next', 'Sau')}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import PageRouteLoading from '@/components/PageRouteLoading';
import {
  cancelDelayedRevalidate,
  cancelPageBoot,
  ensurePageDataLoaded,
  routeBootSatisfied,
  setActivePageBoot,
} from '@/lib/db/hydrate';
import type { PageSlug } from '@/lib/types';

/**
 * Ensures route boot tables are loaded before rendering the page.
 * StoreProvider only marks hydration pending — fetch starts here per route.
 */
export default function PageDataGate({
  page,
  children,
}: {
  page: PageSlug;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevPage, setPrevPage] = useState(page);

  if (page !== prevPage) {
    setPrevPage(page);
    setReady(false);
    setError(null);
  }

  useEffect(() => {
    let cancelled = false;
    const generation = setActivePageBoot(page);
    cancelDelayedRevalidate();

    void (async () => {
      try {
        const ok = await ensurePageDataLoaded(page, generation);
        if (cancelled) return;
        if (!ok) {
          // Strict Mode cancellations can invalidate generation promises even when
          // the route boot tables are already hydrated by another in-flight boot.
          if (routeBootSatisfied(page)) {
            setReady(true);
            return;
          }

          setError('Không tải được dữ liệu từ Supabase');
          setReady(true);
          return;
        }
        setReady(true);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Hydrate failed');
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      cancelPageBoot(page);
      cancelDelayedRevalidate();
    };
  }, [page]);

  if (!ready) return <PageRouteLoading />;

  return (
    <>
      {error && (
        <div className="crm-page-hydrate-error" role="alert" style={{ padding: '0.75rem 1rem', color: '#b91c1c' }}>
          {error}
        </div>
      )}
      {children}
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import PageRouteLoading from '@/components/PageRouteLoading';
import {
  cancelDelayedRevalidate,
  cancelPageBoot,
  ensurePageDataLoaded,
  routeBootSatisfied,
  setActivePageBoot,
  shouldSkipSettledBoot,
} from '@/lib/db/hydrate';
import { bootTablesForPage } from '@/lib/db/sync-config';
import type { PageSlug } from '@/lib/types';

function routeBootIsInstant(slug: PageSlug): boolean {
  return bootTablesForPage(slug).length === 0;
}

function initialReady(slug: PageSlug): boolean {
  return routeBootIsInstant(slug) || shouldSkipSettledBoot(slug);
}

/**
 * Ensures route boot tables are loaded before rendering the page.
 * Routes with empty PAGE_BOOT_TABLES render children immediately (no loading flash).
 * Parent should pass `key={slug}` so page changes reset gate state without sync effects.
 */
export default function PageDataGate({
  page,
  children,
}: {
  page: PageSlug;
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(() => initialReady(page));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (shouldSkipSettledBoot(page)) {
      return;
    }

    let cancelled = false;
    const generation = setActivePageBoot(page);
    cancelDelayedRevalidate();

    void (async () => {
      try {
        const ok = await ensurePageDataLoaded(page, generation);
        if (cancelled) return;
        if (!ok && !routeBootSatisfied(page)) {
          setError('Không thể tải dữ liệu từ Supabase');
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Hydrate failed');
      } finally {
        if (!cancelled && !initialReady(page)) {
          setReady(true);
        }
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

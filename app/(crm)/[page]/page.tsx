import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { VALID_PAGES } from '@/lib/constants';
import { PAGE_COMPONENTS } from '@/components/pages';
import PageRouteLoading from '@/components/PageRouteLoading';
import PageDataGate from '@/components/PageDataGate';
import type { PageSlug } from '@/lib/types';
import { PermissionGate } from '@/components/PermissionGate';

interface PageProps {
  params: Promise<{ page: string }>;
}

export function generateStaticParams() {
  return VALID_PAGES.map((page) => ({ page }));
}

export default async function CRMPage(props: PageProps) {
  const params = await props.params;
  const slug = params.page as PageSlug;
  if (!VALID_PAGES.includes(slug)) notFound();

  const PageComponent = PAGE_COMPONENTS[slug];
  return (
    <Suspense fallback={<PageRouteLoading />}>
      <PermissionGate page={slug}>
        <PageDataGate page={slug}>
          <PageComponent />
        </PageDataGate>
      </PermissionGate>
    </Suspense>
  );
}

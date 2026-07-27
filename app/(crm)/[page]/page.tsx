import { notFound } from 'next/navigation';
import { VALID_PAGES } from '@/lib/constants';
import { PAGE_COMPONENTS } from '@/components/pages';
import type { PageSlug } from '@/lib/types';

interface PageProps {
  params: { page: string };
}

export function generateStaticParams() {
  return VALID_PAGES.map((page) => ({ page }));
}

export default function CRMPage({ params }: PageProps) {
  const slug = params.page as PageSlug;
  if (!VALID_PAGES.includes(slug)) notFound();

  const PageComponent = PAGE_COMPONENTS[slug];
  return <PageComponent />;
}

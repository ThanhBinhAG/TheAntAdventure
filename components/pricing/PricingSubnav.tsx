'use client';

import Link from 'next/link';
import type { PageSlug } from '@/lib/types';

const LINKS: { page: PageSlug; icon: string; label: string; hint: string }[] = [
  { page: 'pricing', icon: '◇', label: 'Tour Price List', hint: 'Catalogue pricing by pax tier' },
  { page: 'pricing-essentials', icon: '🚲', label: 'Essentials', hint: 'Saigon & Mekong cost builder' },
  {
    page: 'pricing-accommodation',
    icon: '🏨',
    label: 'Accommodation & Cruises',
    hint: 'Properties, room and cabin rates',
  },
];

export default function PricingSubnav({ active }: { active: PageSlug }) {
  return (
    <nav className="pcx-subnav" aria-label="Pricing sections">
      {LINKS.map((link) => (
        <Link
          key={link.page}
          href={`/${link.page}`}
          className={`pcx-subnav-item${active === link.page ? ' on' : ''}`}
        >
          <span className="pcx-subnav-icon">{link.icon}</span>
          <span className="pcx-subnav-text">
            <span className="pcx-subnav-label">{link.label}</span>
            <span className="pcx-subnav-hint">{link.hint}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}

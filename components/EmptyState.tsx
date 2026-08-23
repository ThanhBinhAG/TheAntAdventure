'use client';

import type { ReactNode } from 'react';

export type EmptyStateVariant =
  | 'generic'
  | 'access'
  | 'clients'
  | 'leads'
  | 'photos'
  | 'products'
  | 'agents'
  | 'attractions'
  | 'suppliers'
  | 'docs'
  | 'notes'
  | 'weather'
  | 'chat'
  | 'tasks';

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: EmptyStateVariant;
  /** Tighter padding for table cells / nested panels */
  size?: 'default' | 'compact';
  className?: string;
  /** Override default `status` (e.g. `alert` for permission errors). */
  role?: 'status' | 'alert';
};

function EmptyIcon({ variant }: { variant: EmptyStateVariant }) {
  const common = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true as const };

  switch (variant) {
    case 'access':
      return (
        <svg {...common}>
          <path
            d="M7.5 10.5V8.25a4.5 4.5 0 0 1 9 0V10.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M6.5 10.5h11A1.5 1.5 0 0 1 19 12v7.5A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5V12a1.5 1.5 0 0 1 1.5-1.5Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="15.25" r="1.35" fill="currentColor" />
        </svg>
      );
    case 'clients':
      return (
        <svg {...common}>
          <path
            d="M16 11a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 16 11Zm-8 0a3.5 3.5 0 1 0-3.5-3.5A3.5 3.5 0 0 0 8 11Zm0 2c-2.67 0-8 1.34-8 4v1.5h10.05A6.5 6.5 0 0 1 16 12.5c2.21 0 4.16.9 5.5 2.32V17c0-2.66-5.33-4-8-4H8Z"
            fill="currentColor"
            opacity="0.9"
          />
          <circle cx="16" cy="16.5" r="4.25" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M16 14.75v3.5M14.25 16.5h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'leads':
      return (
        <svg {...common}>
          <path
            d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-13Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M8 8h8M8 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="16.5" cy="15.5" r="2.75" stroke="currentColor" strokeWidth="1.5" />
          <path d="M18.6 17.6 20 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'photos':
      return (
        <svg {...common}>
          <path
            d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <circle cx="9" cy="9.5" r="1.75" stroke="currentColor" strokeWidth="1.5" />
          <path d="m7.5 17 3.2-3.8a1.2 1.2 0 0 1 1.8 0L14 15.5l1.3-1.4a1.2 1.2 0 0 1 1.8.1L19 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'products':
      return (
        <svg {...common}>
          <path d="M4.5 8.5 12 4.5l7.5 4v7l-7.5 4-7.5-4v-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 12.5v7M4.5 8.5 12 12.5 19.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case 'agents':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 19.5c.8-3.2 3.2-5 7-5s6.2 1.8 7 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M17.5 6.5h3M19 5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'attractions':
      return (
        <svg {...common}>
          <path d="M12 21s6.5-5.2 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.8 12 21 12 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="12" cy="10.5" r="2.25" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case 'suppliers':
      return (
        <svg {...common}>
          <path d="M3.5 19.5h17M5 19.5V9.2L12 4.5l7 4.7v9.8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9.5 19.5v-5h5v5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      );
    case 'docs':
      return (
        <svg {...common}>
          <path d="M7 3.5h7l4 4V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M14 3.5V8h4.5M9 12h6M9 15.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'notes':
      return (
        <svg {...common}>
          <path d="M6 4.5h9.5L18.5 8v11.5A1.5 1.5 0 0 1 17 21H6a1.5 1.5 0 0 1-1.5-1.5v-15A1.5 1.5 0 0 1 6 4.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M15.5 4.5V8H19M8.5 12h7M8.5 15.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'weather':
      return (
        <svg {...common}>
          <circle cx="10" cy="10" r="3.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 4.5v1.2M10 14.8v1.2M4.5 10h1.2M14.3 10h1.2M6.1 6.1l.85.85M13.05 13.05l.85.85M13.9 6.1l-.85.85M6.95 13.05l-.85.85" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M14 15.5h3.2a2.8 2.8 0 1 0-.35-5.58A4.2 4.2 0 0 0 9.2 12.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'chat':
      return (
        <svg {...common}>
          <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4 3v-3H7.5A2.5 2.5 0 0 1 5 13.5v-7Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9 9h6M9 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'tasks':
      return (
        <svg {...common}>
          <path d="M8.5 4.5h9A1.5 1.5 0 0 1 19 6v13.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 7 19.5V6a1.5 1.5 0 0 1 1.5-1.5Z" stroke="currentColor" strokeWidth="1.5" />
          <path d="m9.5 11 1.6 1.6L14.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5 8h2M5 12.5h2M5 17h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path
            d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path d="M8 12h8M10 15h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}

export default function EmptyState({
  title,
  description,
  action,
  variant = 'generic',
  size = 'default',
  className = '',
  role = 'status',
}: EmptyStateProps) {
  const classes = ['crm-empty-state', size === 'compact' ? 'crm-empty-state--compact' : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role={role}>
      <div className="crm-empty-state-icon">
        <EmptyIcon variant={variant} />
      </div>
      <p className="crm-empty-state-title">{title}</p>
      {description ? <p className="crm-empty-state-desc">{description}</p> : null}
      {action ? <div className="crm-empty-state-actions">{action}</div> : null}
    </div>
  );
}

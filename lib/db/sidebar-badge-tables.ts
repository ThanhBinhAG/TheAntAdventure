import { canReadPage } from '@/lib/auth/permissions';
import type { SyncArrayTable } from './sync-config';

/** Minimal tables for sidebar badges given the user's page permissions. */
export function sidebarBadgeTablesForPermissions(codes: ReadonlySet<string>): SyncArrayTable[] {
  const tables: SyncArrayTable[] = [];
  const needsTourDesign =
    canReadPage(codes, 'tourdesign') || canReadPage(codes, 'sales');
  if (needsTourDesign) {
    tables.push('leads', 'tour_drafts');
  }
  if (canReadPage(codes, 'planner')) {
    tables.push('tasks');
  }
  return tables;
}

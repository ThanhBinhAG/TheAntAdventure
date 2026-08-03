import type { OutlineStatus } from '../types';

/** Block Tour Experiences until client approves outline (when a lead session has outline rows). */
export function isExperiencesBlocked(
  leadId: string | undefined,
  outlineRowCount: number,
  outlineStatus: OutlineStatus | string
): boolean {
  return Boolean(leadId && outlineRowCount > 0 && outlineStatus !== 'approved');
}

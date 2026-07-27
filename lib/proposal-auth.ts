import 'server-only';
import { getAuthContext } from '@/lib/auth/session';

/** Proposal / pricing PDF export — authenticated session only (no env-based bypass). */
export async function isProposalExportAuthorized(): Promise<boolean> {
  const ctx = await getAuthContext();
  return ctx.authenticated;
}

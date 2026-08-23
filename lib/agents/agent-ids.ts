import type { Agent } from '@/lib/types';

/** Seeded Direct Client row — must not be deleted via UI or BFF. */
export const PROTECTED_AGENT_ID = 'AGT-001';

export function nextAgentId(agents: readonly Pick<Agent, 'id'>[]): string {
  const nums = agents
    .map((a) => parseInt(a.id.replace(/\D/g, ''), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `AGT-${String(next).padStart(3, '0')}`;
}

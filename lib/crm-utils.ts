import type { Customer, Lead } from './types';
import { STAGE_ORDER } from './constants';

export function getClientPipeline(custId: string, leads: Lead[]) {
  const allLeads = leads.filter((l) => l.custId === custId);
  const active = allLeads.filter((l) => l.stage !== 'Lost');
  if (!active.length) return { stage: null as string | null, value: 0, count: 0 };

  let bestStage: string | null = null;
  for (const s of STAGE_ORDER) {
    if (active.find((l) => l.stage === s)) {
      bestStage = s;
      break;
    }
  }

  const openLeads = active.filter((l) => l.stage !== 'Completed');
  const totalVal = openLeads.reduce((s, l) => s + (l.value || 0), 0);
  return { stage: bestStage, value: totalVal, count: active.length };
}

export function getCustomerName(customers: Customer[], custId: string): string {
  return customers.find((c) => c.id === custId)?.name || custId;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function strColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hues = ['#2E7D52', '#1565C0', '#6B21A8', '#C9A84C', '#C0392B', '#D97706'];
  return hues[Math.abs(hash) % hues.length];
}

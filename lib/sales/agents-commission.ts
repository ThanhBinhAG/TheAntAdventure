import type { Agent, Lead } from '../types';

/** Lead stages that count toward earned B2B agent commission. */
export const EARNED_STAGES = ['Confirmed', 'Completed', 'On Tour'] as const;
export type EarnedStage = (typeof EARNED_STAGES)[number];

export function isEarnedCommissionStage(stage: string): stage is EarnedStage {
  return (EARNED_STAGES as readonly string[]).includes(stage);
}

export function isActivePipelineLead(stage: string): boolean {
  return stage !== 'Lost' && stage !== 'Completed';
}

export type AgentCommissionRow = {
  agent: Agent;
  gross: number;
  comm: number;
  net: number;
  bookings: number;
};

export type AgentCommissionSummary = {
  rows: AgentCommissionRow[];
  grandGross: number;
  grandComm: number;
  grandNet: number;
};

/** Gross pipeline value and commission for one agent from earned-stage leads. */
export function computeAgentCommission(
  agent: Agent,
  leads: Lead[]
): Omit<AgentCommissionRow, 'agent'> {
  const agLeads = leads.filter(
    (l) => l.agentId === agent.id && isEarnedCommissionStage(l.stage)
  );
  const gross = agLeads.reduce((s, l) => s + (l.value || 0), 0);
  const comm = Math.round(gross * (agent.commissionPct / 100));
  return { gross, comm, net: gross - comm, bookings: agLeads.length };
}

export function summarizeAgentCommissions(
  agents: Agent[],
  leads: Lead[]
): AgentCommissionSummary {
  let grandGross = 0;
  let grandComm = 0;
  const rows = agents.map((agent) => {
    const stats = computeAgentCommission(agent, leads);
    grandGross += stats.gross;
    grandComm += stats.comm;
    return { agent, ...stats };
  });
  return { rows, grandGross, grandComm, grandNet: grandGross - grandComm };
}

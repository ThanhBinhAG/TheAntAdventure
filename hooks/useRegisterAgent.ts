'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import { withoutAutoSyncAsync } from '@/lib/db/sync-guard';
import type { AgentFormFields } from '@/lib/agents/agent-list-input';
import type { Agent } from '@/lib/types';

export type AgentSavePayload =
  | { mode: 'add'; form: AgentFormFields }
  | { mode: 'edit'; id: string; form: AgentFormFields };

export type AgentSaveOutcome =
  | { ok: true; agent: Agent; message?: string }
  | { ok: false; error: 'save_failed'; message: string };

type AgentMutationResponse = {
  ok?: boolean;
  error?: string;
  agent?: Agent;
};

async function readJson(res: Response): Promise<AgentMutationResponse> {
  try {
    return (await res.json()) as AgentMutationResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

function agentToFormFields(agent: Agent): AgentFormFields {
  return {
    name: agent.name,
    country: agent.country,
    tier: agent.tier,
    commissionPct: agent.commissionPct,
    currency: agent.currency,
    contactName: agent.contactName === '—' ? '' : agent.contactName,
    email: agent.email === '—' ? '' : agent.email,
    phone: agent.phone === '—' ? '' : agent.phone,
    notes: agent.notes || '',
    status: agent.status === 'Inactive' ? 'Inactive' : 'Active',
  };
}

// AgentFormFields.notes maps from Agent.notes

export function useRegisterAgent() {
  const addAgent = useStore((s) => s.addAgent);
  const updateAgent = useStore((s) => s.updateAgent);

  const saveAgent = useCallback(
    async (payload: AgentSavePayload): Promise<AgentSaveOutcome> => {
      if (payload.mode === 'edit') {
        const res = await fetch(
          `/api/agents/${encodeURIComponent(payload.id)}`,
          {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ form: payload.form }),
          },
        );
        const body = await readJson(res);

        if (!res.ok || !body.ok || !body.agent) {
          return {
            ok: false,
            error: 'save_failed',
            message: body.error || 'Không thể cập nhật đại lý.',
          };
        }

        await withoutAutoSyncAsync(async () => {
          updateAgent(body.agent!.id, body.agent!);
        });
        return { ok: true, agent: body.agent };
      }

      const res = await fetch('/api/agents', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: payload.form }),
      });
      const body = await readJson(res);

      if (!res.ok || !body.ok || !body.agent) {
        return {
          ok: false,
          error: 'save_failed',
          message: body.error || 'Không thể tạo đại lý.',
        };
      }

      await withoutAutoSyncAsync(async () => {
        addAgent(body.agent!);
      });

      return {
        ok: true,
        agent: body.agent,
        message: `Agent ${body.agent.id} created.`,
      };
    },
    [addAgent, updateAgent],
  );

  const saveFromAgent = useCallback(
    async (agent: Agent, mode: 'add' | 'edit'): Promise<AgentSaveOutcome> => {
      const form = agentToFormFields(agent);
      if (mode === 'edit') {
        return saveAgent({ mode: 'edit', id: agent.id, form });
      }
      return saveAgent({ mode: 'add', form });
    },
    [saveAgent],
  );

  return { saveAgent, saveFromAgent };
}

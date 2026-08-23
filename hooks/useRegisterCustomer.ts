'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import type { CustomerFormSavePayload } from '@/components/customers/CustomerFormModal';
import type { CustomerFormData } from '@/lib/customers/customer-form';
import {
  formatDuplicateEmailMessage,
} from '@/lib/customers/customer-onboarding';
import { withoutAutoSyncAsync } from '@/lib/db/auto-sync';
import type { Comm, Customer, Lead } from '@/lib/types';

export type CustomerSaveOutcome =
  | { ok: true; customer: Customer; leadId?: string; message?: string }
  | { ok: false; error: 'duplicate_email'; existing: Customer; message: string }
  | { ok: false; error: 'save_failed'; message: string };

type CustomerMutationResponse = {
  ok?: boolean;
  error?: string;
  customer?: Customer;
  lead?: Lead | null;
  comm?: Comm | null;
  existing?: Customer | null;
};

function duplicateOutcome(
  existing: Customer,
  fallbackEmail: string,
): Extract<CustomerSaveOutcome, { ok: false }> {
  const row =
    existing?.id && existing.name
      ? existing
      : ({
          id: existing?.id || '—',
          name: existing?.name || fallbackEmail,
          email: existing?.email || fallbackEmail,
        } as Customer);
  return {
    ok: false,
    error: 'duplicate_email',
    existing: row,
    message: formatDuplicateEmailMessage(row),
  };
}

async function readJson(res: Response): Promise<CustomerMutationResponse> {
  try {
    return (await res.json()) as CustomerMutationResponse;
  } catch {
    return { ok: false, error: `Request failed (${res.status})` };
  }
}

export function useRegisterCustomer() {
  const customers = useStore((s) => s.customers);
  const agents = useStore((s) => s.agents);
  const addCustomer = useStore((s) => s.addCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const addLead = useStore((s) => s.addLead);
  const addComm = useStore((s) => s.addComm);

  const saveFromForm = useCallback(
    async (payload: CustomerFormSavePayload): Promise<CustomerSaveOutcome> => {
      if (payload.mode === 'edit') {
        const existing = payload.existingCustomer;
        if (!existing) {
          throw new Error('CustomerFormModal: existingCustomer required in edit mode');
        }

        const res = await fetch(
          `/api/customers/${encodeURIComponent(existing.id)}`,
          {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ form: payload.form as CustomerFormData }),
          },
        );
        const body = await readJson(res);

        if (res.status === 409) {
          return duplicateOutcome(
            body.existing ?? existing,
            payload.form.email,
          );
        }

        if (!res.ok || !body.ok || !body.customer) {
          throw new Error(body.error || 'Không thể cập nhật khách hàng.');
        }

        // BFF already persisted — mirror into Zustand without browser PostgREST upsert.
        await withoutAutoSyncAsync(async () => {
          updateCustomer(body.customer!.id, body.customer!);
        });
        return { ok: true, customer: body.customer };
      }

      const res = await fetch('/api/customers', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: payload.form,
          createLead: true,
          logInquiry: payload.logInquiry,
          flagTourDesign: payload.flagTourDesign ?? false,
        }),
      });
      const body = await readJson(res);

      if (res.status === 409) {
        return duplicateOutcome(
          body.existing ?? ({ email: payload.form.email } as Customer),
          payload.form.email,
        );
      }

      if (!res.ok || !body.ok || !body.customer) {
        throw new Error(body.error || 'Không thể tạo khách hàng.');
      }

      // Server already wrote customer (+ optional lead/comm). Skip AutoSyncListener
      // so the browser does not re-upsert to Supabase (401 / PostgREST 42501).
      await withoutAutoSyncAsync(async () => {
        addCustomer(body.customer!);
        if (body.lead) addLead(body.lead);
        if (body.comm) addComm(body.comm);
      });

      const parts = [`Customer ${body.customer.id} created.`];
      if (body.lead) parts.push(`Lead ${body.lead.id} (Inquiry) added.`);
      if (body.comm) parts.push('Initial inquiry logged.');

      return {
        ok: true,
        customer: body.customer,
        leadId: body.lead?.id,
        message: parts.join(' '),
      };
    },
    [addCustomer, updateCustomer, addLead, addComm],
  );

  return { saveFromForm, customers, agents };
}

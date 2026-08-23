'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import type { CustomerFormSavePayload } from '@/components/customers/CustomerFormModal';
import type { CustomerFormData } from '@/lib/customers/customer-form';
import type { Comm, Customer, Lead } from '@/lib/types';

export type CustomerSaveOutcome =
  | { ok: true; customer: Customer; leadId?: string; message?: string }
  | { ok: false; error: 'duplicate_email'; existing: Customer };

type CustomerMutationResponse = {
  ok?: boolean;
  error?: string;
  customer?: Customer;
  lead?: Lead | null;
  comm?: Comm | null;
  existing?: Customer | null;
};

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

        if (res.status === 409 || body.error === 'duplicate_email') {
          return {
            ok: false,
            error: 'duplicate_email',
            existing: body.existing ?? existing,
          };
        }

        if (!res.ok || !body.ok || !body.customer) {
          throw new Error(body.error || 'Không thể cập nhật khách hàng.');
        }

        updateCustomer(body.customer.id, body.customer);
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
        return {
          ok: false,
          error: 'duplicate_email',
          existing: body.existing ?? ({ email: payload.form.email } as Customer),
        };
      }

      if (!res.ok || !body.ok || !body.customer) {
        throw new Error(body.error || 'Không thể tạo khách hàng.');
      }

      addCustomer(body.customer);
      if (body.lead) addLead(body.lead);
      if (body.comm) addComm(body.comm);

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

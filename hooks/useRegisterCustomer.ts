'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useStore';
import type { CustomerFormSavePayload } from '@/components/customers/CustomerFormModal';
import {
  buildCustomerFromForm,
  findDuplicateCustomerByEmail,
  registerNewCustomer,
  type RegisterNewCustomerResult,
} from '@/lib/customer-onboarding';
import type { Customer } from '@/lib/types';

export type CustomerSaveOutcome =
  | { ok: true; customer: Customer; leadId?: string; message?: string }
  | { ok: false; error: 'duplicate_email'; existing: Customer };

export function useRegisterCustomer() {
  const customers = useStore((s) => s.customers);
  const agents = useStore((s) => s.agents);
  const leads = useStore((s) => s.leads);
  const addCustomer = useStore((s) => s.addCustomer);
  const updateCustomer = useStore((s) => s.updateCustomer);
  const addLead = useStore((s) => s.addLead);
  const addComm = useStore((s) => s.addComm);

  const saveFromForm = useCallback(
    (payload: CustomerFormSavePayload): CustomerSaveOutcome => {
      if (payload.mode === 'edit') {
        const existing = payload.existingCustomer;
        if (!existing) {
          throw new Error('CustomerFormModal: existingCustomer required in edit mode');
        }

        const duplicate = findDuplicateCustomerByEmail(customers, payload.form.email, existing.id);
        if (duplicate) {
          return { ok: false, error: 'duplicate_email', existing: duplicate };
        }

        const updated = buildCustomerFromForm(payload.form, customers, agents, {
          mode: 'edit',
          existingId: existing.id,
          existingBookings: existing.bookings,
        });
        updateCustomer(updated.id, updated);
        return { ok: true, customer: updated };
      }

      const result: RegisterNewCustomerResult = registerNewCustomer({
        form: payload.form,
        customers,
        agents,
        leads,
        logInquiry: payload.logInquiry,
        createLead: true,
        flagTourDesign: payload.flagTourDesign ?? false,
      });

      if (!result.ok) {
        return result;
      }

      addCustomer(result.customer);
      if (result.lead) addLead(result.lead);
      if (result.comm) addComm(result.comm);

      const parts = [`Customer ${result.customer.id} created.`];
      if (result.lead) parts.push(`Lead ${result.lead.id} (Inquiry) added.`);
      if (result.comm) parts.push('Initial inquiry logged.');

      return {
        ok: true,
        customer: result.customer,
        leadId: result.lead?.id,
        message: parts.join(' '),
      };
    },
    [customers, agents, leads, addCustomer, updateCustomer, addLead, addComm]
  );

  return { saveFromForm, customers, agents };
}

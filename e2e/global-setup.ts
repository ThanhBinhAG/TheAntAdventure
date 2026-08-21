import { getAdminClient, loadE2eEnvironment, writeE2eState, type E2eState } from './support';

export default async function globalSetup(): Promise<void> {
  loadE2eEnvironment();
  const admin = getAdminClient();
  const prefix = `E2E-${Date.now()}-${process.pid}`;
  const password = `E2e-${prefix}-Password!`;
  const createUser = async (label: 'admin' | 'unassigned', roleCode?: 'admin') => {
    const email = `${prefix.toLowerCase()}-${label}@example.test`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error('Unable to create E2E user.');
    if (roleCode) {
      const { error: roleError } = await admin.from('user_roles').insert({ user_id: data.user.id, role_code: roleCode });
      if (roleError) throw roleError;
    }
    return { id: data.user.id, email, password };
  };

  const e2eAdmin = await createUser('admin', 'admin');
  const unassigned = await createUser('unassigned');
  const customerId = `${prefix}-CUSTOMER`;
  const leadId = `${prefix}-LEAD`;
  const { error: customerError } = await admin.from('customers').insert({ id: customerId, name: `${prefix} Customer` });
  if (customerError) throw customerError;
  const { error: leadError } = await admin.from('leads').insert({ id: leadId, cust_id: customerId, tour: `${prefix} Tour` });
  if (leadError) throw leadError;

  const state: E2eState = { prefix, admin: e2eAdmin, unassigned, customerId, leadId };
  await writeE2eState(state);
}

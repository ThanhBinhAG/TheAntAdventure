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
  const legacyScopeRoleCode = `e2e_legacy_${Date.now().toString(36)}_${process.pid}`;
  const legacyScopeRoleLabel = `${prefix} Legacy Assigned Scope`;
  const { error: legacyRoleError } = await admin.from('roles').insert({
    code: legacyScopeRoleCode,
    label: legacyScopeRoleLabel,
    description: 'Role fixture retaining an Assigned scope from before the assignment UI exists.',
    is_system: false,
    is_active: true,
    sort_order: 9_999,
  });
  if (legacyRoleError) throw legacyRoleError;
  const { error: legacyPermissionError } = await admin.from('role_permissions').insert({
    role_code: legacyScopeRoleCode,
    permission_code: 'bookings.read',
  });
  if (legacyPermissionError) throw legacyPermissionError;
  const { error: legacyScopeError } = await admin.from('role_resource_scopes').insert({
    role_code: legacyScopeRoleCode,
    resource_code: 'bookings',
    action: 'read',
    scope: 'assigned',
  });
  if (legacyScopeError) throw legacyScopeError;

  const state: E2eState = {
    prefix,
    admin: e2eAdmin,
    unassigned,
    customerId,
    leadId,
    legacyScopeRoleCode,
    legacyScopeRoleLabel,
  };
  await writeE2eState(state);
}

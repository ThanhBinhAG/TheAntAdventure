import { getAdminClient, loadE2eEnvironment, readE2eState, removeE2eState } from './support';

export default async function globalTeardown(): Promise<void> {
  loadE2eEnvironment();
  const state = await readE2eState().catch(() => null);
  if (!state) return;
  const admin = getAdminClient();
  await admin.from('tour_drafts').delete().eq('lead_id', state.leadId);
  await admin.from('comms').delete().eq('cust_id', state.customerId);
  await admin.from('leads').delete().eq('cust_id', state.customerId);
  await admin.from('leads').delete().eq('id', state.leadId);
  await admin.from('customers').delete().eq('id', state.customerId);
  await admin.from('customers').delete().ilike('name', `${state.prefix}%`);
  await admin.from('agents').delete().ilike('name', `${state.prefix}%`);
  await admin.from('photo_folders').delete().ilike('name', `${state.prefix}%`);
  await admin.from('tasks').delete().like('id', `${state.prefix}%`);
  await admin.from('attractions').delete().like('id', `${state.prefix}%`);
  await admin.from('products').delete().like('code', `${state.prefix}%`);
  await admin.from('role_resource_scopes').delete().eq('role_code', state.legacyScopeRoleCode);
  await admin.from('role_permissions').delete().eq('role_code', state.legacyScopeRoleCode);
  await admin.from('roles').delete().eq('code', state.legacyScopeRoleCode);
  await admin.auth.admin.deleteUser(state.admin.id);
  await admin.auth.admin.deleteUser(state.unassigned.id);
  await removeE2eState();
}

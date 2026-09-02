import assert from 'node:assert/strict';
import test from 'node:test';
import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';

loadEnvConfig(process.cwd());

const enabled = process.env.RLS_SCOPE_INTEGRATION === '1';

function selectedIds(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => (
    row && typeof row === 'object' && 'id' in row && typeof row.id === 'string'
      ? [row.id]
      : []
  ));
}

async function signedInClient(url: string, anonKey: string, email: string, password: string) {
  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  assert.equal(error, null);
  assert.ok(data.session?.access_token, 'The integration user must receive a JWT.');

  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

test('Supabase RLS differentiates own/all customer scopes and ignores a legacy Assigned booking scope', {
  skip: enabled ? undefined : 'Set RLS_SCOPE_INTEGRATION=1 to run against a disposable Supabase database.',
}, async () => {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !serviceRoleKey || !anonKey) {
    throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY are required.');
  }

  const hostname = new URL(url).hostname;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  if (!isLocal && process.env.RLS_SCOPE_ALLOW_REMOTE_DATABASE !== '1') {
    throw new Error('RLS scope integration only permits localhost unless RLS_SCOPE_ALLOW_REMOTE_DATABASE=1 targets a dedicated test database.');
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const suffix = `${Date.now().toString(36)}_${process.pid}`;
  const roleA = `rls_own_${suffix}`;
  const roleB = `rls_other_${suffix}`;
  const roleC = `rls_assigned_${suffix}`;
  const ownerEmail = `rls-owner-${suffix}@example.test`;
  const otherEmail = `rls-other-${suffix}@example.test`;
  const assignedEmail = `rls-assigned-${suffix}@example.test`;
  const password = `Rls-${suffix}-Password!`;
  const customerId = `RLS-${suffix}-CUSTOMER`;
  const bookingId = `RLS-${suffix}-BOOKING`;
  let ownerUserId: string | null = null;
  let otherUserId: string | null = null;
  let assignedUserId: string | null = null;

  try {
    const [ownerResult, otherResult, assignedResult] = await Promise.all([
      admin.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true }),
      admin.auth.admin.createUser({ email: otherEmail, password, email_confirm: true }),
      admin.auth.admin.createUser({ email: assignedEmail, password, email_confirm: true }),
    ]);
    assert.equal(ownerResult.error, null);
    assert.equal(otherResult.error, null);
    assert.equal(assignedResult.error, null);
    assert.ok(ownerResult.data.user, 'Owner test user must be created.');
    assert.ok(otherResult.data.user, 'Other test user must be created.');
    assert.ok(assignedResult.data.user, 'Assigned test user must be created.');
    ownerUserId = ownerResult.data.user.id;
    otherUserId = otherResult.data.user.id;
    assignedUserId = assignedResult.data.user.id;

    const { error: rolesError } = await admin.from('roles').insert([
      { code: roleA, label: 'RLS own integration role', is_system: false, is_active: true, sort_order: 0 },
      { code: roleB, label: 'RLS other integration role', is_system: false, is_active: true, sort_order: 0 },
      { code: roleC, label: 'RLS assigned integration role', is_system: false, is_active: true, sort_order: 0 },
    ]);
    assert.equal(rolesError, null);
    const { error: permissionsError } = await admin.from('role_permissions').insert([
      { role_code: roleA, permission_code: 'customers.read' },
      { role_code: roleB, permission_code: 'customers.read' },
      { role_code: roleC, permission_code: 'bookings.read' },
    ]);
    assert.equal(permissionsError, null);
    const { error: userRolesError } = await admin.from('user_roles').insert([
      { user_id: ownerUserId, role_code: roleA },
      { user_id: otherUserId, role_code: roleB },
      { user_id: assignedUserId, role_code: roleC },
    ]);
    assert.equal(userRolesError, null);
    const { error: scopesError } = await admin.from('role_resource_scopes').insert([
      { role_code: roleA, resource_code: 'customers', action: 'read', scope: 'own' },
      { role_code: roleB, resource_code: 'customers', action: 'read', scope: 'own' },
      { role_code: roleC, resource_code: 'bookings', action: 'read', scope: 'assigned' },
    ]);
    assert.equal(scopesError, null);
    const { error: customerError } = await admin.from('customers').insert({
      id: customerId,
      name: `${customerId} customer`,
      owner_user_id: ownerUserId,
    });
    assert.equal(customerError, null);
    const { error: bookingError } = await admin.from('bookings').insert({
      id: bookingId,
      tour: `${bookingId} tour`,
      owner_user_id: ownerUserId,
      assigned_user_id: assignedUserId,
    });
    assert.equal(bookingError, null);

    const [ownerClient, otherClient, assignedClient] = await Promise.all([
      signedInClient(url, anonKey, ownerEmail, password),
      signedInClient(url, anonKey, otherEmail, password),
      signedInClient(url, anonKey, assignedEmail, password),
    ]);
    const [ownerRows, otherRows] = await Promise.all([
      ownerClient.from('customers').select('id').eq('id', customerId),
      otherClient.from('customers').select('id').eq('id', customerId),
    ]);
    assert.equal(ownerRows.error, null);
    assert.equal(otherRows.error, null);
    assert.deepEqual(selectedIds(ownerRows.data), [customerId]);
    assert.deepEqual(selectedIds(otherRows.data), []);

    const { error: promoteScopeError } = await admin
      .from('role_resource_scopes')
      .update({ scope: 'all' })
      .eq('role_code', roleB)
      .eq('resource_code', 'customers')
      .eq('action', 'read');
    assert.equal(promoteScopeError, null);
    const allScopeRows = await otherClient.from('customers').select('id').eq('id', customerId);
    assert.equal(allScopeRows.error, null);
    assert.deepEqual(selectedIds(allScopeRows.data), [customerId]);

    const assignedRows = await assignedClient
      .from('bookings')
      .select('id')
      .eq('id', bookingId);
    assert.equal(assignedRows.error, null);
    assert.deepEqual(selectedIds(assignedRows.data), []);
  } finally {
    await admin.from('bookings').delete().eq('id', bookingId);
    await admin.from('customers').delete().eq('id', customerId);
    await admin.from('roles').delete().in('code', [roleA, roleB, roleC]);
    if (ownerUserId) await admin.auth.admin.deleteUser(ownerUserId);
    if (otherUserId) await admin.auth.admin.deleteUser(otherUserId);
    if (assignedUserId) await admin.auth.admin.deleteUser(assignedUserId);
  }
});

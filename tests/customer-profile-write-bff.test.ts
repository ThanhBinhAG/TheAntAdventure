import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test, { mock } from 'node:test';

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

let authenticated = true;
let writeAllowed = true;
const inquiryLead = { id: 'LD-099', custId: 'CL-001', stage: 'Inquiry' };
const createdComm = {
  id: 'CM-1',
  cid: 'CL-001',
  type: 'Email',
  dir: 'outbound' as const,
  date: '2026-08-25',
  subj: 'Hello',
  body: 'Body',
  author: 'Tai (The Ant Adventures)',
};
const inquiryCalls: Array<{ id: string; body: unknown }> = [];
const commCalls: Array<{ id: string; body: unknown }> = [];

mock.module(require.resolve('../lib/auth/permissions-server'), {
  namedExports: {
    checkPermissionForRequest: async () => {
      if (!authenticated) return { allowed: false, status: 401 };
      return writeAllowed ? { allowed: true } : { allowed: false, status: 403 };
    },
  },
});

mock.module(require.resolve('../lib/customers/customer-repository'), {
  namedExports: {
    CustomerRepositoryError: class CustomerRepositoryError extends Error {
      constructor(
        message: string,
        readonly code: string = 'query',
      ) {
        super(message);
        this.name = 'CustomerRepositoryError';
      }
    },
    createCustomerInquiry: async (id: string, body: unknown) => {
      inquiryCalls.push({ id, body });
      return inquiryLead;
    },
    createCustomerComm: async (id: string, body: unknown) => {
      commCalls.push({ id, body });
      return createdComm;
    },
  },
});

test('POST /api/customers/:id/inquiry requires write and returns lead', async (t) => {
  const route = await import('../app/api/customers/[id]/inquiry/route');

  await t.beforeEach(() => {
    authenticated = true;
    writeAllowed = true;
    inquiryCalls.length = 0;
  });

  await t.test('401 when unauthenticated', async () => {
    authenticated = false;
    const response = await route.POST(
      new Request('http://localhost/api/customers/CL-001/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
      { params: Promise.resolve({ id: 'CL-001' }) },
    );
    assert.equal(response.status, 401);
    assert.equal(inquiryCalls.length, 0);
  });

  await t.test('403 without customers.write', async () => {
    writeAllowed = false;
    const response = await route.POST(
      new Request('http://localhost/api/customers/CL-001/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
      { params: Promise.resolve({ id: 'CL-001' }) },
    );
    assert.equal(response.status, 403);
    assert.equal(inquiryCalls.length, 0);
  });

  await t.test('400 on invalid JSON body', async () => {
    const response = await route.POST(
      new Request('http://localhost/api/customers/CL-001/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{',
      }),
      { params: Promise.resolve({ id: 'CL-001' }) },
    );
    assert.equal(response.status, 400);
    assert.equal(inquiryCalls.length, 0);
  });

  await t.test('200 creates inquiry with default flagTourDesign', async () => {
    const response = await route.POST(
      new Request('http://localhost/api/customers/CL-001/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      }),
      { params: Promise.resolve({ id: 'CL-001' }) },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, lead: inquiryLead });
    assert.deepEqual(inquiryCalls, [
      { id: 'CL-001', body: { flagTourDesign: true } },
    ]);
  });
});

test('POST /api/customers/:id/comms requires write and returns comm', async (t) => {
  const route = await import('../app/api/customers/[id]/comms/route');

  await t.beforeEach(() => {
    authenticated = true;
    writeAllowed = true;
    commCalls.length = 0;
  });

  await t.test('401 when unauthenticated', async () => {
    authenticated = false;
    const response = await route.POST(
      new Request('http://localhost/api/customers/CL-001/comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Email',
          dir: 'outbound',
          date: '2026-08-25',
          subj: 'Hello',
        }),
      }),
      { params: Promise.resolve({ id: 'CL-001' }) },
    );
    assert.equal(response.status, 401);
    assert.equal(commCalls.length, 0);
  });

  await t.test('400 when subject missing', async () => {
    const response = await route.POST(
      new Request('http://localhost/api/customers/CL-001/comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'Email',
          dir: 'outbound',
          date: '2026-08-25',
          subj: '',
        }),
      }),
      { params: Promise.resolve({ id: 'CL-001' }) },
    );
    assert.equal(response.status, 400);
    assert.equal(commCalls.length, 0);
  });

  await t.test('200 creates communication', async () => {
    const body = {
      type: 'Email',
      dir: 'outbound',
      date: '2026-08-25',
      subj: 'Hello',
      body: 'Body',
    };
    const response = await route.POST(
      new Request('http://localhost/api/customers/CL-001/comms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: 'CL-001' }) },
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true, comm: createdComm });
    assert.deepEqual(commCalls, [{ id: 'CL-001', body }]);
  });
});

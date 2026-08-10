import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  deleteAccessControlStaffRole,
  fetchAuthLoginEvents,
} from '../components/access-control/access-control-api';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('access-control login history API client', () => {
  it('serializes pagination and non-empty server-side filters', async () => {
    let requestedUrl = '';

    globalThis.fetch = async (input) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({
        ok: true,
        items: [],
        totalCount: 0,
        page: 2,
        pageSize: 50,
        totalPages: 0,
      }), { status: 200 });
    };

    await fetchAuthLoginEvents({
      page: 2,
      pageSize: 50,
      userQuery: '  Ngôn  ',
      ipAddress: ' 203.0.113.10 ',
      deviceType: 'desktop',
      from: '2026-08-01T00:00:00.000Z',
      to: '2026-08-07T00:00:00.000Z',
    });

    const url = new URL(requestedUrl, 'http://localhost');
    assert.equal(url.pathname, '/api/access-control/login-history');
    assert.equal(url.searchParams.get('page'), '2');
    assert.equal(url.searchParams.get('pageSize'), '50');
    assert.equal(url.searchParams.get('user'), 'Ngôn');
    assert.equal(url.searchParams.get('ip'), '203.0.113.10');
    assert.equal(url.searchParams.get('deviceType'), 'desktop');
    assert.equal(url.searchParams.get('from'), '2026-08-01T00:00:00.000Z');
    assert.equal(url.searchParams.get('to'), '2026-08-07T00:00:00.000Z');
  });

  it('keeps the server error message when a filter is rejected', async () => {
    globalThis.fetch = async () => new Response(JSON.stringify({
      ok: false,
      error: 'Bộ lọc lịch sử đăng nhập không hợp lệ.',
    }), { status: 400 });

    await assert.rejects(
      fetchAuthLoginEvents({ page: 1, pageSize: 25 }),
      /Bộ lọc lịch sử đăng nhập không hợp lệ/,
    );
  });
});

describe('access-control staff role API client', () => {
  it('sends DELETE with the selected dynamic role code', async () => {
    let requestedUrl = '';
    let requestedMethod = '';
    let requestedBody = '';

    globalThis.fetch = async (input, init) => {
      requestedUrl = String(input);
      requestedMethod = init?.method ?? '';
      requestedBody = String(init?.body ?? '');
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };

    await deleteAccessControlStaffRole('sales');

    assert.equal(requestedUrl, '/api/access-control/staff-roles');
    assert.equal(requestedMethod, 'DELETE');
    assert.equal(requestedBody, JSON.stringify({ code: 'sales' }));
  });
});

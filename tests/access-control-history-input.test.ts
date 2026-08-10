import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  accessControlAuditLogsQuerySchema,
} from '../lib/access-control/audit-log-input';
import {
  parseAuthLoginHistoryQuery,
} from '../lib/access-control/login-history-input';

describe('access-control history request input', () => {
  it('applies safe audit log pagination defaults and limits', () => {
    assert.deepEqual(accessControlAuditLogsQuerySchema.parse({}), {
      page: 1,
      pageSize: 20,
    });
    assert.equal(
      accessControlAuditLogsQuerySchema.safeParse({ page: '1.2' }).success,
      false,
    );
    assert.equal(
      accessControlAuditLogsQuerySchema.safeParse({ pageSize: '101' }).success,
      false,
    );
  });

  it('parses valid login-history filters including IPv4 and ISO timestamps', () => {
    const result = parseAuthLoginHistoryQuery(new URL(
      'http://localhost/api/access-control/login-history?'
      + 'page=2&pageSize=50&user=%20Ng%C3%B4n%20&ip=203.0.113.10'
      + '&deviceType=desktop&from=2026-08-01T00:00:00.000Z'
      + '&to=2026-08-07T00:00:00.000Z',
    ));

    assert.equal(result.success, true);
    if (result.success) {
      assert.deepEqual(result.data, {
        page: 2,
        pageSize: 50,
        // userId không được gửi thì parser giữ undefined để route truyền
        // rõ ràng bộ lọc này không được áp dụng cho RPC.
        userId: undefined,
        user: 'Ngôn',
        ip: '203.0.113.10',
        deviceType: 'desktop',
        from: '2026-08-01T00:00:00.000Z',
        to: '2026-08-07T00:00:00.000Z',
      });
    }
  });

  it('rejects invalid IP, device type, date and pagination filters', () => {
    for (const query of [
      '?ip=not-an-ip',
      '?deviceType=watch',
      '?from=2026-08-01',
      '?page=0',
      '?pageSize=101',
    ]) {
      assert.equal(
        parseAuthLoginHistoryQuery(new URL(
          `http://localhost/api/access-control/login-history${query}`,
        )).success,
        false,
      );
    }
  });
});

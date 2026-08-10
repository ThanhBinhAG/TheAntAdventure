import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  getStaffRoleRpcErrorResponse,
} from '../lib/access-control/staff-role-error';

describe('access-control staff role errors', () => {
  it('returns a friendly conflict message for a duplicate role code', () => {
    assert.deepEqual(
      getStaffRoleRpcErrorResponse('23505', 'duplicate key value'),
      { status: 409, error: 'Mã role đã tồn tại. Hãy dùng mã khác.' },
    );
  });

  it('keeps known validation errors and ignores unknown errors', () => {
    assert.deepEqual(
      getStaffRoleRpcErrorResponse('22023', 'Mã role không hợp lệ.'),
      { status: 400, error: 'Mã role không hợp lệ.' },
    );
    assert.equal(getStaffRoleRpcErrorResponse('XX000', 'Lỗi lạ'), null);
  });

  it('returns a conflict when the role is still assigned to users', () => {
    assert.deepEqual(
      getStaffRoleRpcErrorResponse(
        '23503',
        'Hãy chuyển toàn bộ nhân viên sang role khác trước.',
      ),
      {
        status: 409,
        error: 'Hãy chuyển toàn bộ nhân viên sang role khác trước.',
      },
    );
  });
});

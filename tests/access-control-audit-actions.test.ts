import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getAccessControlAuditActionPresentation } from '../lib/access-control/audit-log-presentation';

describe('access-control audit action presentation', () => {
  it('shows Vietnamese labels for dynamic staff role actions', () => {
    assert.equal(
      getAccessControlAuditActionPresentation('permission_created').label,
      'Thêm chức năng',
    );
    assert.equal(
      getAccessControlAuditActionPresentation('permission_created').color,
      'green',
    );
    assert.equal(
      getAccessControlAuditActionPresentation('staff_role_created').label,
      'Tạo role',
    );
    assert.equal(
      getAccessControlAuditActionPresentation('staff_role_updated').label,
      'Cập nhật role',
    );
    assert.equal(
      getAccessControlAuditActionPresentation(
        'staff_role_permissions_replaced',
      ).label,
      'Cập nhật quyền role',
    );
    assert.equal(
      getAccessControlAuditActionPresentation('staff_role_deleted').label,
      'Xóa role',
    );
    assert.equal(
      getAccessControlAuditActionPresentation(
        'staff_role_resource_scopes_replaced',
      ).label,
      'Đã cập nhật phạm vi dữ liệu của role.',
    );
  });

  it('shows Vietnamese labels for user lifecycle actions', () => {
    assert.equal(
      getAccessControlAuditActionPresentation('user_profile_updated').label,
      'Cập nhật thông tin người dùng',
    );
    assert.equal(
      getAccessControlAuditActionPresentation('user_activated').label,
      'Kích hoạt tài khoản',
    );
    assert.equal(
      getAccessControlAuditActionPresentation('user_deactivated').label,
      'Vô hiệu hóa tài khoản',
    );
    assert.equal(
      getAccessControlAuditActionPresentation('user_soft_deleted').label,
      'Xóa mềm tài khoản',
    );
    assert.equal(
      getAccessControlAuditActionPresentation('user_restored').label,
      'Khôi phục tài khoản',
    );
  });

  it('keeps an unknown technical action visible for troubleshooting', () => {
    assert.equal(
      getAccessControlAuditActionPresentation('future_action').label,
      'future_action',
    );
  });

  it('returns the English label without changing the database action code', () => {
    assert.equal(
      getAccessControlAuditActionPresentation(
        'staff_role_created',
        'en',
      ).label,
      'Create Role',
    );
  });
});

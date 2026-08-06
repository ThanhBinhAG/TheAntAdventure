import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  discardRolePermissionDraft,
  filterPermissionGroupsByQuery,
  formatPermissionAssignmentSummary,
} from '../components/access-control/role-permission-ui';

describe('access-control role UI helpers', () => {
  it('removes only the selected role draft when discarding changes', () => {
    assert.deepEqual(
      discardRolePermissionDraft(
        { employee: ['dashboard.read'], sales: ['sales.read'] },
        'employee',
      ),
      { sales: ['sales.read'] },
    );
  });

  it('makes the assigned and catalog permission totals explicit', () => {
    assert.equal(
      formatPermissionAssignmentSummary(20, 28),
      'Đã cấp 20 / 28 quyền',
    );
  });

  it('filters groups by their label and permissions by their display label', () => {
    const groups = [
      {
        code: 'customers',
        label: 'Khách hàng',
        items: [
          { permission_description: 'Xem khách hàng' },
          { permission_description: 'Sửa khách hàng' },
        ],
      },
      {
        code: 'agents',
        label: 'Đại lý B2B',
        items: [{ permission_description: 'Xem đại lý' }],
      },
    ];

    assert.deepEqual(
      filterPermissionGroupsByQuery(groups, 'đại lý'),
      [groups[1]],
    );
    assert.deepEqual(
      filterPermissionGroupsByQuery(groups, 'sửa'),
      [{
        code: 'customers',
        label: 'Khách hàng',
        items: [{ permission_description: 'Sửa khách hàng' }],
      }],
    );
  });
});

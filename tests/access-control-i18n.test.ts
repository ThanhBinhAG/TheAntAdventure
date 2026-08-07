import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    tac,
    tacPermission,
    tacPermissionGroup,
    tacTemplate,
} from '../lib/i18n/pages/access-control';

describe('access-control i18n', () => {
    it('returns the matching EN and VI label for one shared key', () => {
        assert.equal(tac('users', 'en'), 'Users');
        assert.equal(tac('users', 'vi'), 'Người dùng');
    });

    it('translates system permission metadata but preserves dynamic metadata', () => {
        assert.equal(tacPermissionGroup('sales', 'Bán hàng', 'en'), 'Sales');
        assert.equal(tacPermission('sales.read', 'Xem sales', 'en'), 'View sales');
        assert.equal(tacPermission('reports.read', 'Custom report', 'en'), 'Custom report');
    });

    it('interpolates role and count values into translated copy', () => {
        assert.equal(
            tacTemplate('configureRole', 'en', { role: 'Sales' }),
            'Configure permissions: Sales',
        );
    });
});

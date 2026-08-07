import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
    accessControlError,
    accessControlPermissionError,
} from '../lib/access-control/api-error';
import {
    AccessControlApiError,
    getAccessControlErrorMessage,
} from '../components/access-control/access-control-api';

describe('access-control API error contract', () => {
    it('returns a stable code while preserving the safe server message', () => {
        assert.deepEqual(
            accessControlError('ROLE_CODE_EXISTS', 'Mã role đã tồn tại.'),
            {
                ok: false,
                errorCode: 'ROLE_CODE_EXISTS',
                error: 'Mã role đã tồn tại.',
            },
        );
    });

    it('distinguishes an expired session from a missing permission', () => {
        assert.equal(
            accessControlPermissionError(401).errorCode,
            'AUTH_UNAUTHORIZED',
        );
        assert.equal(
            accessControlPermissionError(403).errorCode,
            'ACCESS_DENIED',
        );
    });

    it('translates a client error by code instead of the server sentence', () => {
        const error = new AccessControlApiError(
            'Mã role đã tồn tại.',
            'ROLE_CODE_EXISTS',
            409,
        );

        assert.equal(
            getAccessControlErrorMessage(
                error,
                'en',
                'createRoleFailedRetry',
            ),
            'This role code already exists. Choose a different code.',
        );
    });
});

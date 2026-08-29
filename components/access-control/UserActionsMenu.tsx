'use client';

/**
 * Menu thao tác nhanh của một user trong bảng Access Control.
 *
 * Chức năng:
 * - Mở Drawer sửa tên hiển thị.
 * - Kích hoạt hoặc vô hiệu hóa user.
 *
 * Lưu ý:
 * - Component chỉ gọi API client.
 * - Database vẫn là nơi kiểm tra users.manage
 *   và chặn thao tác nguy hiểm với Super Admin.
 */

import { useState } from 'react';
import {
    EditOutlined,
    KeyOutlined,
    LockOutlined,
    MoreOutlined,
    UnlockOutlined,
} from '@ant-design/icons';
import {
    Button,
    Dropdown,
} from 'antd';
import type { MenuProps } from 'antd';
import { confirmDialog } from '@/lib/confirm';
import { useLanguage } from '@/hooks/useLanguage';
import {
    tac,
    tacTemplate,
} from '@/lib/i18n/pages/access-control';
import { toast } from '@/lib/toast';
import {
    getAccessControlErrorMessage,
    updateUserActiveStatus,
    type AccessControlUser,
} from './access-control-api';

type UserActionsMenuProps = {
    user: AccessControlUser;
    onChanged: () => Promise<void>;
    onEditInfo: () => void;
    onChangePassword: () => void;
};

export default function UserActionsMenu({
    user,
    onEditInfo,
    onChangePassword,
    onChanged,
}: UserActionsMenuProps) {
    const { language } = useLanguage();
    const [saving, setSaving] = useState(false);

    /** Đổi trạng thái hoạt động của user sau khi xác nhận. */
    async function handleChangeActiveStatus() {
        const nextIsActive = !user.is_active;

        const confirmed = await confirmDialog(
            tacTemplate(
                nextIsActive
                    ? 'activateUserQuestion'
                    : 'deactivateUserQuestion',
                language,
                { email: user.email ?? '' },
            ),
            {
                title: nextIsActive
                    ? tac('activateUserConfirmation', language)
                    : tac('deactivateUserConfirmation', language),
                confirmLabel: nextIsActive
                    ? tac('activate', language)
                    : tac('deactivate', language),
                cancelLabel: tac('cancel', language),
                danger: !nextIsActive,
            },
        );

        if (!confirmed) return;

        setSaving(true);

        try {
            await updateUserActiveStatus(
                user.user_id,
                nextIsActive,
            );

            toast.success(
                nextIsActive
                    ? tac('userActivated', language)
                    : tac('userDeactivated', language),
            );

            await onChanged();
        } catch (error) {
            toast.error(getAccessControlErrorMessage(
                error,
                language,
                'updateUserStatusFailed',
            ));
        } finally {
            setSaving(false);
        }
    }

    const menuItems: MenuProps['items'] = [
        {
            key: 'edit-info',
            icon: <EditOutlined />,
            label: tac('editInformation', language),
            onClick: onEditInfo,
        },
        {
            key: 'change-password',
            icon: <KeyOutlined />,
            label: tac('changePassword', language),
            onClick: onChangePassword,
        },
        {
            key: 'active-status',
            icon: user.is_active
                ? <LockOutlined />
                : <UnlockOutlined />,
            label: user.is_active
                ? tac('deactivate', language)
                : tac('activate', language),
            disabled: saving,
            onClick: () => {
                void handleChangeActiveStatus();
            },
        },
    ];

    return (
        <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
        >
            <Button
                aria-label={tac('openUserActions', language)}
                icon={<MoreOutlined />}
                loading={saving}
                size="small"
            />
        </Dropdown>
    );
}

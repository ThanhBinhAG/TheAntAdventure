'use client';

/**
 * Menu thao tác nhanh của một user trong bảng Access Control.
 *
 * Chức năng:
 * - Mở Drawer sửa tên hiển thị.
 * - Kích hoạt hoặc vô hiệu hóa user.
 * - Xóa mềm user sau khi xác nhận.
 *
 * Lưu ý:
 * - Component chỉ gọi API client.
 * - Database vẫn là nơi kiểm tra users.manage
 *   và chặn thao tác nguy hiểm với Super Admin.
 */

import { useState } from 'react';
import {
    EditOutlined,
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
import { toast } from '@/lib/toast';
import {
    updateUserActiveStatus,
    type AccessControlUser,
} from './access-control-api';



type UserActionsMenuProps = {
    user: AccessControlUser;
    onChanged: () => Promise<void>;
    onEditInfo: () => void;
};

export default function UserActionsMenu({
    user,
    onEditInfo,
    onChanged,
}: UserActionsMenuProps) {
    const [saving, setSaving] = useState(false);

    /** Đổi trạng thái hoạt động của user sau khi xác nhận. */
    async function handleChangeActiveStatus() {
        const nextIsActive = !user.is_active;

        const confirmed = await confirmDialog(
            nextIsActive
                ? `Kích hoạt lại tài khoản ${user.email ?? ''}?`
                : `Vô hiệu hóa tài khoản ${user.email ?? ''}?`,
            {
                title: nextIsActive
                    ? 'Xác nhận kích hoạt'
                    : 'Xác nhận vô hiệu hóa',
                confirmLabel: nextIsActive
                    ? 'Kích hoạt'
                    : 'Vô hiệu hóa',
                cancelLabel: 'Hủy',
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
                    ? 'Đã kích hoạt tài khoản.'
                    : 'Đã vô hiệu hóa tài khoản.',
            );

            await onChanged();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Không thể cập nhật trạng thái user.',
            );
        } finally {
            setSaving(false);
        }
    }


    const menuItems: MenuProps['items'] = [
        {
            key: 'edit-info',
            icon: <EditOutlined />,
            label: 'Sửa thông tin',
            onClick: onEditInfo,
        },
        {
            key: 'active-status',
            icon: user.is_active
                ? <LockOutlined />
                : <UnlockOutlined />,
            label: user.is_active
                ? 'Vô hiệu hóa'
                : 'Kích hoạt',
            disabled: saving,
            onClick: () => {
                void handleChangeActiveStatus();
            },
        },
        {
            type: 'divider',
        },
    ];

    return (
        <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
        >
            <Button
                aria-label="Mở menu thao tác user"
                icon={<MoreOutlined />}
                loading={saving}
                size="small"
            />
        </Dropdown>
    );
}

'use client';

/**
 * Drawer sửa thông tin cơ bản của user.
 *
 * Chức năng:
 * - Hiển thị email chỉ đọc.
 * - Cho phép sửa tên hiển thị.
 * - Gọi onSave để component cha cập nhật qua API.
 *
 * Lưu ý:
 * - Không sửa email ở V1 vì email thuộc Supabase Auth.
 * - Đổi role dùng UserAccessDrawer riêng.
 */

import {
    useState,
    type FormEvent,
} from 'react';
import {
    Button,
    Drawer,
    Input,
} from 'antd';
import type { AccessControlUser } from './access-control-api';
import styles from './AccessControlPage.module.css';

type UserEditDrawerProps = {
    user: AccessControlUser | null;
    saving: boolean;
    onClose: () => void;
    onSave: (
        userId: string,
        displayName: string,
    ) => Promise<void>;
};

export default function UserEditDrawer({
    user,
    saving,
    onClose,
    onSave,
}: UserEditDrawerProps) {
    const [displayName, setDisplayName] = useState(
        () => user?.display_name ?? '',
    );
    const [error, setError] =
        useState<string | null>(null);

    // UserDirectory truyền key theo user_id, nên form tự khởi tạo lại khi đổi user.

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const normalizedName = displayName.trim();

        if (!normalizedName) {
            setError('Tên hiển thị không được để trống.');
            return;
        }

        if (!user) return;

        setError(null);
        await onSave(user.user_id, normalizedName);
    }

    return (
        <Drawer
            title="Sửa thông tin người dùng"
            open={Boolean(user)}
            width={480}
            onClose={onClose}
            destroyOnHidden
        >
            {user && (
                <form
                    className={styles.userEditForm}
                    onSubmit={(event) => {
                        void handleSubmit(event);
                    }}
                >
                    <div className={styles.drawerReadOnlyField}>
                        <span>Email</span>
                        <strong>{user.email ?? 'Chưa có email'}</strong>
                    </div>

                    <div className={styles.drawerField}>
                        <label htmlFor="user-display-name">
                            Tên hiển thị
                        </label>

                        <Input
                            id="user-display-name"
                            value={displayName}
                            disabled={saving}
                            maxLength={100}
                            status={error ? 'error' : undefined}
                            onChange={(event) => {
                                setDisplayName(event.target.value);
                            }}
                        />

                        {error && <p>{error}</p>}
                    </div>

                    <div className={styles.drawerActions}>
                        <Button
                            disabled={saving}
                            onClick={onClose}
                        >
                            Hủy
                        </Button>

                        <Button
                            htmlType="submit"
                            type="primary"
                            loading={saving}
                        >
                            Lưu thông tin
                        </Button>
                    </div>
                </form>
            )}
        </Drawer>
    );
}

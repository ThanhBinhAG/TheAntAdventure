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
import { useLanguage } from '@/hooks/useLanguage';
import { tac } from '@/lib/i18n/pages/access-control';
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
    const { language } = useLanguage();
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
            setError(tac('displayNameRequired', language));
            return;
        }

        if (!user) return;

        setError(null);
        await onSave(user.user_id, normalizedName);
    }

    return (
        <Drawer
            title={tac('editUserInfo', language)}
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
                        <span>{tac('email', language)}</span>
                        <strong>{user.email ?? tac('noEmail', language)}</strong>
                    </div>

                    <div className={styles.drawerField}>
                        <label htmlFor="user-display-name">
                            {tac('displayName', language)}
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
                            {tac('cancel', language)}
                        </Button>

                        <Button
                            htmlType="submit"
                            type="primary"
                            loading={saving}
                        >
                            {tac('saveUserInfo', language)}
                        </Button>
                    </div>
                </form>
            )}
        </Drawer>
    );
}

'use client';

/**
 * Drawer đổi mật khẩu của user trong Access Control.
 *
 * Chức năng:
 * - Hiển thị thông tin email/tên người dùng chỉ đọc.
 * - Cho phép nhập mật khẩu mới và xác nhận mật khẩu mới.
 * - Kiểm tra độ dài tối thiểu (>= 8 ký tự) và khớp xác nhận mật khẩu trước khi submit.
 * - Gọi onSave để component cha thực hiện cập nhật qua API.
 */

import { useState, type FormEvent } from 'react';
import { Button, Drawer, Input } from 'antd';
import type { AccessControlUser } from './access-control-api';
import { useLanguage } from '@/hooks/useLanguage';
import { useConfirmClose } from '@/hooks/useConfirmClose';
import { tac } from '@/lib/i18n/pages/access-control';
import styles from './AccessControlPage.module.css';

type UserPasswordDrawerProps = {
    user: AccessControlUser | null;
    saving: boolean;
    onClose: () => void;
    onSave: (userId: string, newPassword: string) => Promise<void>;
};

export default function UserPasswordDrawer({
    user,
    saving,
    onClose,
    onSave,
}: UserPasswordDrawerProps) {
    const { language } = useLanguage();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const dirty = Boolean(password || confirmPassword);
    const finishClose = () => {
        setPassword('');
        setConfirmPassword('');
        setError(null);
        onClose();
    };
    const { requestClose } = useConfirmClose({
        open: Boolean(user),
        dirty,
        onClose: finishClose,
        disabled: saving,
        language,
    });

    function handleClose() {
        void requestClose();
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!user) return;

        if (password.length < 8) {
            setError(tac('passwordMinLength', language));
            return;
        }

        if (password !== confirmPassword) {
            setError(tac('passwordMismatch', language));
            return;
        }

        setError(null);
        await onSave(user.user_id, password);
        setPassword('');
        setConfirmPassword('');
    }

    return (
        <Drawer
            title={tac('changePasswordUser', language)}
            open={Boolean(user)}
            size={480}
            onClose={handleClose}
            destroyOnHidden
        >
            {user && (
                <form
                    className={styles.userEditForm}
                    onSubmit={(event) => {
                        void handleSubmit(event);
                    }}
                >
                    <p className={styles.description}>
                        {tac('changePasswordHint', language)}
                    </p>

                    <div className={styles.drawerReadOnlyField}>
                        <span>{tac('user', language)}</span>
                        <strong>
                            {user.display_name ?? user.email ?? tac('unnamedUser', language)}
                        </strong>
                        {user.email && user.display_name && (
                            <span className={styles.userEmail}>{user.email}</span>
                        )}
                    </div>

                    <div className={styles.drawerField}>
                        <label htmlFor="change-user-password">
                            {tac('newPassword', language)}
                        </label>
                        <Input.Password
                            id="change-user-password"
                            autoComplete="new-password"
                            value={password}
                            disabled={saving}
                            placeholder={tac('passwordMinimumHint', language)}
                            status={error ? 'error' : undefined}
                            onChange={(event) => {
                                setPassword(event.target.value);
                                if (error) setError(null);
                            }}
                        />
                    </div>

                    <div className={styles.drawerField}>
                        <label htmlFor="change-user-confirm-password">
                            {tac('confirmNewPassword', language)}
                        </label>
                        <Input.Password
                            id="change-user-confirm-password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            disabled={saving}
                            placeholder={tac('passwordMinimumHint', language)}
                            status={error ? 'error' : undefined}
                            onChange={(event) => {
                                setConfirmPassword(event.target.value);
                                if (error) setError(null);
                            }}
                        />
                        {error && <p>{error}</p>}
                    </div>

                    <div className={styles.drawerActions}>
                        <Button disabled={saving} onClick={handleClose}>
                            {tac('cancel', language)}
                        </Button>

                        <Button htmlType="submit" type="primary" loading={saving}>
                            {tac('changePassword', language)}
                        </Button>
                    </div>
                </form>
            )}
        </Drawer>
    );
}

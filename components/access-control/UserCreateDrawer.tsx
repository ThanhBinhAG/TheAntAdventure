'use client';

/**
 * Drawer tạo tài khoản người dùng mới trong Access Control.
 *
 * Chức năng:
 * - Nhận email, tên hiển thị, mật khẩu ban đầu và role.
 * - Kiểm tra nhanh dữ liệu trên giao diện để phản hồi dễ hiểu.
 * - Gọi onCreate; component cha mới là nơi gọi API và tải lại danh sách.
 *
 * Lưu ý:
 * - Mật khẩu chỉ tồn tại tạm thời trong state của Drawer này.
 * - Không hiển thị hoặc lưu lại mật khẩu sau khi tạo thành công.
 */

import {
    useState,
    type FormEvent,
} from 'react';
import {
    Alert,
    Button,
    Drawer,
    Input,
    Select,
} from 'antd';
import type {
    AccessControlAssignableRole,
    CreateAccessControlUserInput,
    ManagedRoleCode,
} from './access-control-api';
import { useLanguage } from '@/hooks/useLanguage';
import { useConfirmClose } from '@/hooks/useConfirmClose';
import { tac } from '@/lib/i18n/pages/access-control';
import styles from './AccessControlPage.module.css';

type UserCreateDrawerProps = {
    open: boolean;
    roles: AccessControlAssignableRole[];
    saving: boolean;
    onClose: () => void;
    onCreate: (
        input: CreateAccessControlUserInput,
    ) => Promise<void>;
};

/** Drawer form tạo user; chỉ hiển thị khi người quản trị bấm nút Thêm user. */
export default function UserCreateDrawer({
    open,
    roles,
    saving,
    onClose,
    onCreate,
}: UserCreateDrawerProps) {
    const { language } = useLanguage();
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    // null nghĩa là ưu tiên Employee, nếu không có thì chọn role khả dụng đầu tiên.
    const [roleCode, setRoleCode] =
        useState<ManagedRoleCode | null>(null);
    const [error, setError] = useState<string | null>(null);

    const defaultRoleCode =
        roles.find((role) => role.role_code === 'employee')?.role_code ??
        roles[0]?.role_code ??
        null;
    const selectedRoleCode = roleCode ?? defaultRoleCode;

    const dirty = Boolean(
        email.trim() ||
            displayName.trim() ||
            password ||
            confirmPassword ||
            roleCode,
    );
    const finishClose = () => {
        resetForm();
        onClose();
    };
    const { requestClose } = useConfirmClose({
        open,
        dirty,
        onClose: finishClose,
        disabled: saving,
        language,
    });

    /** Đưa form về trạng thái ban đầu, đồng thời xóa mật khẩu khỏi bộ nhớ UI. */
    function resetForm() {
        setEmail('');
        setDisplayName('');
        setPassword('');
        setConfirmPassword('');
        setRoleCode(null);
        setError(null);
    }

    /** Đóng Drawer an toàn, không cho đóng trong lúc request đang chạy. */
    function handleClose() {
        void requestClose();
    }

    /** Kiểm tra form trước khi chuyển dữ liệu tạo tài khoản cho component cha. */
    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedName = displayName.trim();

        if (!normalizedEmail.includes('@')) {
            setError(tac('invalidEmail', language));
            return;
        }

        if (!normalizedName) {
            setError(tac('displayNameRequired', language));
            return;
        }

        if (password.length < 8) {
            setError(tac('passwordMinLength', language));
            return;
        }

        if (password !== confirmPassword) {
            setError(tac('passwordMismatch', language));
            return;
        }

        if (
            !selectedRoleCode ||
            !roles.some((role) => role.role_code === selectedRoleCode)
        ) {
            setError(tac('validRoleRequired', language));
            return;
        }

        setError(null);

        try {
            await onCreate({
                email: normalizedEmail,
                password,
                displayName: normalizedName,
                roleCode: selectedRoleCode,
            });

            // Chỉ reset sau thành công để khi lỗi server user không phải nhập lại.
            resetForm();
        } catch {
            // Component cha đã hiển thị toast lỗi chi tiết từ API.
        }
    }

    return (
        <Drawer
            title={tac('addNewUser', language)}
            open={open}
            size={480}
            destroyOnHidden
            keyboard={!saving}
            maskClosable={!saving}
            onClose={handleClose}
        >
            <form
                className={styles.userCreateForm}
                onSubmit={(event) => {
                    void handleSubmit(event);
                }}
            >
                <p className={styles.createUserHint}>
                    {tac('createUserHint', language)}
                </p>

                {error && (
                    <Alert
                        showIcon
                        type="error"
                        title={error}
                    />
                )}

                <div className={styles.drawerField}>
                    <label htmlFor="new-user-email">Email</label>
                    <Input
                        id="new-user-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        disabled={saving}
                        maxLength={255}
                        placeholder={tac('emailExample', language)}
                        onChange={(event) => {
                            setEmail(event.target.value);
                        }}
                    />
                </div>

                <div className={styles.drawerField}>
                    <label htmlFor="new-user-display-name">
                        {tac('displayName', language)}
                    </label>
                    <Input
                        id="new-user-display-name"
                        autoComplete="name"
                        value={displayName}
                        disabled={saving}
                        maxLength={100}
                        placeholder="Nguyễn Văn A"
                        onChange={(event) => {
                            setDisplayName(event.target.value);
                        }}
                    />
                </div>

                <div className={styles.drawerField}>
                    <label htmlFor="new-user-role">
                        {tac('initialRole', language)}
                    </label>
                    <Select<ManagedRoleCode>
                        id="new-user-role"
                        value={selectedRoleCode ?? undefined}
                        disabled={saving}
                        options={roles.map((role) => ({
                            value: role.role_code,
                            label: role.role_label,
                        }))}
                        onChange={setRoleCode}
                    />
                </div>

                <div className={styles.drawerField}>
                    <label htmlFor="new-user-password">
                        {tac('initialPassword', language)}
                    </label>
                    <Input.Password
                        id="new-user-password"
                        autoComplete="new-password"
                        value={password}
                        disabled={saving}
                        maxLength={72}
                        placeholder={tac('passwordMinimumHint', language)}
                        onChange={(event) => {
                            setPassword(event.target.value);
                        }}
                    />
                </div>

                <div className={styles.drawerField}>
                    <label htmlFor="new-user-confirm-password">
                        {tac('confirmPassword', language)}
                    </label>
                    <Input.Password
                        id="new-user-confirm-password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        disabled={saving}
                        maxLength={72}
                        onChange={(event) => {
                            setConfirmPassword(event.target.value);
                        }}
                    />
                </div>

                <div className={styles.drawerActions}>
                    <Button
                        disabled={saving}
                        onClick={handleClose}
                    >
                        {tac('cancel', language)}
                    </Button>

                    <Button
                        htmlType="submit"
                        type="primary"
                        loading={saving}
                    >
                        {tac('addUser', language)}
                    </Button>
                </div>
            </form>
        </Drawer>
    );
}

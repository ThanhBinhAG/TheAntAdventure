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
        if (saving) return;

        resetForm();
        onClose();
    }

    /** Kiểm tra form trước khi chuyển dữ liệu tạo tài khoản cho component cha. */
    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedName = displayName.trim();

        if (!normalizedEmail.includes('@')) {
            setError('Vui lòng nhập email hợp lệ.');
            return;
        }

        if (!normalizedName) {
            setError('Tên hiển thị không được để trống.');
            return;
        }

        if (password.length < 8) {
            setError('Mật khẩu cần ít nhất 8 ký tự.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Xác nhận mật khẩu chưa khớp.');
            return;
        }

        if (
            !selectedRoleCode ||
            !roles.some((role) => role.role_code === selectedRoleCode)
        ) {
            setError('Vui lòng chọn role hợp lệ.');
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
            title="Thêm người dùng mới"
            open={open}
            width={480}
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
                    Tài khoản sẽ được kích hoạt ngay và người dùng có thể
                    đăng nhập bằng email cùng mật khẩu ban đầu này.
                </p>

                {error && (
                    <Alert
                        showIcon
                        type="error"
                        message={error}
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
                        placeholder="nhanvien@company.com"
                        onChange={(event) => {
                            setEmail(event.target.value);
                        }}
                    />
                </div>

                <div className={styles.drawerField}>
                    <label htmlFor="new-user-display-name">
                        Tên hiển thị
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
                    <label htmlFor="new-user-role">Role ban đầu</label>
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
                        Mật khẩu ban đầu
                    </label>
                    <Input.Password
                        id="new-user-password"
                        autoComplete="new-password"
                        value={password}
                        disabled={saving}
                        maxLength={72}
                        placeholder="Ít nhất 8 ký tự"
                        onChange={(event) => {
                            setPassword(event.target.value);
                        }}
                    />
                </div>

                <div className={styles.drawerField}>
                    <label htmlFor="new-user-confirm-password">
                        Xác nhận mật khẩu
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
                        Hủy
                    </Button>

                    <Button
                        htmlType="submit"
                        type="primary"
                        loading={saving}
                    >
                        Tạo tài khoản
                    </Button>
                </div>
            </form>
        </Drawer>
    );
}

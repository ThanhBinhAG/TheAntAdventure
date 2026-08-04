'use client';

/**
 * Drawer sửa hoặc vô hiệu hóa một role nhân viên động.
 * Code role chỉ để đọc vì đang được user_roles và role_permissions sử dụng.
 */

import {
    Button,
    Drawer,
    Form,
    Input,
    Switch,
} from 'antd';
import type {
    AccessControlStaffRole,
} from './access-control-api';
import styles from './AccessControlPage.module.css';

type StaffRoleEditDrawerProps = {
    role: AccessControlStaffRole | null;
    saving: boolean;
    onClose: () => void;
    onSubmit: (input: {
        code: string;
        label: string;
        description?: string;
        sortOrder: number;
        isActive: boolean;
    }) => Promise<void>;
};

export default function StaffRoleEditDrawer({
    role,
    saving,
    onClose,
    onSubmit,
}: StaffRoleEditDrawerProps) {
    const [form] = Form.useForm();

    async function handleFinish(values: {
        label: string;
        description?: string;
        isActive: boolean;
    }) {
        if (!role) return;

        await onSubmit({
            code: role.role_code,
            label: values.label.trim(),
            description: values.description?.trim(),
            // Không còn cho chỉnh thứ tự trên UI, nên giữ nguyên dữ liệu cũ.
            sortOrder: role.sort_order,
            isActive: values.isActive,
        });
    }

    return (
        <Drawer
            title="Sửa role nhân viên"
            open={Boolean(role)}
            width={480}
            destroyOnHidden
            onClose={onClose}
            afterOpenChange={(visible) => {
                if (visible && role) {
                    form.setFieldsValue({
                        label: role.role_label,
                        description: role.role_description ?? '',
                        isActive: role.is_active,
                    });
                }
            }}
        >
            <Form form={form} layout="vertical" onFinish={(values) => void handleFinish(values)}>
                <Form.Item label="Mã role">
                    <Input value={role?.role_code} disabled />
                </Form.Item>
                <Form.Item label="Tên role" name="label" rules={[{ required: true, message: 'Vui lòng nhập tên role.' }]}>
                    <Input />
                </Form.Item>
                <Form.Item label="Mô tả" name="description">
                    <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item label="Đang sử dụng" name="isActive" valuePropName="checked">
                    <Switch checkedChildren="Có" unCheckedChildren="Không" />
                </Form.Item>
                <div className={styles.drawerActions}>
                    <Button onClick={onClose} disabled={saving}>Hủy</Button>
                    <Button type="primary" htmlType="submit" loading={saving}>Lưu thay đổi</Button>
                </div>
            </Form>
        </Drawer>
    );
}

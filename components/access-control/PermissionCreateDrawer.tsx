'use client';

/**
 * Drawer quản lý catalog permission và nhóm permission.
 *
 * Chỉ Super Admin mới mở được từ UI, nhưng quyền thực tế vẫn được Supabase RPC
 * kiểm tra lại. Không tin cậy điều kiện hiển thị ở trình duyệt.
 */

import {
    AutoComplete,
    Button,
    Drawer,
    Form,
    Input,
    InputNumber,
} from 'antd';
import type {
    CreateAccessControlPermissionInput,
} from './access-control-api';
import styles from './AccessControlPage.module.css';

type PermissionGroupOption = {
    code: string;
    label: string;
    sortOrder: number;
};

type PermissionCreateDrawerProps = {
    open: boolean;
    saving: boolean;
    groups: PermissionGroupOption[];
    onClose: () => void;
    onSubmit: (
        input: CreateAccessControlPermissionInput,
    ) => Promise<void>;
};

export default function PermissionCreateDrawer({
    open,
    saving,
    groups,
    onClose,
    onSubmit,
}: PermissionCreateDrawerProps) {
    const [form] = Form.useForm<CreateAccessControlPermissionInput>();

    async function handleFinish(
        values: CreateAccessControlPermissionInput,
    ) {
        await onSubmit({
            ...values,
            code: values.code.trim(),
            description: values.description.trim(),
            groupCode: values.groupCode.trim(),
            groupLabel: values.groupLabel.trim(),
        });
    }

    return (
        <Drawer
            title="Thêm quyền / nhóm quyền"
            open={open}
            width={480}
            destroyOnHidden
            onClose={onClose}
            afterOpenChange={(visible) => {
                // Chỉ xóa form sau khi đóng để dữ liệu vẫn còn nếu API báo lỗi.
                if (!visible) form.resetFields();
            }}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={(values) => void handleFinish(values)}
            >
                <Form.Item
                    label="Mã nhóm chức năng"
                    name="groupCode"
                    extra="Chọn nhóm cũ hoặc nhập mã mới, ví dụ: reports."
                    rules={[
                        {
                            required: true,
                            message: 'Vui lòng nhập mã nhóm.',
                        },
                        {
                            pattern: /^[a-z][a-z0-9_]{1,49}$/,
                            message: 'Chỉ dùng chữ thường, số và dấu gạch dưới.',
                        },
                    ]}
                >
                    <AutoComplete
                        options={groups.map((group) => ({
                            value: group.code,
                            label: `${group.label}`,
                        }))}
                        onSelect={(groupCode) => {
                            const group = groups.find(
                                (item) => item.code === groupCode,
                            );

                            // Giảm nhập tay sai tên khi dùng nhóm đã tồn tại.
                            if (group) {
                                form.setFieldValue(
                                    'groupLabel',
                                    group.label,
                                );
                            }
                        }}
                    >
                        <Input placeholder="reports" />
                    </AutoComplete>
                </Form.Item>

                <Form.Item
                    label="Tên nhóm chức năng"
                    name="groupLabel"
                    extra="Bắt buộc khi đây là nhóm mới."
                    rules={[
                        {
                            required: true,
                            message: 'Vui lòng nhập tên nhóm.',
                        },
                    ]}
                >
                    <Input placeholder="Báo cáo" />
                </Form.Item>

                <Form.Item
                    label="Thứ tự nhóm"
                    name="groupSortOrder"
                    extra="Có thể để trống; nhóm mới sẽ được đặt cuối danh sách."
                >
                    <InputNumber min={0} max={10_000} precision={0} />
                </Form.Item>

                <Form.Item
                    label="Mã quyền"
                    name="code"
                    extra="Mã kỹ thuật ổn định, ví dụ: reports.read."
                    rules={[
                        {
                            required: true,
                            message: 'Vui lòng nhập mã quyền.',
                        },
                        {
                            pattern:
                                /^[a-z][a-z0-9_]{1,49}\.[a-z][a-z0-9_]{1,49}$/,
                            message:
                                'Mã phải theo dạng module.action.',
                        },
                    ]}
                >
                    <Input placeholder="reports.read" />
                </Form.Item>

                <Form.Item
                    label="Tên chức năng"
                    name="description"
                    rules={[
                        {
                            required: true,
                            message: 'Vui lòng nhập tên chức năng.',
                        },
                    ]}
                >
                    <Input placeholder="Xem báo cáo" />
                </Form.Item>

                <div className={styles.drawerActions}>
                    <Button onClick={onClose} disabled={saving}>
                        Hủy
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={saving}
                    >
                        Tạo quyền
                    </Button>
                </div>
            </Form>
        </Drawer>
    );
}

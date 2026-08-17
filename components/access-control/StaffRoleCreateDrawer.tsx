'use client';

/**
 * Drawer tạo role nhân viên động.
 *
 * Mã role được gợi ý từ tên hiển thị, nhưng người quản trị vẫn có thể sửa
 * trước khi tạo. Mã này là khóa kỹ thuật nên không đổi sau khi đã lưu.
 */

import {
    Button,
    Drawer,
    Form,
    Input,
} from 'antd';
import { useLanguage } from '@/hooks/useLanguage';
import { tac } from '@/lib/i18n/pages/access-control';
import {
    getAccessControlErrorMessage,
    type CreateAccessControlStaffRoleInput,
} from './access-control-api';
import styles from './AccessControlPage.module.css';

type StaffRoleCreateDrawerProps = {
    open: boolean;
    saving: boolean;
    onClose: () => void;
    onSubmit: (
        input: CreateAccessControlStaffRoleInput,
    ) => Promise<void>;
};

/** Đổi tên tiếng Việt thành mã role an toàn cho database. */
function toRoleCode(label: string): string {
    return label
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/gi, 'd')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 50);
}

export default function StaffRoleCreateDrawer({
    open,
    saving,
    onClose,
    onSubmit,
}: StaffRoleCreateDrawerProps) {
    const { language } = useLanguage();
    const [form] = Form.useForm<CreateAccessControlStaffRoleInput>();

    async function handleFinish(
        values: CreateAccessControlStaffRoleInput,
    ) {
        try {
            await onSubmit({
                ...values,
                code: values.code.trim(),
                label: values.label.trim(),
                description: values.description?.trim(),
            });
        } catch (error) {
            /**
             * Giữ Drawer mở và hiển thị lỗi tại đúng trường người dùng cần sửa.
             * Ví dụ API trả 409 khi mã role đã tồn tại.
             */
            form.setFields([
                {
                    name: 'code',
                    errors: [
                        getAccessControlErrorMessage(
                            error,
                            language,
                            'createRoleFailedRetry',
                        ),
                    ],
                },
            ]);
        }
    }

    return (
        <Drawer
            title={tac('createStaffRole', language)}
            open={open}
            size={480}
            destroyOnHidden
            onClose={onClose}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={(values) => void handleFinish(values)}
            >
                <Form.Item
                    label={tac('roleName', language)}
                    name="label"
                    rules={[{
                        required: true,
                        message: tac('roleNameRequired', language),
                    }]}
                >
                    <Input
                        autoFocus
                        placeholder={tac('exampleStaffSales', language)}
                        onChange={(event) => {
                            form.setFieldValue(
                                'code',
                                toRoleCode(event.target.value),
                            );
                            form.setFields([
                                { name: 'code', errors: [] },
                            ]);
                        }}
                    />
                </Form.Item>

                <Form.Item
                    label={tac('roleCode', language)}
                    name="code"
                    extra={tac('roleCodeHint', language)}
                    rules={[
                        {
                            required: true,
                            message: tac('roleCodeRequired', language),
                        },
                        {
                            pattern: /^[a-z0-9_]{2,50}$/,
                            message: tac('lowercaseCodeRule', language),
                        },
                    ]}
                >
                    <Input
                        placeholder="sales"
                        onChange={() => {
                            // Người dùng đã sửa mã, nên bỏ lỗi trùng cũ.
                            form.setFields([
                                { name: 'code', errors: [] },
                            ]);
                        }}
                    />
                </Form.Item>

                <Form.Item label={tac('description', language)} name="description">
                    <Input.TextArea rows={3} />
                </Form.Item>

                <div className={styles.drawerActions}>
                    <Button onClick={onClose} disabled={saving}>
                        {tac('cancel', language)}
                    </Button>
                    <Button type="primary" htmlType="submit" loading={saving}>
                        {tac('createRole', language)}
                    </Button>
                </div>
            </Form>
        </Drawer>
    );
}

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
} from 'antd';
import { useLanguage } from '@/hooks/useLanguage';
import { useConfirmClose } from '@/hooks/useConfirmClose';
import { tac } from '@/lib/i18n/pages/access-control';
import type {
    CreateAccessControlPermissionInput,
} from './access-control-api';
import styles from './AccessControlPage.module.css';

type PermissionGroupOption = {
    code: string;
    label: string;
    /** Nhãn gốc database, dùng khi gửi API để không ghi đè bản dịch hiển thị. */
    databaseLabel: string;
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
    const { language } = useLanguage();
    const [form] = Form.useForm<CreateAccessControlPermissionInput>();
    const groupCode = Form.useWatch('groupCode', form);
    const groupLabel = Form.useWatch('groupLabel', form);
    const code = Form.useWatch('code', form);
    const description = Form.useWatch('description', form);
    const dirty = open && Boolean(groupCode || groupLabel || code || description);
    const { requestClose } = useConfirmClose({
        open,
        dirty,
        onClose: () => {
            form.resetFields();
            onClose();
        },
        disabled: saving,
        language,
    });

    async function handleFinish(
        values: CreateAccessControlPermissionInput,
    ) {
        const groupCode = values.groupCode.trim();
        const existingGroup = groups.find((group) => group.code === groupCode);

        await onSubmit({
            ...values,
            code: values.code.trim(),
            description: values.description.trim(),
            groupCode,

            // Với nhóm có sẵn, giữ nguyên label trong database. Nhờ vậy việc
            // xem UI tiếng Anh không vô tình đổi dữ liệu nhóm sang tiếng Anh.
            groupLabel: existingGroup?.databaseLabel ?? values.groupLabel.trim(),
        });
    }

    return (
        <Drawer
            title={tac('createPermissionOrGroup', language)}
            open={open}
            size={480}
            destroyOnHidden
            onClose={() => void requestClose()}
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
                    label={tac('groupCode', language)}
                    name="groupCode"
                    extra={tac('groupCodeHint', language)}
                    rules={[
                        {
                            required: true,
                            message: tac('groupCodeRequired', language),
                        },
                        {
                            pattern: /^[a-z][a-z0-9_]{1,49}$/,
                            message: tac('lowercaseCodeRule', language),
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
                                form.setFieldValue('groupLabel', group.label);
                            }
                        }}
                    >
                        <Input placeholder="reports" />
                    </AutoComplete>
                </Form.Item>

                <Form.Item
                    label={tac('groupLabel', language)}
                    name="groupLabel"
                    extra={tac('groupLabelHint', language)}
                    rules={[
                        {
                            required: true,
                            message: tac('groupLabelRequired', language),
                        },
                    ]}
                >
                    <Input placeholder={tac('exampleReports', language)} />
                </Form.Item>

                <Form.Item
                    label={tac('permissionCode', language)}
                    name="code"
                    extra={tac('permissionCodeHint', language)}
                    rules={[
                        {
                            required: true,
                            message: tac('permissionCodeRequired', language),
                        },
                        {
                            pattern:
                                /^[a-z][a-z0-9_]{1,49}\.[a-z][a-z0-9_]{1,49}$/,
                            message: tac('permissionCodeRule', language),
                        },
                    ]}
                >
                    <Input placeholder="reports.read" />
                </Form.Item>

                <Form.Item
                    label={tac('permissionName', language)}
                    name="description"
                    rules={[
                        {
                            required: true,
                            message: tac('permissionNameRequired', language),
                        },
                    ]}
                >
                    <Input placeholder={tac('exampleViewReports', language)} />
                </Form.Item>

                <div className={styles.drawerActions}>
                    <Button onClick={() => void requestClose()} disabled={saving}>
                        {tac('cancel', language)}
                    </Button>
                    <Button
                        type="primary"
                        htmlType="submit"
                        loading={saving}
                    >
                        {tac('createPermission', language)}
                    </Button>
                </div>
            </Form>
        </Drawer>
    );
}

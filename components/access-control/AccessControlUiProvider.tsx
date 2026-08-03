'use client';

/**
 * Provider giao diện cho trang Quản lý người dùng & phân quyền.
 *
 * Chức năng:
 * - Cấu hình Ant Design dùng màu xanh, font và bo góc giống CRM.
 * - Chỉ áp dụng theme cho các component nằm bên trong Provider này.
 * - Không làm thay đổi giao diện các trang CRM cũ.
 */

import type { ReactNode } from 'react';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

type AccessControlUiProviderProps = {
    children: ReactNode;
};

export default function AccessControlUiProvider({
    children,
}: AccessControlUiProviderProps) {
    return (
        <ConfigProvider
            locale={viVN}
            theme={{
                token: {
                    // Màu thương hiệu CRM hiện tại.
                    colorPrimary: '#2E7D52',
                    colorInfo: '#2E7D52',
                    colorSuccess: '#2E7D52',
                    colorWarning: '#D97706',
                    colorError: '#C0392B',

                    // Màu nền và chữ theo globals.css.
                    colorBgLayout: '#F7F8F6',
                    colorBgContainer: '#FFFFFF',
                    colorText: '#1A2E23',
                    colorTextSecondary: '#6B7F74',
                    colorBorder: '#E2E8E4',

                    // Dùng font có sẵn của CRM.
                    fontFamily:
                        'var(--font-dm-sans), "DM Sans", system-ui, sans-serif',

                    borderRadius: 8,
                    controlHeight: 34,
                },

                components: {
                    Table: {
                        headerBg: '#F7F8F6',
                        headerColor: '#6B7F74',
                        rowHoverBg: '#FAFBF9',
                    },
                    Tabs: {
                        itemSelectedColor: '#2E7D52',
                        inkBarColor: '#2E7D52',
                    },
                    Button: {
                        primaryShadow: 'none',
                    },
                },
            }}
        >
            {children}
        </ConfigProvider>
    );
}
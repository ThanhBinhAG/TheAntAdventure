'use client';

import {
    useCallback,
    useMemo,
    useState,
} from 'react';
import useSWR from 'swr';
import {
    Alert,
    Button,
    Empty,
    Input,
    Select,
    Table,
    Tag,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
    fetchAuthLoginEvents,
    type AuthLoginEvent,
} from './access-control-api';
import styles from './AccessControlPage.module.css';

const LOGIN_HISTORY_KEY = 'access-control/login-history';

type DeviceType =
    | 'desktop'
    | 'mobile'
    | 'tablet'
    | 'unknown';

type FilterForm = {
    userQuery: string;
    ipAddress: string;
    deviceType?: DeviceType;
    from: string;
    to: string;
};

type AppliedFilters = {
    userQuery?: string;
    ipAddress?: string;
    deviceType?: DeviceType;
    from?: string;
    to?: string;
};

const EMPTY_FILTERS: FilterForm = {
    userQuery: '',
    ipAddress: '',
    deviceType: undefined,
    from: '',
    to: '',
};

function formatDateTime(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'short',
        timeStyle: 'medium',
    }).format(date);
}

function getUserName(event: AuthLoginEvent): string {
    if (event.authMethod === 'break_glass') {
        return 'Truy cập khẩn cấp';
    }

    return (
        event.userDisplayName ??
        event.userEmail ??
        'Người dùng đã bị xoá'
    );
}

/** Đổi giá trị datetime-local sang ISO để API/RPC so sánh đúng múi giờ. */
function toIsoOrUndefined(value: string): string | undefined {
    if (!value) return undefined;

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? undefined
        : date.toISOString();
}

export default function LoginHistoryTab() {
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [filterForm, setFilterForm] =
        useState<FilterForm>(EMPTY_FILTERS);
    const [appliedFilters, setAppliedFilters] =
        useState<AppliedFilters>({});
    const [filterError, setFilterError] =
        useState<string | null>(null);

    const loginHistoryQueryKey = useMemo(
        () => [
            LOGIN_HISTORY_KEY,
            page,
            pageSize,
            appliedFilters,
        ],
        [page, pageSize, appliedFilters],
    );

    const {
        data,
        error,
        isLoading,
        mutate: reloadEvents,
    } = useSWR(
        loginHistoryQueryKey,
        () => fetchAuthLoginEvents({
            page,
            pageSize,
            ...appliedFilters,
        }),
        {
            dedupingInterval: 30_000,
            keepPreviousData: true,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
        },
    );

    const refreshEvents = useCallback(async (): Promise<void> => {
        await reloadEvents();
    }, [reloadEvents]);

    const applyFilters = () => {
        const from = toIsoOrUndefined(filterForm.from);
        const to = toIsoOrUndefined(filterForm.to);

        if (from && to && from > to) {
            setFilterError(
                'Thời gian bắt đầu phải trước thời gian kết thúc.',
            );
            return;
        }

        setFilterError(null);
        setPage(1);
        setAppliedFilters({
            userQuery: filterForm.userQuery.trim() || undefined,
            ipAddress: filterForm.ipAddress.trim() || undefined,
            deviceType: filterForm.deviceType,
            from,
            to,
        });
    };

    const clearFilters = () => {
        setFilterForm(EMPTY_FILTERS);
        setAppliedFilters({});
        setFilterError(null);
        setPage(1);
    };

    const errorMessage =
        error instanceof Error
            ? error.message
            : error
                ? 'Không thể tải lịch sử đăng nhập.'
                : null;

    const columns: TableColumnsType<AuthLoginEvent> = [
        {
            title: 'Thời gian',
            dataIndex: 'createdAt',
            width: 170,
            render: (value: string) => formatDateTime(value),
        },
        {
            title: 'Người dùng',
            key: 'user',
            render: (_value: unknown, event) => (
                <div>
                    <strong>{getUserName(event)}</strong>

                    {event.userDisplayName && event.userEmail && (
                        <div className={styles.userEmail}>
                            {event.userEmail}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: 'Thiết bị',
            key: 'device',
            render: (_value: unknown, event) => (
                `${event.browserName} • ${event.operatingSystem}`
            ),
        },
        {
            title: 'IP',
            dataIndex: 'ipAddress',
            width: 150,
            render: (value: string | null) => (
                value ?? 'Không xác định'
            ),
        },
        {
            title: 'Phương thức',
            dataIndex: 'authMethod',
            width: 140,
            render: (value: AuthLoginEvent['authMethod']) => (
                <Tag color={value === 'break_glass' ? 'orange' : 'green'}>
                    {value === 'break_glass'
                        ? 'Khẩn cấp'
                        : 'Mật khẩu'}
                </Tag>
            ),
        },
    ];

    return (
        <div className={styles.auditTab}>
            <header className={styles.auditHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>
                        Lịch sử đăng nhập
                    </h2>
                    <p className={styles.sectionDescription}>
                        Theo dõi lần đăng nhập thành công và thông tin
                        thiết bị của người dùng.
                    </p>
                </div>

                <Button onClick={() => void refreshEvents()}>
                    Tải lại
                </Button>
            </header>

            <div className={styles.loginHistoryFilters}>
                <Input
                    allowClear
                    aria-label="Tìm người dùng theo tên hoặc email"
                    placeholder="Tên hoặc email người dùng"
                    value={filterForm.userQuery}
                    onChange={(event) => {
                        setFilterForm((current) => ({
                            ...current,
                            userQuery: event.target.value,
                        }));
                    }}
                    onPressEnter={applyFilters}
                />

                <Input
                    allowClear
                    aria-label="Lọc theo địa chỉ IP"
                    placeholder="Địa chỉ IP"
                    value={filterForm.ipAddress}
                    onChange={(event) => {
                        setFilterForm((current) => ({
                            ...current,
                            ipAddress: event.target.value,
                        }));
                    }}
                    onPressEnter={applyFilters}
                />

                <Select<DeviceType>
                    allowClear
                    aria-label="Lọc theo loại thiết bị"
                    placeholder="Tất cả thiết bị"
                    value={filterForm.deviceType}
                    options={[
                        { value: 'desktop', label: 'Máy tính' },
                        { value: 'mobile', label: 'Điện thoại' },
                        { value: 'tablet', label: 'Máy tính bảng' },
                        { value: 'unknown', label: 'Không xác định' },
                    ]}
                    onChange={(deviceType) => {
                        setFilterForm((current) => ({
                            ...current,
                            deviceType,
                        }));
                    }}
                />

                <div className={styles.loginHistoryDateRange}>
                    <Input
                        aria-label="Từ thời gian"
                        type="datetime-local"
                        value={filterForm.from}
                        onChange={(event) => {
                            setFilterForm((current) => ({
                                ...current,
                                from: event.target.value,
                            }));
                        }}
                    />

                    <Input
                        aria-label="Đến thời gian"
                        type="datetime-local"
                        value={filterForm.to}
                        onChange={(event) => {
                            setFilterForm((current) => ({
                                ...current,
                                to: event.target.value,
                            }));
                        }}
                    />
                </div>

                <div className={styles.loginHistoryFilterActions}>
                    <Button type="primary" onClick={applyFilters}>
                        Lọc
                    </Button>

                    <Button onClick={clearFilters}>
                        Xóa lọc
                    </Button>
                </div>
            </div>

            {filterError && (
                <Alert
                    type="warning"
                    showIcon
                    message={filterError}
                />
            )}

            {errorMessage ? (
                <Alert
                    type="error"
                    showIcon
                    message="Không thể tải lịch sử đăng nhập"
                    description={errorMessage}
                    action={
                        <Button
                            size="small"
                            onClick={() => void refreshEvents()}
                        >
                            Thử lại
                        </Button>
                    }
                />
            ) : (
                <Table<AuthLoginEvent>
                    rowKey="id"
                    columns={columns}
                    dataSource={data?.items ?? []}
                    loading={isLoading}
                    scroll={{ x: 760 }}
                    locale={{
                        emptyText: (
                            <Empty description="Không có lịch sử phù hợp." />
                        ),
                    }}
                    pagination={{
                        current: page,
                        pageSize,
                        total: data?.totalCount ?? 0,
                        showSizeChanger: false,
                        onChange: (nextPage, nextPageSize) => {
                            setPage(
                                nextPageSize === pageSize
                                    ? nextPage
                                    : 1,
                            );
                            setPageSize(nextPageSize);
                        },
                    }}
                />
            )}
        </div>
    );
}
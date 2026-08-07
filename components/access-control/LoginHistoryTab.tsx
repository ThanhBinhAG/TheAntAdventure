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
    getAccessControlErrorMessage,
    type AuthLoginEvent,
} from './access-control-api';
import { useLanguage } from '@/hooks/useLanguage';
import { tac } from '@/lib/i18n/pages/access-control';
import type { AppLanguage } from '@/lib/i18n/stages';
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

function formatDateTime(value: string, language: AppLanguage): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
        dateStyle: 'short',
        timeStyle: 'medium',
    }).format(date);
}

function getUserName(
    event: AuthLoginEvent,
    language: AppLanguage,
): string {
    if (event.authMethod === 'break_glass') {
        return tac('emergencyAccess', language);
    }

    return (
        event.userDisplayName ??
        event.userEmail ??
        tac('deletedUser', language)
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
    const { language } = useLanguage();
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
                tac('loginTimeRangeInvalid', language),
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
        error
            ? getAccessControlErrorMessage(
                error,
                language,
                'loadLoginHistoryFailed',
            )
            : null;

    const columns: TableColumnsType<AuthLoginEvent> = [
        {
            title: tac('time', language),
            dataIndex: 'createdAt',
            width: 170,
            render: (value: string) => formatDateTime(value, language),
        },
        {
            title: tac('user', language),
            key: 'user',
            render: (_value: unknown, event) => (
                <div>
                    <strong>{getUserName(event, language)}</strong>

                    {event.userDisplayName && event.userEmail && (
                        <div className={styles.userEmail}>
                            {event.userEmail}
                        </div>
                    )}
                </div>
            ),
        },
        {
            title: tac('device', language),
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
                value ?? tac('unknown', language)
            ),
        },
        {
            title: tac('authMethod', language),
            dataIndex: 'authMethod',
            width: 140,
            render: (value: AuthLoginEvent['authMethod']) => (
                <Tag color={value === 'break_glass' ? 'orange' : 'green'}>
                    {value === 'break_glass'
                        ? tac('emergencyAccess', language)
                        : tac('password', language)}
                </Tag>
            ),
        },
    ];

    return (
        <div className={styles.auditTab}>
            <header className={styles.auditHeader}>
                <div>
                    <h2 className={styles.sectionTitle}>
                        {tac('loginHistory', language)}
                    </h2>
                    <p className={styles.sectionDescription}>
                        {tac('loginHistoryDescription', language)}
                    </p>
                </div>

                <Button onClick={() => void refreshEvents()}>
                    {tac('refresh', language)}
                </Button>
            </header>

            <div className={styles.loginHistoryFilters}>
                <Input
                    allowClear
                    aria-label={tac('findUser', language)}
                    placeholder={tac('userNameOrEmail', language)}
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
                    aria-label={tac('filterIpAddress', language)}
                    placeholder={tac('ipAddress', language)}
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
                    aria-label={tac('filterDeviceType', language)}
                    placeholder={tac('allDevices', language)}
                    value={filterForm.deviceType}
                    options={[
                        { value: 'desktop', label: tac('desktop', language) },
                        { value: 'mobile', label: tac('mobile', language) },
                        { value: 'tablet', label: tac('tablet', language) },
                        { value: 'unknown', label: tac('unknown', language) },
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
                        aria-label={tac('fromTime', language)}
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
                        aria-label={tac('toTime', language)}
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
                        {tac('filter', language)}
                    </Button>

                    <Button onClick={clearFilters}>
                        {tac('clearFilters', language)}
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
                    message={tac('loadLoginHistoryFailed', language)}
                    description={errorMessage}
                    action={
                        <Button
                            size="small"
                            onClick={() => void refreshEvents()}
                        >
                            {tac('retry', language)}
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
                            <Empty description={tac('noMatchingLoginHistory', language)} />
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

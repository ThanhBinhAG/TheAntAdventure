'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  CustomerListFilters,
  CustomerListItem,
  CustomerPageResponse,
  CustomerPageSize,
} from '@/lib/customers/customer-list-input';

const SEARCH_DEBOUNCE_MS = 300;

type CustomerPageApiResponse = CustomerPageResponse & {
  ok: true;
};

/** Share GETs across React Strict Mode remounts instead of aborting and refetching. */
const customerGetInflight = new Map<
  string,
  Promise<{
    response: Response;
    body: unknown;
  }>
>();

function fetchCustomerJsonOnce(url: string) {
  const existing = customerGetInflight.get(url);
  if (existing) return existing;

  const request = fetch(url, { credentials: 'same-origin' })
    .then(async (response) => ({
      response,
      body: (await response.json()) as unknown,
    }))
    .finally(() => {
      customerGetInflight.delete(url);
    });

  customerGetInflight.set(url, request);
  return request;
}

export type UseCustomerPageInput = CustomerListFilters & {
  page: number;
  pageSize: CustomerPageSize;
};

function appendCustomerFilterParams(
  params: URLSearchParams,
  {
    q,
    source,
    country,
    salesperson,
    clientType,
    agentId,
    stage,
  }: CustomerListFilters,
) {
  if (q) params.set('q', q);
  if (source) params.set('source', source);
  if (country) params.set('country', country);
  if (salesperson) params.set('salesperson', salesperson);
  if (clientType) params.set('clientType', clientType);
  if (agentId) params.set('agentId', agentId);
  if (stage) params.set('stage', stage);
}

function isCustomerPageApiResponse(
  value: unknown,
): value is CustomerPageApiResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return body.ok === true && Array.isArray(body.items);
}

function getApiErrorMessage(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return 'Không thể tải danh sách khách hàng.';
  }
  const body = value as Record<string, unknown>;
  return typeof body.error === 'string'
    ? body.error
    : 'Không thể tải danh sách khách hàng.';
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function buildCustomerPageUrl({
  page,
  pageSize,
  q,
  source,
  country,
  salesperson,
  clientType,
  agentId,
  stage,
}: UseCustomerPageInput): string {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  appendCustomerFilterParams(params, {
    q,
    source,
    country,
    salesperson,
    clientType,
    agentId,
    stage,
  });

  return `/api/customers?${params.toString()}`;
}

export function useCustomerPage(input: UseCustomerPageInput) {
  const {
    page,
    pageSize,
    q,
    source,
    country,
    salesperson,
    clientType,
    agentId,
    stage,
  } = input;
  const qDebounced = useDebouncedValue(q, SEARCH_DEBOUNCE_MS);
  const [data, setData] = useState<CustomerPageApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  const refresh = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPage() {
      setIsLoading(true);
      setError(null);

      try {
        const { response, body } = await fetchCustomerJsonOnce(
          buildCustomerPageUrl({
            page,
            pageSize,
            q: qDebounced,
            source,
            country,
            salesperson,
            clientType,
            agentId,
            stage,
          }),
        );

        if (!response.ok || !isCustomerPageApiResponse(body)) {
          throw new Error(getApiErrorMessage(body));
        }

        if (active) {
          setData(body);
        }
      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Không thể tải danh sách khách hàng.',
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      active = false;
    };
  }, [
    page,
    pageSize,
    requestVersion,
    qDebounced,
    source,
    country,
    salesperson,
    clientType,
    agentId,
    stage,
  ]);

  return {
    data,
    items: (data?.items ?? []) as CustomerListItem[],
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    error,
    isLoading,
    retry,
    refresh,
  };
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  LeadListFilters,
  LeadListItem,
  LeadListScope,
  LeadPageResponse,
  LeadPageSize,
} from '@/lib/sales/lead-list-input';
import type {
  ListSortField,
  SalesTimeFilterState,
  SortDirection,
} from '@/lib/sales/sales-lead-utils';

const SEARCH_DEBOUNCE_MS = 300;

type LeadPageApiResponse = LeadPageResponse & {
  ok: true;
};

const leadGetInflight = new Map<
  string,
  Promise<{
    response: Response;
    body: unknown;
  }>
>();

export function fetchLeadJsonOnce(url: string) {
  const existing = leadGetInflight.get(url);
  if (existing) return existing;

  const request = fetch(url, { credentials: 'same-origin' })
    .then(async (response) => ({
      response,
      body: (await response.json()) as unknown,
    }))
    .finally(() => {
      leadGetInflight.delete(url);
    });

  leadGetInflight.set(url, request);
  return request;
}

export type UseSalesPageInput = LeadListFilters & {
  page: number;
  pageSize: LeadPageSize;
  scope: LeadListScope;
  timeFilter: SalesTimeFilterState;
  sortField: ListSortField;
  sortDirection: SortDirection;
  highlightLeadId?: string;
  includeLost?: boolean;
  enabled?: boolean;
};

function appendSalesFilterParams(
  params: URLSearchParams,
  input: Pick<
    UseSalesPageInput,
    | 'q'
    | 'custId'
    | 'stage'
    | 'timeFilter'
    | 'sortField'
    | 'sortDirection'
    | 'scope'
    | 'highlightLeadId'
    | 'includeLost'
  >,
) {
  if (input.q) params.set('q', input.q);
  if (input.custId) params.set('custId', input.custId);
  if (input.stage) params.set('stage', input.stage);
  params.set('timeMode', input.timeFilter.mode);
  if (input.timeFilter.travelMonth) {
    params.set('travelMonth', input.timeFilter.travelMonth);
  }
  if (input.timeFilter.followUpFrom) {
    params.set('followUpFrom', input.timeFilter.followUpFrom);
  }
  if (input.timeFilter.followUpTo) {
    params.set('followUpTo', input.timeFilter.followUpTo);
  }
  params.set('sortField', input.sortField);
  params.set('sortDirection', input.sortDirection);
  params.set('scope', input.scope);
  if (input.includeLost) params.set('includeLost', 'true');
  if (input.highlightLeadId) params.set('highlightLeadId', input.highlightLeadId);
}

function isLeadPageApiResponse(value: unknown): value is LeadPageApiResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return body.ok === true && Array.isArray(body.items);
}

function getApiErrorMessage(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return 'Không thể tải Sales Pipeline.';
  }
  const body = value as Record<string, unknown>;
  return typeof body.error === 'string'
    ? body.error
    : 'Không thể tải Sales Pipeline.';
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function buildSalesPageUrl(input: UseSalesPageInput): string {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  appendSalesFilterParams(params, input);
  return `/api/leads?${params.toString()}`;
}

export function useSalesPage(input: UseSalesPageInput) {
  const {
    page,
    pageSize,
    q,
    custId,
    stage,
    timeFilter,
    sortField,
    sortDirection,
    scope,
    highlightLeadId,
    includeLost,
    enabled = true,
  } = input;

  const qDebounced = useDebouncedValue(q, SEARCH_DEBOUNCE_MS);
  const [data, setData] = useState<LeadPageApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => enabled !== false);
  const [requestVersion, setRequestVersion] = useState(0);

  const refresh = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  const retry = refresh;

  useEffect(() => {
    if (!enabled) return;

    let active = true;

    async function loadPage() {
      setIsLoading(true);
      setError(null);

      try {
        const { response, body } = await fetchLeadJsonOnce(
          buildSalesPageUrl({
            page,
            pageSize,
            q: qDebounced,
            custId,
            stage,
            timeFilter,
            sortField,
            sortDirection,
            scope,
            highlightLeadId,
            includeLost,
          }),
        );

        if (!response.ok || !isLeadPageApiResponse(body)) {
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
              : 'Không thể tải Sales Pipeline.',
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
    qDebounced,
    custId,
    stage,
    timeFilter,
    sortField,
    sortDirection,
    scope,
    highlightLeadId,
    includeLost,
    requestVersion,
    enabled,
  ]);

  return {
    data,
    items: (data?.items ?? []) as LeadListItem[],
    travelMonths: data?.travelMonths ?? [],
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    error,
    isLoading,
    retry,
    refresh,
  };
}

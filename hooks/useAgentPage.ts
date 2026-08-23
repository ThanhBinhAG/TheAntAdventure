'use client';

import { useCallback, useEffect, useState } from 'react';
import type {
  AgentListFilters,
  AgentListItem,
  AgentPageResponse,
  AgentPageSize,
} from '@/lib/agents/agent-list-input';

const SEARCH_DEBOUNCE_MS = 300;

type AgentPageApiResponse = AgentPageResponse & {
  ok: true;
};

/** Share GETs across React Strict Mode remounts instead of aborting and refetching. */
const agentGetInflight = new Map<
  string,
  Promise<{
    response: Response;
    body: unknown;
  }>
>();

/** Shared by list + catalog hooks so Strict Mode remounts do not double-hit `/api/agents`. */
export function fetchAgentJsonOnce(url: string) {
  const existing = agentGetInflight.get(url);
  if (existing) return existing;

  const request = fetch(url, { credentials: 'same-origin' })
    .then(async (response) => ({
      response,
      body: (await response.json()) as unknown,
    }))
    .finally(() => {
      agentGetInflight.delete(url);
    });

  agentGetInflight.set(url, request);
  return request;
}

export type UseAgentPageInput = AgentListFilters & {
  page: number;
  pageSize: AgentPageSize;
};

function appendAgentFilterParams(
  params: URLSearchParams,
  { q }: AgentListFilters,
) {
  if (q) params.set('q', q);
}

function isAgentPageApiResponse(value: unknown): value is AgentPageApiResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return body.ok === true && Array.isArray(body.items);
}

function getApiErrorMessage(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return 'Không thể tải danh sách đại lý.';
  }
  const body = value as Record<string, unknown>;
  return typeof body.error === 'string'
    ? body.error
    : 'Không thể tải danh sách đại lý.';
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

export function buildAgentPageUrl({
  page,
  pageSize,
  q,
}: UseAgentPageInput): string {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  appendAgentFilterParams(params, { q });
  return `/api/agents?${params.toString()}`;
}

export function useAgentPage(input: UseAgentPageInput) {
  const { page, pageSize, q } = input;
  const qDebounced = useDebouncedValue(q, SEARCH_DEBOUNCE_MS);
  const [data, setData] = useState<AgentPageApiResponse | null>(null);
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
        const { response, body } = await fetchAgentJsonOnce(
          buildAgentPageUrl({
            page,
            pageSize,
            q: qDebounced,
          }),
        );

        if (!response.ok || !isAgentPageApiResponse(body)) {
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
              : 'Không thể tải danh sách đại lý.',
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
  }, [page, pageSize, requestVersion, qDebounced]);

  return {
    data,
    items: (data?.items ?? []) as AgentListItem[],
    totalCount: data?.totalCount ?? 0,
    totalPages: data?.totalPages ?? 0,
    error,
    isLoading,
    retry,
    refresh,
  };
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CustomerProfileContext } from '@/lib/customers/customer-repository';

type CustomerProfileApiResponse = CustomerProfileContext & {
  ok: true;
};

const profileGetInflight = new Map<
  string,
  Promise<{ response: Response; body: unknown }>
>();

function fetchCustomerProfileOnce(customerId: string) {
  const url = `/api/customers/${encodeURIComponent(customerId)}/profile`;
  const existing = profileGetInflight.get(url);
  if (existing) return existing;

  const request = fetch(url, { credentials: 'same-origin' })
    .then(async (response) => ({
      response,
      body: (await response.json()) as unknown,
    }))
    .finally(() => {
      profileGetInflight.delete(url);
    });

  profileGetInflight.set(url, request);
  return request;
}

function isCustomerProfileResponse(
  value: unknown,
): value is CustomerProfileApiResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Record<string, unknown>;
  return (
    body.ok === true &&
    Array.isArray(body.leads) &&
    Array.isArray(body.comms) &&
    Array.isArray(body.bookings) &&
    Array.isArray(body.feedback)
  );
}

function getApiErrorMessage(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return 'Không thể tải profile khách hàng.';
  }
  const body = value as Record<string, unknown>;
  return typeof body.error === 'string'
    ? body.error
    : 'Không thể tải profile khách hàng.';
}

const EMPTY_PROFILE: CustomerProfileContext = {
  leads: [],
  comms: [],
  bookings: [],
  feedback: [],
};

export function useCustomerProfile(customerId: string) {
  const [data, setData] = useState<CustomerProfileContext>(EMPTY_PROFILE);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);

  const refresh = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setIsLoading(true);
      setError(null);

      try {
        const { response, body } = await fetchCustomerProfileOnce(customerId);
        if (!response.ok || !isCustomerProfileResponse(body)) {
          throw new Error(getApiErrorMessage(body));
        }

        if (active) {
          setData({
            leads: body.leads,
            comms: body.comms,
            bookings: body.bookings,
            feedback: body.feedback,
          });
        }
      } catch (caughtError) {
        if (active) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Không thể tải profile khách hàng.',
          );
          setData(EMPTY_PROFILE);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [customerId, requestVersion]);

  return {
    ...data,
    error,
    isLoading,
    refresh,
  };
}

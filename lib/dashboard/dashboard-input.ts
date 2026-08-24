import { z } from 'zod';

export const DASHBOARD_CLIENT_TYPES = ['', 'b2b', 'b2c'] as const;

export const dashboardQuerySchema = z.object({
  clientType: z
    .enum(DASHBOARD_CLIENT_TYPES)
    .optional()
    .default(''),
  market: z
    .string()
    .trim()
    .max(64)
    .optional()
    .default(''),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export function optionalDashboardQueryParam(
  url: URL,
  key: string,
): string | undefined {
  const value = url.searchParams.get(key);
  return value == null || value === '' ? undefined : value;
}

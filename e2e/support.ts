import { loadEnvConfig } from '@next/env';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const statePath = join(process.cwd(), '.e2e-state.json');
const SUPABASE_ACCESS_COOKIE = 'sb-crm-access-token';

export type E2eState = {
  prefix: string;
  admin: { id: string; email: string; password: string };
  unassigned: { id: string; email: string; password: string };
  customerId: string;
  leadId: string;
};

type ApiResult = { status: number; body: unknown };

export function loadE2eEnvironment(): void {
  loadEnvConfig(process.cwd());
  if (process.env.E2E_ALLOW_DATABASE_MUTATION !== '1') {
    throw new Error('E2E_ALLOW_DATABASE_MUTATION=1 is required before browser E2E may modify data.');
  }
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE URL and SUPABASE_SERVICE_ROLE_KEY are required for browser E2E.');
  }
  const hostname = new URL(url).hostname;
  const localHost = hostname === '127.0.0.1' || hostname === 'localhost';
  if (!localHost && process.env.E2E_ALLOW_REMOTE_DATABASE !== '1') {
    throw new Error('Browser E2E only permits localhost Supabase unless E2E_ALLOW_REMOTE_DATABASE=1 is set for a dedicated test database.');
  }
}

export function getAdminClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('E2E Supabase environment is unavailable.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function writeE2eState(state: E2eState): Promise<void> {
  await writeFile(statePath, JSON.stringify(state), 'utf8');
}

export async function readE2eState(): Promise<E2eState> {
  return JSON.parse(await readFile(statePath, 'utf8')) as E2eState;
}

export async function removeE2eState(): Promise<void> {
  await unlink(statePath).catch(() => undefined);
}

export function newId(): string {
  return randomUUID();
}

export async function login(page: Page, credentials: E2eState['admin']): Promise<void> {
  await page.goto('/login');
  await page.locator('#login-identity').fill(credentials.email);
  await page.locator('#login-password').fill(credentials.password);
  const loginResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/login');
  await page.getByRole('button', { name: 'Login' }).click();
  const response = await loginResponse;
  if (!response.ok()) throw new Error(`Login API rejected the E2E user: ${await response.text()}`);
  await expect
    .poll(async () => (await page.context().cookies()).some((cookie) => cookie.name === SUPABASE_ACCESS_COOKIE))
    .toBe(true);
}

export async function logoutViaUi(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Mở công cụ hệ thống/ }).click();
  await page.getByTitle('Đăng xuất').click();
  await expect
    .poll(async () => (await page.context().cookies()).some((cookie) => cookie.name === SUPABASE_ACCESS_COOKIE))
    .toBe(false);
}

export async function browserJson(
  page: Page,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<ApiResult> {
  // APIRequestContext shares the browser context's cookie jar but does not
  // depend on a document execution context. The application may redirect the
  // current page while an unauthenticated/forbidden request is being checked.
  const headers: Record<string, string> = {
    Origin: new URL(page.url()).origin,
  };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await page.request.fetch(path, {
    method: init.method,
    headers,
    data: init.body,
  });
  const text = await response.text();
  return { status: response.status(), body: text ? JSON.parse(text) : null };
}

export async function assertRow(
  table: string,
  column: string,
  value: string,
): Promise<Record<string, unknown> | null> {
  const { data, error } = await getAdminClient().from(table).select('*').eq(column, value).maybeSingle();
  if (error) throw error;
  return data as Record<string, unknown> | null;
}

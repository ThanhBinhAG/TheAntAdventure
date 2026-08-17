import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DEFAULTS_PATH = path.join(ROOT, 'env', 'company.defaults.env');

const SANITIZE_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'APP_URL',
  'SUPABASE_TLS_INSECURE',
];

export function isLocalSupabaseUrl(url) {
  return /127\.0\.0\.1|localhost/i.test(url ?? '');
}

export function loadCompanyDefaults() {
  if (!fs.existsSync(DEFAULTS_PATH)) return {};
  return dotenv.parse(fs.readFileSync(DEFAULTS_PATH));
}

function isTruthy(v) {
  const t = (v ?? '').trim().toLowerCase();
  return t === 'true' || t === '1' || t === 'yes';
}

/** Apply NODE_TLS_REJECT_UNAUTHORIZED when company TLS insecure is on. */
export function applyTlsInsecureNodeFlag(env = process.env) {
  const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();

  // Local Supabase dùng HTTP; không mang TLS workaround của công ty sang local.
  if (isLocalSupabaseUrl(url)) return;

  const defaults = loadCompanyDefaults();

  if (!env.SUPABASE_TLS_INSECURE && defaults.SUPABASE_TLS_INSECURE) {
    env.SUPABASE_TLS_INSECURE = defaults.SUPABASE_TLS_INSECURE;
  }

  const companyHost = /sb\.mitelai\.com/i.test(url);

  if (isTruthy(env.SUPABASE_TLS_INSECURE) || companyHost) {
    if (env.NODE_TLS_REJECT_UNAUTHORIZED === undefined) {
      env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
  }
}
/**
 * Always replace localhost Supabase env with company self-host defaults.
 * (Local Docker Supabase is not used — deploy VM cannot be patched via SSH.)
 */
export function sanitizeSupabaseEnv(env = process.env) {
  const envUrl = (env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const allowLocal = isTruthy(env.NEXT_PUBLIC_ALLOW_LOCAL_SUPABASE);
  let replaced = false;

  if (!envUrl || (isLocalSupabaseUrl(envUrl) && !allowLocal)) {
    const defaults = loadCompanyDefaults();

    for (const key of SANITIZE_KEYS) {
      const value = defaults[key];
      if (value) env[key] = value;
    }

    replaced = true;
  }

  applyTlsInsecureNodeFlag(env);
  return replaced;
}

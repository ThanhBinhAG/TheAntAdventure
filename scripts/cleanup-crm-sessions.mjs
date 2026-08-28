import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const retentionDays = Number.parseInt(process.env.CRM_SESSION_RETENTION_DAYS ?? '30', 10);

if (!url || !serviceRoleKey || !Number.isInteger(retentionDays) || retentionDays < 1) {
  console.error('CRM session cleanup requires SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and a positive CRM_SESSION_RETENTION_DAYS.');
  process.exitCode = 1;
} else {
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.rpc('cleanup_crm_sessions', {
    p_retention_days: retentionDays,
  });

  if (error) {
    console.error('CRM session cleanup failed.');
    process.exitCode = 1;
  } else {
    console.log('CRM session cleanup completed.');
  }
}

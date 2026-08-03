select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'access_control_audit_logs';
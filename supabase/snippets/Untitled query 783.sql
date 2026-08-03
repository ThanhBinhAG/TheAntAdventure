explain (analyze, buffers)
select
  id,
  action,
  actor_user_id,
  target_user_id,
  created_at
from public.access_control_audit_logs
order by created_at desc, id desc
limit 20;
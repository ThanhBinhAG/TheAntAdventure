-- Bật bộ lập lịch PostgreSQL.
-- Job chạy nội bộ trong database, không mở endpoint xóa dữ liệu ra Internet.
create extension if not exists pg_cron;

-- Migration có thể được chạy lại ở môi trường khác:
-- xóa job cũ cùng tên trước để không tạo hai lịch dọn đồng thời.
do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid
    from cron.job
    where jobname = 'purge-auth-login-events-daily'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;
end;
$$;

-- Chạy lúc 03:17 mỗi ngày theo múi giờ database (thường là UTC).
-- 03:17 UTC tương đương 10:17 sáng giờ Việt Nam.
select cron.schedule(
  'purge-auth-login-events-daily',
  '17 3 * * *',
  $$select public.purge_old_auth_login_events(90);$$
);
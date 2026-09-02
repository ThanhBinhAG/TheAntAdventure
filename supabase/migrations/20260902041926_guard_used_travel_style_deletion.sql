create or replace function private.prevent_used_travel_style_delete()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if exists (
    select 1
    from public.customers
    where travel_style = old.label
  ) then
    raise exception 'Không thể xóa Travel Style "%" vì đang được khách hàng sử dụng.', old.label
      using errcode = '23503';
  end if;
  return old;
end;
$function$;

drop trigger if exists prevent_used_travel_style_delete on public.travel_styles;
create trigger prevent_used_travel_style_delete
  before delete on public.travel_styles
  for each row execute function private.prevent_used_travel_style_delete();

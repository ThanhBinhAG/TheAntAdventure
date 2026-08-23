create or replace function public.update_attraction_aggregate(
  p_attraction jsonb,
  p_photo_links jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_id text := p_attraction ->> 'id';
begin
  -- Lock the existing aggregate so a concurrent delete cannot turn PATCH into an upsert.
  perform 1 from public.attractions where id = v_id for update;
  if not found then
    raise exception 'Attraction not found' using errcode = 'P0002';
  end if;

  perform public.save_attraction_aggregate(p_attraction, p_photo_links);
end;
$function$;

revoke all on function public.update_attraction_aggregate(jsonb, jsonb) from public;
grant execute on function public.update_attraction_aggregate(jsonb, jsonb) to authenticated;

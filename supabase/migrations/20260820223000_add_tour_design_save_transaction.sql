create or replace function public.save_tour_design_transaction(
  p_draft jsonb,
  p_outline_days jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_draft_id text := p_draft ->> 'id';
begin
  if jsonb_typeof(p_draft) <> 'object' or coalesce(v_draft_id, '') = '' then
    raise exception 'Tour draft payload is invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(p_outline_days) <> 'array' then
    raise exception 'Tour outline payload must be an array' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_outline_days) as day
    where coalesce(day ->> 'draft_id', '') <> v_draft_id
  ) then
    raise exception 'Every outline day must belong to the draft' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_outline_days) as day
    group by day ->> 'day_number'
    having count(*) > 1
  ) then
    raise exception 'Outline day numbers must be unique' using errcode = '22023';
  end if;

  insert into public.tour_drafts (
    id, lead_id, cust_id, brief_json, outline_status, outline_notes,
    outline_sent_at, outline_approved_at, outline_revision, selected_codes,
    selected_package_id, markup_pct, client_type, current_step
  ) values (
    v_draft_id,
    nullif(p_draft ->> 'lead_id', ''),
    nullif(p_draft ->> 'cust_id', ''),
    nullif(p_draft -> 'brief_json', 'null'::jsonb),
    coalesce(nullif(p_draft ->> 'outline_status', ''), 'draft'),
    nullif(p_draft ->> 'outline_notes', ''),
    nullif(p_draft ->> 'outline_sent_at', '')::timestamptz,
    nullif(p_draft ->> 'outline_approved_at', '')::timestamptz,
    coalesce(nullif(p_draft ->> 'outline_revision', '')::smallint, 0),
    case
      when p_draft -> 'selected_codes' is null or p_draft -> 'selected_codes' = 'null'::jsonb then null
      else array(select jsonb_array_elements_text(p_draft -> 'selected_codes'))
    end,
    nullif(p_draft ->> 'selected_package_id', ''),
    coalesce(nullif(p_draft ->> 'markup_pct', '')::numeric, 30),
    coalesce(nullif(p_draft ->> 'client_type', ''), 'b2c'),
    coalesce(nullif(p_draft ->> 'current_step', '')::smallint, 0)
  )
  on conflict (id) do update set
    lead_id = excluded.lead_id,
    cust_id = excluded.cust_id,
    brief_json = excluded.brief_json,
    outline_status = excluded.outline_status,
    outline_notes = excluded.outline_notes,
    outline_sent_at = excluded.outline_sent_at,
    outline_approved_at = excluded.outline_approved_at,
    outline_revision = excluded.outline_revision,
    selected_codes = excluded.selected_codes,
    selected_package_id = excluded.selected_package_id,
    markup_pct = excluded.markup_pct,
    client_type = excluded.client_type,
    current_step = excluded.current_step,
    updated_at = now();

  delete from public.tour_outline_days where draft_id = v_draft_id;

  insert into public.tour_outline_days (
    id, draft_id, day_number, outline_date, location, activities, hotels, sort_order
  )
  select
    (day ->> 'id')::uuid,
    v_draft_id,
    (day ->> 'day_number')::smallint,
    nullif(day ->> 'outline_date', '')::date,
    nullif(day ->> 'location', ''),
    nullif(day ->> 'activities', ''),
    nullif(day ->> 'hotels', ''),
    coalesce(nullif(day ->> 'sort_order', '')::smallint, (day ->> 'day_number')::smallint)
  from jsonb_array_elements(p_outline_days) as day;
end;
$function$;

revoke all on function public.save_tour_design_transaction(jsonb, jsonb) from public;
grant execute on function public.save_tour_design_transaction(jsonb, jsonb) to authenticated;

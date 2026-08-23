alter table public.tour_drafts
  add column if not exists save_revision integer not null default 0;

create or replace function public.save_tour_design_versioned_transaction(
  p_draft jsonb,
  p_outline_days jsonb,
  p_expected_save_revision integer
)
returns integer
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_draft_id text := p_draft ->> 'id';
  v_current_save_revision integer;
  v_next_save_revision integer;
begin
  if jsonb_typeof(p_draft) <> 'object' or coalesce(v_draft_id, '') = '' then
    raise exception 'Tour draft payload is invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(p_outline_days) <> 'array' then
    raise exception 'Tour outline payload must be an array' using errcode = '22023';
  end if;
  if p_expected_save_revision < 0 then
    raise exception 'Expected save revision must be non-negative' using errcode = '22023';
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

  select save_revision
  into v_current_save_revision
  from public.tour_drafts
  where id = v_draft_id
  for update;

  if found then
    if p_expected_save_revision <> v_current_save_revision then
      raise exception 'Tour draft was modified by a newer save'
        using errcode = 'P0001', detail = format('current_save_revision=%s', v_current_save_revision);
    end if;
    v_next_save_revision := v_current_save_revision + 1;

    update public.tour_drafts set
      lead_id = nullif(p_draft ->> 'lead_id', ''),
      cust_id = nullif(p_draft ->> 'cust_id', ''),
      brief_json = nullif(p_draft -> 'brief_json', 'null'::jsonb),
      outline_status = coalesce(nullif(p_draft ->> 'outline_status', ''), 'draft'),
      outline_notes = nullif(p_draft ->> 'outline_notes', ''),
      outline_sent_at = nullif(p_draft ->> 'outline_sent_at', '')::timestamptz,
      outline_approved_at = nullif(p_draft ->> 'outline_approved_at', '')::timestamptz,
      outline_revision = coalesce(nullif(p_draft ->> 'outline_revision', '')::smallint, 0),
      selected_codes = case
        when p_draft -> 'selected_codes' is null or p_draft -> 'selected_codes' = 'null'::jsonb then null
        else array(select jsonb_array_elements_text(p_draft -> 'selected_codes'))
      end,
      selected_package_id = nullif(p_draft ->> 'selected_package_id', ''),
      markup_pct = coalesce(nullif(p_draft ->> 'markup_pct', '')::numeric, 30),
      client_type = coalesce(nullif(p_draft ->> 'client_type', ''), 'b2c'),
      current_step = coalesce(nullif(p_draft ->> 'current_step', '')::smallint, 0),
      save_revision = v_next_save_revision,
      updated_at = now()
    where id = v_draft_id;
  else
    if p_expected_save_revision <> 0 then
      raise exception 'Tour draft was modified by a newer save'
        using errcode = 'P0001', detail = 'current_save_revision=0';
    end if;
    v_next_save_revision := 1;

    insert into public.tour_drafts (
      id, lead_id, cust_id, brief_json, outline_status, outline_notes,
      outline_sent_at, outline_approved_at, outline_revision, save_revision, selected_codes,
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
      v_next_save_revision,
      case
        when p_draft -> 'selected_codes' is null or p_draft -> 'selected_codes' = 'null'::jsonb then null
        else array(select jsonb_array_elements_text(p_draft -> 'selected_codes'))
      end,
      nullif(p_draft ->> 'selected_package_id', ''),
      coalesce(nullif(p_draft ->> 'markup_pct', '')::numeric, 30),
      coalesce(nullif(p_draft ->> 'client_type', ''), 'b2c'),
      coalesce(nullif(p_draft ->> 'current_step', '')::smallint, 0)
    );
  end if;

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

  return v_next_save_revision;
end;
$function$;

revoke all on function public.save_tour_design_versioned_transaction(jsonb, jsonb, integer) from public;
grant execute on function public.save_tour_design_versioned_transaction(jsonb, jsonb, integer) to authenticated;

-- Outline transitions change three resources. Keep the Draft, Lead and Comm
-- effects in one transaction so browser state cannot claim a transition that
-- was only partially persisted.
create or replace function public.apply_tour_design_outline_workflow(
  p_action text,
  p_draft jsonb,
  p_outline_days jsonb,
  p_expected_save_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_draft_id text := p_draft ->> 'id';
  v_existing_draft public.tour_drafts%rowtype;
  v_saved_draft public.tour_drafts%rowtype;
  v_lead public.leads%rowtype;
  v_comm public.comms%rowtype;
  v_saved_revision integer;
  v_draft_payload jsonb;
  v_customer_name text;
  v_author text;
  v_next_outline_revision integer;
  v_has_comm boolean := false;
begin
  if (select auth.uid()) is null then
    raise exception 'Chưa đăng nhập hoặc session đã hết hạn.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_draft) <> 'object' or coalesce(v_draft_id, '') = '' then
    raise exception 'Tour draft payload is invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(p_outline_days) <> 'array' then
    raise exception 'Tour outline payload must be an array' using errcode = '22023';
  end if;
  if p_action not in ('sent', 'resent', 'approved', 'revised') then
    raise exception 'Outline workflow action is invalid' using errcode = '22023';
  end if;
  if p_expected_save_revision < 0 then
    raise exception 'Expected save revision must be non-negative' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('tour-design:' || v_draft_id));

  select * into v_existing_draft
  from public.tour_drafts
  where id = v_draft_id
  for update;
  if not found then
    raise exception 'Tour draft does not exist' using errcode = 'P0002';
  end if;
  if not private.can_access_tour_draft_record(v_draft_id, 'write') then
    raise exception 'Bạn không có quyền chỉnh sửa Tour Design này.' using errcode = '42501';
  end if;
  if p_expected_save_revision <> v_existing_draft.save_revision then
    raise exception 'Tour draft was modified by a newer save'
      using errcode = 'P0001', detail = format('current_save_revision=%s', v_existing_draft.save_revision);
  end if;
  if coalesce(p_draft ->> 'lead_id', '') <> v_existing_draft.lead_id
    or coalesce(p_draft ->> 'cust_id', '') <> v_existing_draft.cust_id then
    raise exception 'Tour draft relationship cannot be changed by an Outline workflow'
      using errcode = '22023';
  end if;

  select * into v_lead
  from public.leads
  where id = v_existing_draft.lead_id
  for update;
  if not found or v_lead.cust_id is distinct from v_existing_draft.cust_id then
    raise exception 'Tour draft Lead relationship is invalid' using errcode = '22023';
  end if;
  select name into v_customer_name from public.customers where id = v_existing_draft.cust_id;
  v_customer_name := coalesce(nullif(v_customer_name, ''), 'Client');
  v_author := nullif(btrim(coalesce(v_existing_draft.brief_json ->> 'salesperson', '')), '');
  v_author := case
    when v_author is null then 'The Ant Adventures'
    else v_author || ' (The Ant Adventures)'
  end;
  v_draft_payload := p_draft || jsonb_build_object(
    'lead_id', v_existing_draft.lead_id,
    'cust_id', v_existing_draft.cust_id
  );

  case p_action
    when 'sent' then
      if v_existing_draft.outline_status <> 'draft' or coalesce(v_existing_draft.outline_revision, 0) <> 0 then
        raise exception 'Outline must be an unsent draft before sending' using errcode = '22023';
      end if;
      v_next_outline_revision := 1;
      v_draft_payload := v_draft_payload || jsonb_build_object(
        'outline_status', 'sent',
        'outline_sent_at', now(),
        'outline_revision', v_next_outline_revision
      );
      update public.leads set
        stage = 'Pending', probability = 70, next_action = 'Awaiting client outline approval', updated_at = now()
      where id = v_lead.id
      returning * into v_lead;
      insert into public.comms (id, cust_id, comm_date, type, direction, subject, body, author)
      values (
        'CM-' || replace(gen_random_uuid()::text, '-', ''), v_existing_draft.cust_id, current_date,
        'Note', 'outbound',
        'Outline sent to ' || v_customer_name,
        'Day-by-day outline (revision 1) sent to ' || v_customer_name || ' for client review.',
        v_author
      ) returning * into v_comm;
      v_has_comm := true;
    when 'resent' then
      if v_existing_draft.outline_status <> 'draft' or coalesce(v_existing_draft.outline_revision, 0) < 1 then
        raise exception 'Outline must be a revised draft before resending' using errcode = '22023';
      end if;
      v_next_outline_revision := v_existing_draft.outline_revision + 1;
      v_draft_payload := v_draft_payload || jsonb_build_object(
        'outline_status', 'sent',
        'outline_sent_at', now(),
        'outline_revision', v_next_outline_revision
      );
      update public.leads set
        stage = 'Pending', probability = 70,
        next_action = format('Outline revision %s sent — awaiting client approval', v_next_outline_revision),
        updated_at = now()
      where id = v_lead.id
      returning * into v_lead;
      insert into public.comms (id, cust_id, comm_date, type, direction, subject, body, author)
      values (
        'CM-' || replace(gen_random_uuid()::text, '-', ''), v_existing_draft.cust_id, current_date,
        'Note', 'outbound',
        format('Outline revision %s sent', v_next_outline_revision),
        format('Revised outline (revision %s) sent to %s for review.', v_next_outline_revision, v_customer_name),
        v_author
      ) returning * into v_comm;
      v_has_comm := true;
    when 'approved' then
      if v_existing_draft.outline_status <> 'sent' then
        raise exception 'Only a sent Outline can be approved' using errcode = '22023';
      end if;
      v_draft_payload := v_draft_payload || jsonb_build_object(
        'outline_status', 'approved',
        'outline_approved_at', now()
      );
      update public.leads set
        stage = 'Designing', probability = 25,
        next_action = 'Build tour experiences from approved outline', updated_at = now()
      where id = v_lead.id
      returning * into v_lead;
      insert into public.comms (id, cust_id, comm_date, type, direction, subject, body, author)
      values (
        'CM-' || replace(gen_random_uuid()::text, '-', ''), v_existing_draft.cust_id, current_date,
        'Note', 'outbound',
        'Outline approved — ' || v_customer_name,
        'Client approved the day-by-day outline. Proceed to tour experiences and pricing.',
        v_author
      ) returning * into v_comm;
      v_has_comm := true;
    when 'revised' then
      if v_existing_draft.outline_status not in ('sent', 'approved') then
        raise exception 'Only a sent or approved Outline can be revised' using errcode = '22023';
      end if;
      v_draft_payload := v_draft_payload || jsonb_build_object(
        'outline_status', 'draft',
        'outline_approved_at', null
      );
      update public.leads set
        next_action = format('Revise outline (revision %s) — resend when ready', coalesce(v_existing_draft.outline_revision, 1)),
        updated_at = now()
      where id = v_lead.id
      returning * into v_lead;
  end case;

  select public.save_tour_design_versioned_transaction(
    v_draft_payload,
    p_outline_days,
    p_expected_save_revision
  ) into v_saved_revision;
  select * into v_saved_draft from public.tour_drafts where id = v_draft_id;

  return jsonb_build_object(
    'save_revision', v_saved_revision,
    'draft', to_jsonb(v_saved_draft),
    'lead', to_jsonb(v_lead),
    'comm', case when v_has_comm then to_jsonb(v_comm) else null end
  );
end;
$function$;

revoke all on function public.apply_tour_design_outline_workflow(text, jsonb, jsonb, integer) from public;
grant execute on function public.apply_tour_design_outline_workflow(text, jsonb, jsonb, integer) to authenticated;

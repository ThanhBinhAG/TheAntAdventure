-- Ordinary autosave may never transition Outline lifecycle fields. Those changes
-- go exclusively through apply_tour_design_outline_workflow.
create or replace function public.save_tour_design_content_versioned_transaction(
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
  v_existing_workflow jsonb;
  v_safe_draft jsonb;
begin
  if jsonb_typeof(p_draft) <> 'object' or coalesce(v_draft_id, '') = '' then
    raise exception 'Tour draft payload is invalid' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext('tour-design:' || v_draft_id));

  select jsonb_build_object(
    'outline_status', outline_status,
    'outline_sent_at', outline_sent_at,
    'outline_approved_at', outline_approved_at,
    'outline_revision', outline_revision
  ) into v_existing_workflow
  from public.tour_drafts
  where id = v_draft_id
  for update;

  v_existing_workflow := coalesce(
    v_existing_workflow,
    jsonb_build_object(
      'outline_status', 'draft',
      'outline_sent_at', null,
      'outline_approved_at', null,
      'outline_revision', 0
    )
  );
  v_safe_draft := (p_draft - array[
    'outline_status', 'outline_sent_at', 'outline_approved_at', 'outline_revision', 'save_revision'
  ]) || v_existing_workflow;

  return public.save_tour_design_versioned_transaction(
    v_safe_draft,
    p_outline_days,
    p_expected_save_revision
  );
end;
$function$;

revoke all on function public.save_tour_design_content_versioned_transaction(jsonb, jsonb, integer) from public;
grant execute on function public.save_tour_design_content_versioned_transaction(jsonb, jsonb, integer) to authenticated;

drop policy if exists rls_travel_styles_select on public.travel_styles;

create policy rls_travel_styles_select on public.travel_styles
  for select to authenticated
  using (
    public.has_permission('customers.write')
    or public.has_permission('tour_design.read')
  );

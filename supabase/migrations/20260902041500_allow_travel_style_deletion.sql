grant delete on table public.travel_styles to authenticated;

drop policy if exists rls_travel_styles_delete on public.travel_styles;
create policy rls_travel_styles_delete on public.travel_styles
  for delete to authenticated using (public.has_permission('customers.write'));

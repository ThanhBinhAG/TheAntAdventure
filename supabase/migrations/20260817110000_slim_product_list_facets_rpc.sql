create or replace function public.list_product_facets(
  p_search_text text default null,
  p_filter_region text default null,
  p_filter_duration text default null,
  p_filter_category text default null,
  p_filter_destination text default null,
  p_filter_pricing_status text default null
) returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with base as (
    select
      p.code,
      p.name,
      p.description,
      p.destination,
      p.region,
      p.duration,
      p.category,
      case
        when pp.product_code is null then 'missing'
        when greatest(
          coalesce(pp.p1, 0), coalesce(pp.p2, 0), coalesce(pp.p3, 0),
          coalesce(pp.p4, 0), coalesce(pp.p5, 0), coalesce(pp.p6, 0),
          coalesce(pp.p7, 0), coalesce(pp.p8, 0), coalesce(pp.p9, 0),
          coalesce(pp.p10, 0)
        ) > 0
         and greatest(
          coalesce(pp.c1, 0), coalesce(pp.c2, 0), coalesce(pp.c3, 0),
          coalesce(pp.c4, 0), coalesce(pp.c5, 0), coalesce(pp.c6, 0),
          coalesce(pp.c7, 0), coalesce(pp.c8, 0), coalesce(pp.c9, 0),
          coalesce(pp.c10, 0)
        ) > 0 then 'complete'
        when greatest(
          coalesce(pp.std_cost, 0),
          coalesce(pp.p1, 0), coalesce(pp.p2, 0), coalesce(pp.p3, 0),
          coalesce(pp.p4, 0), coalesce(pp.p5, 0), coalesce(pp.p6, 0),
          coalesce(pp.p7, 0), coalesce(pp.p8, 0), coalesce(pp.p9, 0),
          coalesce(pp.p10, 0),
          coalesce(pp.c1, 0), coalesce(pp.c2, 0), coalesce(pp.c3, 0),
          coalesce(pp.c4, 0), coalesce(pp.c5, 0), coalesce(pp.c6, 0),
          coalesce(pp.c7, 0), coalesce(pp.c8, 0), coalesce(pp.c9, 0),
          coalesce(pp.c10, 0)
        ) > 0 then 'incomplete'
        else 'missing'
      end as pricing_status
    from public.products p
    left join public.product_pricing pp on pp.product_code = p.code
  ), filtered as (
    select * from base
    where
      (nullif(trim(p_search_text), '') is null
        or name ilike '%' || p_search_text || '%'
        or description ilike '%' || p_search_text || '%'
        or code ilike '%' || p_search_text || '%'
        or destination ilike '%' || p_search_text || '%')
      and (nullif(trim(p_filter_region), '') is null or region = p_filter_region)
      and (nullif(trim(p_filter_duration), '') is null or duration = p_filter_duration)
      and (nullif(trim(p_filter_category), '') is null or category ilike '%' || p_filter_category || '%')
  ), destination_rows as (
    select coalesce(destination, 'Other') as destination, count(*)::integer as total
    from filtered
    where (nullif(trim(p_filter_pricing_status), '') is null or pricing_status = p_filter_pricing_status)
    group by coalesce(destination, 'Other')
  ), pricing_rows as (
    select pricing_status, count(*)::integer as total
    from filtered
    where (nullif(trim(p_filter_destination), '') is null or destination = p_filter_destination)
    group by pricing_status
  )
  select jsonb_build_object(
    'categories', (
      select coalesce(jsonb_agg(category order by category), '[]'::jsonb)
      from (select distinct category from base where category <> '') c
    ),
    'destinations', (
      select coalesce(jsonb_object_agg(destination, total), '{}'::jsonb)
      from destination_rows
    ),
    'pricingPulse', jsonb_build_object(
      'complete', coalesce((select total from pricing_rows where pricing_status = 'complete'), 0),
      'incomplete', coalesce((select total from pricing_rows where pricing_status = 'incomplete'), 0),
      'missing', coalesce((select total from pricing_rows where pricing_status = 'missing'), 0)
    )
  );
$$;

revoke all on function public.list_product_facets(text, text, text, text, text, text) from public;
grant execute on function public.list_product_facets(text, text, text, text, text, text) to authenticated;

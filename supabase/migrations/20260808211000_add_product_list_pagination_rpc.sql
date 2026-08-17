create or replace function public.list_products_page(
  p_page_number integer, p_page_size integer, p_search_text text default null,
  p_filter_region text default null, p_filter_duration text default null,
  p_filter_category text default null, p_filter_destination text default null,
  p_filter_pricing_status text default null
) returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare result jsonb;
begin
  if p_page_number < 1 or p_page_size not in (12, 24, 48, 96) then
    raise exception 'Yêu cầu phân trang không hợp lệ' using errcode = '22023';
  end if;
  if p_filter_pricing_status is not null and p_filter_pricing_status not in ('complete', 'incomplete', 'missing') then
    raise exception 'Bộ lọc pricing không hợp lệ' using errcode = '22023';
  end if;
  with filtered as (
    select p.* from public.products p left join public.product_pricing pp on pp.product_code = p.code
    where (nullif(trim(p_search_text), '') is null or p.name ilike '%' || p_search_text || '%' or p.description ilike '%' || p_search_text || '%' or p.code ilike '%' || p_search_text || '%' or p.destination ilike '%' || p_search_text || '%')
      and (nullif(trim(p_filter_region), '') is null or p.region = p_filter_region)
      and (nullif(trim(p_filter_duration), '') is null or p.duration = p_filter_duration)
      and (nullif(trim(p_filter_category), '') is null or p.category ilike '%' || p_filter_category || '%')
      and (nullif(trim(p_filter_destination), '') is null or p.destination = p_filter_destination)
      and (nullif(trim(p_filter_pricing_status), '') is null or case
        when pp.product_code is null then 'missing'
        when greatest(coalesce(pp.p1,0),coalesce(pp.p2,0),coalesce(pp.p3,0),coalesce(pp.p4,0),coalesce(pp.p5,0),coalesce(pp.p6,0),coalesce(pp.p7,0),coalesce(pp.p8,0),coalesce(pp.p9,0),coalesce(pp.p10,0)) > 0
         and greatest(coalesce(pp.c1,0),coalesce(pp.c2,0),coalesce(pp.c3,0),coalesce(pp.c4,0),coalesce(pp.c5,0),coalesce(pp.c6,0),coalesce(pp.c7,0),coalesce(pp.c8,0),coalesce(pp.c9,0),coalesce(pp.c10,0)) > 0 then 'complete'
        when greatest(coalesce(pp.std_cost,0),coalesce(pp.p1,0),coalesce(pp.p2,0),coalesce(pp.p3,0),coalesce(pp.p4,0),coalesce(pp.p5,0),coalesce(pp.p6,0),coalesce(pp.p7,0),coalesce(pp.p8,0),coalesce(pp.p9,0),coalesce(pp.p10,0),coalesce(pp.c1,0),coalesce(pp.c2,0),coalesce(pp.c3,0),coalesce(pp.c4,0),coalesce(pp.c5,0),coalesce(pp.c6,0),coalesce(pp.c7,0),coalesce(pp.c8,0),coalesce(pp.c9,0),coalesce(pp.c10,0)) > 0 then 'incomplete'
        else 'missing' end = p_filter_pricing_status)
  ), meta as (select count(*)::integer total_count from filtered), info as (
    select total_count, greatest(1, ceil(total_count::numeric / p_page_size)::integer) total_pages from meta
  ), page_info as (select total_count, total_pages, least(p_page_number, total_pages) page from info), paged as (
    select f.* from filtered f cross join page_info order by f.code limit p_page_size offset (select (page - 1) * p_page_size from page_info)
  ) select jsonb_build_object('items',(select coalesce(jsonb_agg(to_jsonb(paged) order by paged.code),'[]'::jsonb) from paged),'page',page,'pageSize',p_page_size,'totalCount',total_count,'totalPages',total_pages,'hasPreviousPage',page>1,'hasNextPage',page<total_pages) into result from page_info;
  return result;
end;
$$;

revoke all on function public.list_products_page(integer, integer, text, text, text, text, text, text) from public;
grant execute on function public.list_products_page(integer, integer, text, text, text, text, text, text) to authenticated;

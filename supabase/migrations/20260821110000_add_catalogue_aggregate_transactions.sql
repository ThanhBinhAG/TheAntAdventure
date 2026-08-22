create or replace function public.save_product_aggregate(
  p_product jsonb,
  p_pricing_stub jsonb,
  p_photo_links jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $function$
declare
  v_code text := p_product ->> 'code';
begin
  if jsonb_typeof(p_product) <> 'object'
     or coalesce(nullif(trim(v_code), ''), '') = ''
     or coalesce(nullif(trim(p_product ->> 'name'), ''), '') = '' then
    raise exception 'Product payload requires a code and name' using errcode = '22023';
  end if;
  if jsonb_typeof(p_pricing_stub) <> 'object'
     or p_pricing_stub ->> 'product_code' <> v_code then
    raise exception 'Product pricing stub must belong to the product' using errcode = '22023';
  end if;
  if jsonb_typeof(p_photo_links) <> 'array' then
    raise exception 'Product photo links must be an array' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_photo_links) as photo
    where coalesce(nullif(trim(photo ->> 'photo_id'), ''), '') = ''
       or photo ->> 'product_code' <> v_code
  ) or exists (
    select 1 from jsonb_array_elements(p_photo_links) as photo
    group by photo ->> 'photo_id' having count(*) > 1
  ) then
    raise exception 'Product photo links must be unique and belong to the product' using errcode = '22023';
  end if;

  insert into public.products (
    code, name, logic, duration, category, destination, level, description,
    usp, notes_to_sales, price_from, region
  ) values (
    v_code, p_product ->> 'name', nullif(p_product ->> 'logic', ''),
    nullif(p_product ->> 'duration', ''), nullif(p_product ->> 'category', ''),
    nullif(p_product ->> 'destination', ''), nullif(p_product ->> 'level', ''),
    nullif(p_product ->> 'description', ''), nullif(p_product ->> 'usp', ''),
    nullif(p_product ->> 'notes_to_sales', ''), nullif(p_product ->> 'price_from', ''),
    nullif(p_product ->> 'region', '')
  ) on conflict (code) do update set
    name = excluded.name, logic = excluded.logic, duration = excluded.duration,
    category = excluded.category, destination = excluded.destination,
    level = excluded.level, description = excluded.description, usp = excluded.usp,
    notes_to_sales = excluded.notes_to_sales, price_from = excluded.price_from,
    region = excluded.region, updated_at = now();

  insert into public.product_pricing (
    product_code, std_cost, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10,
    c1, c2, c3, c4, c5, c6, c7, c8, c9, c10,
    incl_guide, incl_transport, incl_tickets, incl_water, incl_meals
  ) values (
    v_code,
    coalesce((p_pricing_stub ->> 'std_cost')::numeric, 0),
    coalesce((p_pricing_stub ->> 'p1')::numeric, 0), coalesce((p_pricing_stub ->> 'p2')::numeric, 0),
    coalesce((p_pricing_stub ->> 'p3')::numeric, 0), coalesce((p_pricing_stub ->> 'p4')::numeric, 0),
    coalesce((p_pricing_stub ->> 'p5')::numeric, 0), coalesce((p_pricing_stub ->> 'p6')::numeric, 0),
    coalesce((p_pricing_stub ->> 'p7')::numeric, 0), coalesce((p_pricing_stub ->> 'p8')::numeric, 0),
    coalesce((p_pricing_stub ->> 'p9')::numeric, 0), coalesce((p_pricing_stub ->> 'p10')::numeric, 0),
    coalesce((p_pricing_stub ->> 'c1')::numeric, 0), coalesce((p_pricing_stub ->> 'c2')::numeric, 0),
    coalesce((p_pricing_stub ->> 'c3')::numeric, 0), coalesce((p_pricing_stub ->> 'c4')::numeric, 0),
    coalesce((p_pricing_stub ->> 'c5')::numeric, 0), coalesce((p_pricing_stub ->> 'c6')::numeric, 0),
    coalesce((p_pricing_stub ->> 'c7')::numeric, 0), coalesce((p_pricing_stub ->> 'c8')::numeric, 0),
    coalesce((p_pricing_stub ->> 'c9')::numeric, 0), coalesce((p_pricing_stub ->> 'c10')::numeric, 0),
    coalesce((p_pricing_stub ->> 'incl_guide')::boolean, false),
    coalesce((p_pricing_stub ->> 'incl_transport')::boolean, false),
    coalesce((p_pricing_stub ->> 'incl_tickets')::boolean, false),
    coalesce((p_pricing_stub ->> 'incl_water')::boolean, false),
    coalesce((p_pricing_stub ->> 'incl_meals')::boolean, false)
  ) on conflict (product_code) do nothing;

  delete from public.product_photos where product_code = v_code;
  insert into public.product_photos (product_code, photo_id, sort_order, is_featured)
  select
    v_code, photo ->> 'photo_id', coalesce((photo ->> 'sort_order')::smallint, 0),
    coalesce((photo ->> 'is_featured')::boolean, false)
  from jsonb_array_elements(p_photo_links) as photo;
end;
$function$;

create or replace function public.save_attraction_aggregate(
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
  if jsonb_typeof(p_attraction) <> 'object'
     or coalesce(nullif(trim(v_id), ''), '') = ''
     or coalesce(nullif(trim(p_attraction ->> 'name'), ''), '') = ''
     or coalesce(nullif(trim(p_attraction ->> 'region'), ''), '') not in ('north', 'central', 'south')
     or coalesce(nullif(trim(p_attraction ->> 'type'), ''), '') = ''
     or coalesce(nullif(trim(p_attraction ->> 'dest'), ''), '') = '' then
    raise exception 'Attraction payload is invalid' using errcode = '22023';
  end if;
  if jsonb_typeof(p_photo_links) <> 'array' then
    raise exception 'Attraction photo links must be an array' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_photo_links) as photo
    where coalesce(nullif(trim(photo ->> 'photo_id'), ''), '') = ''
       or photo ->> 'attraction_id' <> v_id
  ) or exists (
    select 1 from jsonb_array_elements(p_photo_links) as photo
    group by photo ->> 'photo_id' having count(*) > 1
  ) then
    raise exception 'Attraction photo links must be unique and belong to the attraction' using errcode = '22023';
  end if;

  insert into public.attractions (
    id, region, type, name, dest, hours, closed, admission, duration,
    best_time, crowd, book_req, seasonal, notes, alert, phone
  ) values (
    v_id, p_attraction ->> 'region', p_attraction ->> 'type', p_attraction ->> 'name',
    p_attraction ->> 'dest', nullif(p_attraction ->> 'hours', ''),
    nullif(p_attraction ->> 'closed', ''), nullif(p_attraction ->> 'admission', ''),
    coalesce((p_attraction ->> 'duration')::smallint, 0),
    nullif(p_attraction ->> 'best_time', ''), nullif(p_attraction ->> 'crowd', ''),
    coalesce((p_attraction ->> 'book_req')::boolean, false),
    nullif(p_attraction ->> 'seasonal', ''), nullif(p_attraction ->> 'notes', ''),
    nullif(p_attraction ->> 'alert', ''), coalesce(p_attraction ->> 'phone', '')
  ) on conflict (id) do update set
    region = excluded.region, type = excluded.type, name = excluded.name,
    dest = excluded.dest, hours = excluded.hours, closed = excluded.closed,
    admission = excluded.admission, duration = excluded.duration,
    best_time = excluded.best_time, crowd = excluded.crowd,
    book_req = excluded.book_req, seasonal = excluded.seasonal, notes = excluded.notes,
    alert = excluded.alert, phone = excluded.phone, updated_at = now();

  delete from public.attraction_photos where attraction_id = v_id;
  insert into public.attraction_photos (attraction_id, photo_id, sort_order, is_featured)
  select
    v_id, photo ->> 'photo_id', coalesce((photo ->> 'sort_order')::smallint, 0),
    coalesce((photo ->> 'is_featured')::boolean, false)
  from jsonb_array_elements(p_photo_links) as photo;
end;
$function$;

revoke all on function public.save_product_aggregate(jsonb, jsonb, jsonb) from public;
grant execute on function public.save_product_aggregate(jsonb, jsonb, jsonb) to authenticated;
revoke all on function public.save_attraction_aggregate(jsonb, jsonb) from public;
grant execute on function public.save_attraction_aggregate(jsonb, jsonb) to authenticated;

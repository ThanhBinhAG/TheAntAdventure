create or replace function public.replace_product_catalogue_transaction(
  p_products jsonb,
  p_pricing_stubs jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $function$
begin
  if jsonb_typeof(p_products) <> 'array' or jsonb_typeof(p_pricing_stubs) <> 'array' then
    raise exception 'Product import payloads must be arrays' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_products) as product(
      code text, name text, logic text, duration text, category text,
      destination text, level text, description text, usp text,
      notes_to_sales text, price_from text, region text
    )
    where coalesce(nullif(trim(product.code), ''), '') = ''
       or coalesce(nullif(trim(product.name), ''), '') = ''
  ) then
    raise exception 'Every imported product requires a code and name' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_products) as product(code text)
    group by product.code
    having count(*) > 1
  ) then
    raise exception 'Imported product codes must be unique' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_pricing_stubs) as pricing(product_code text)
    where coalesce(nullif(trim(pricing.product_code), ''), '') = ''
  ) then
    raise exception 'Every pricing stub requires a product code' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_pricing_stubs) as pricing(product_code text)
    group by pricing.product_code
    having count(*) > 1
  ) then
    raise exception 'Imported pricing product codes must be unique' using errcode = '22023';
  end if;

  if (select count(*) from jsonb_to_recordset(p_products) as product(code text))
     <> (select count(*) from jsonb_to_recordset(p_pricing_stubs) as pricing(product_code text))
     or exists (
       select 1
       from jsonb_to_recordset(p_pricing_stubs) as pricing(product_code text)
       where not exists (
         select 1
         from jsonb_to_recordset(p_products) as product(code text)
         where product.code = pricing.product_code
       )
     ) then
    raise exception 'Each imported product must have exactly one pricing stub' using errcode = '22023';
  end if;

  -- Serialize full-catalogue replacements to prevent concurrent imports from interleaving.
  perform pg_advisory_xact_lock(hashtext('replace_product_catalogue_transaction'));

  delete from public.products;

  insert into public.products (
    code, name, logic, duration, category, destination, level, description,
    usp, notes_to_sales, price_from, region
  )
  select
    product.code, product.name, product.logic, product.duration, product.category,
    product.destination, product.level, product.description, product.usp,
    product.notes_to_sales, product.price_from, product.region
  from jsonb_to_recordset(p_products) as product(
    code text, name text, logic text, duration text, category text,
    destination text, level text, description text, usp text,
    notes_to_sales text, price_from text, region text
  );

  insert into public.product_pricing (
    product_code, std_cost, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10,
    c1, c2, c3, c4, c5, c6, c7, c8, c9, c10,
    incl_guide, incl_transport, incl_tickets, incl_water, incl_meals
  )
  select
    pricing.product_code, pricing.std_cost, pricing.p1, pricing.p2, pricing.p3,
    pricing.p4, pricing.p5, pricing.p6, pricing.p7, pricing.p8, pricing.p9,
    pricing.p10, pricing.c1, pricing.c2, pricing.c3, pricing.c4, pricing.c5,
    pricing.c6, pricing.c7, pricing.c8, pricing.c9, pricing.c10,
    pricing.incl_guide, pricing.incl_transport, pricing.incl_tickets,
    pricing.incl_water, pricing.incl_meals
  from jsonb_to_recordset(p_pricing_stubs) as pricing(
    product_code text, std_cost numeric, p1 numeric, p2 numeric, p3 numeric,
    p4 numeric, p5 numeric, p6 numeric, p7 numeric, p8 numeric, p9 numeric,
    p10 numeric, c1 numeric, c2 numeric, c3 numeric, c4 numeric, c5 numeric,
    c6 numeric, c7 numeric, c8 numeric, c9 numeric, c10 numeric,
    incl_guide boolean, incl_transport boolean, incl_tickets boolean,
    incl_water boolean, incl_meals boolean
  );
end;
$function$;

revoke all on function public.replace_product_catalogue_transaction(jsonb, jsonb) from public;
grant execute on function public.replace_product_catalogue_transaction(jsonb, jsonb) to authenticated;

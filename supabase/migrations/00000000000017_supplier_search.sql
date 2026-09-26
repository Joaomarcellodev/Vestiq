-- SPEC-011 — Fornecedores: a revendedora pesquisa os fornecedores (fábricas) das
-- redes em que é membro ativo e o catálogo deles (RF-SUP-001..004).
--
-- products / product_variants RLS stays org-only on purpose: a select policy
-- would expose the whole row, including the factory's cost_price and
-- stock_on_hand (RF-SUP-004). Access goes through the SECURITY DEFINER
-- functions below, which return only the public columns.

create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Search helpers (BR-SUP-04)
-- ---------------------------------------------------------------------------

-- Lower-case, accent-free text. The two-argument unaccent names its dictionary
-- explicitly because the function runs with an empty search_path.
create or replace function public.search_normalize(t text)
returns text
language sql
stable
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')));
$$;

-- True when every word of p_query appears in haystack (case/accent-insensitive).
-- strpos keeps %, _ and \ literal. An empty query matches everything.
create or replace function public.search_matches(haystack text, p_query text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(bool_and(strpos(public.search_normalize(haystack), tok) > 0), true)
  from unnest(regexp_split_to_array(public.search_normalize(btrim(p_query)), '\s+')) as tok
  where tok <> '';
$$;

-- ---------------------------------------------------------------------------
-- Suppliers visible to the current user (BR-SUP-01/02)
-- ---------------------------------------------------------------------------

create or replace function public.auth_supplier_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct fn.factory_id
  from public.factory_networks fn
  join public.organizations o on o.id = fn.factory_id
  where fn.id in (select public.auth_network_ids())
    and fn.status = 'ACTIVE'
    and o.status = 'ACTIVE'
    and o.type = 'FACTORY';
$$;

-- RF-SUP-001
create or replace function public.list_suppliers(p_query text default null)
returns table (
  id uuid,
  name text,
  network_names text[],
  product_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.id,
    o.name,
    array(
      select fn.name
      from public.factory_networks fn
      where fn.factory_id = o.id
        and fn.status = 'ACTIVE'
        and fn.id in (select public.auth_network_ids())
      order by fn.name
    ),
    (
      select count(*)::integer
      from public.products p
      where p.organization_id = o.id and p.archived_at is null
    )
  from public.organizations o
  where o.id in (select public.auth_supplier_ids())
    and public.search_matches(o.name, p_query)
  order by o.name;
$$;

-- RF-SUP-002 — BR-SUP-03/04/05/06/08
create or replace function public.search_supplier_products(
  p_query text default null,
  p_supplier_id uuid default null
)
returns table (
  id uuid,
  supplier_id uuid,
  supplier_name text,
  name text,
  brand text,
  category_name text,
  image_url text,
  min_order_quantity integer,
  size_grid text[],
  min_price numeric,
  max_price numeric,
  variant_count integer,
  in_stock boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    o.id,
    o.name,
    p.name,
    p.brand,
    c.name,
    p.image_urls[1],
    p.min_order_quantity,
    p.size_grid,
    v.min_price,
    v.max_price,
    coalesce(v.variant_count, 0),
    coalesce(v.in_stock, false)
  from public.products p
  join public.organizations o on o.id = p.organization_id
  left join public.categories c on c.id = p.category_id
  left join lateral (
    select
      min(pv.retail_price) filter (where pv.retail_price > 0) as min_price,
      max(pv.retail_price) filter (where pv.retail_price > 0) as max_price,
      count(*)::integer as variant_count,
      bool_or(pv.stock_on_hand > 0) as in_stock,
      string_agg(concat_ws(' ', pv.color, pv.size, pv.sku), ' ') as terms
    from public.product_variants pv
    where pv.product_id = p.id and pv.archived_at is null
  ) v on true
  where p.organization_id in (select public.auth_supplier_ids())
    and p.archived_at is null
    and (p_supplier_id is null or p.organization_id = p_supplier_id)
    and public.search_matches(
      concat_ws(' ', p.name, p.brand, p.description, p.internal_sku, c.name, o.name, v.terms),
      p_query
    )
  order by p.name, p.id
  limit 100;
$$;

-- RF-SUP-003
create or replace function public.get_supplier_product(p_product_id uuid)
returns table (
  id uuid,
  supplier_id uuid,
  supplier_name text,
  name text,
  brand text,
  description text,
  category_name text,
  image_urls text[],
  min_order_quantity integer,
  size_grid text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    o.id,
    o.name,
    p.name,
    p.brand,
    p.description,
    c.name,
    p.image_urls,
    p.min_order_quantity,
    p.size_grid
  from public.products p
  join public.organizations o on o.id = p.organization_id
  left join public.categories c on c.id = p.category_id
  where p.id = p_product_id
    and p.archived_at is null
    and p.organization_id in (select public.auth_supplier_ids());
$$;

-- RF-SUP-003 — ordered by the product's size grid, then colour.
create or replace function public.list_supplier_product_variants(p_product_id uuid)
returns table (
  id uuid,
  color text,
  size text,
  sku text,
  price numeric,
  in_stock boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select pv.id, pv.color, pv.size, pv.sku, pv.retail_price, pv.stock_on_hand > 0
  from public.product_variants pv
  join public.products p on p.id = pv.product_id
  where pv.product_id = p_product_id
    and pv.archived_at is null
    and p.archived_at is null
    and p.organization_id in (select public.auth_supplier_ids())
  order by array_position(p.size_grid, pv.size) nulls last, pv.color nulls first, pv.size, pv.id;
$$;

-- ---------------------------------------------------------------------------
-- Grants — signed-in users only
-- ---------------------------------------------------------------------------

revoke execute on function public.auth_supplier_ids() from public, anon;
revoke execute on function public.list_suppliers(text) from public, anon;
revoke execute on function public.search_supplier_products(text, uuid) from public, anon;
revoke execute on function public.get_supplier_product(uuid) from public, anon;
revoke execute on function public.list_supplier_product_variants(uuid) from public, anon;

grant execute on function public.auth_supplier_ids() to authenticated;
grant execute on function public.list_suppliers(text) to authenticated;
grant execute on function public.search_supplier_products(text, uuid) to authenticated;
grant execute on function public.get_supplier_product(uuid) to authenticated;
grant execute on function public.list_supplier_product_variants(uuid) to authenticated;

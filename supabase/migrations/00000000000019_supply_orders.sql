-- SPEC-012 — Pedidos de abastecimento: a revendedora compra direto de um
-- fornecedor das suas redes; a fábrica confirma ou recusa (RF-ORD-001..006).
-- Writes happen only through the transactional functions below (ADR-0004,
-- BR-ORD-08); the tables have select policies only.

create type public.supply_order_status as enum ('PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED');

create table public.supply_orders (
  id uuid primary key default gen_random_uuid(),
  reseller_id uuid not null references public.organizations (id) on delete cascade,
  supplier_id uuid not null references public.organizations (id) on delete cascade,
  status public.supply_order_status not null default 'PENDING',
  note text check (length(note) <= 1000),
  response_note text check (length(response_note) <= 1000),
  cancel_reason text check (length(cancel_reason) <= 1000),
  total_quantity integer not null check (total_quantity > 0),
  total_amount numeric(18, 2) not null check (total_amount >= 0),
  created_by uuid references public.profiles (id) on delete set null,
  responded_by uuid references public.profiles (id) on delete set null,
  responded_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reseller_id <> supplier_id)
);

create index supply_orders_reseller_idx on public.supply_orders (reseller_id, created_at desc);
create index supply_orders_supplier_idx on public.supply_orders (supplier_id, created_at desc);

create trigger supply_orders_set_updated_at
  before update on public.supply_orders
  for each row execute function public.set_updated_at();

-- BR-ORD-04: product/variant data is frozen on the item.
create table public.supply_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.supply_orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_name text not null,
  color text,
  size text,
  sku text,
  unit_price numeric(12, 2) not null check (unit_price > 0),
  quantity integer not null check (quantity between 1 and 100000),
  line_total numeric(18, 2) generated always as (unit_price * quantity) stored,
  created_at timestamptz not null default now(),
  unique (order_id, variant_id)
);

create index supply_order_items_order_idx on public.supply_order_items (order_id);

-- ---------------------------------------------------------------------------
-- RLS — both parties read; nobody writes directly (BR-ORD-08)
-- ---------------------------------------------------------------------------
alter table public.supply_orders enable row level security;

create policy supply_orders_select on public.supply_orders
  for select using (public.is_org_member(reseller_id) or public.is_org_member(supplier_id));

alter table public.supply_order_items enable row level security;

create policy supply_order_items_select on public.supply_order_items
  for select using (
    -- the order's own select policy decides
    exists (select 1 from public.supply_orders o where o.id = supply_order_items.order_id)
  );

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- BR-ORD-01: the supplier has this reseller as an ACTIVE member of an active network.
create or replace function public.is_supplier_of(p_supplier_id uuid, p_reseller_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.factory_networks fn
    join public.network_members nm on nm.network_id = fn.id
    join public.organizations f on f.id = fn.factory_id
    where fn.factory_id = p_supplier_id
      and nm.reseller_id = p_reseller_id
      and nm.status = 'ACTIVE'
      and fn.status = 'ACTIVE'
      and f.status = 'ACTIVE'
      and f.type = 'FACTORY'
  );
$$;

-- Catalog for the order form: one row per active variant of an active product.
-- Public columns only, like the SPEC-011 functions.
create or replace function public.list_supplier_order_catalog(p_supplier_id uuid)
returns table (
  product_id uuid,
  product_name text,
  brand text,
  image_url text,
  min_order_quantity integer,
  size_grid text[],
  variant_id uuid,
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
  select
    p.id,
    p.name,
    p.brand,
    p.image_urls[1],
    p.min_order_quantity,
    p.size_grid,
    pv.id,
    pv.color,
    pv.size,
    pv.sku,
    pv.retail_price,
    pv.stock_on_hand > 0
  from public.products p
  join public.product_variants pv on pv.product_id = p.id
  where p.organization_id = p_supplier_id
    and p_supplier_id in (select public.auth_supplier_ids())
    and p.archived_at is null
    and pv.archived_at is null
  order by
    p.name,
    p.id,
    pv.color nulls first,
    array_position(p.size_grid, pv.size) nulls last,
    pv.size,
    pv.id;
$$;

-- ---------------------------------------------------------------------------
-- place_supply_order — RF-ORD-001/002, BR-ORD-01..05/07/09
-- p_items: [{ "variant_id": uuid, "quantity": int }, ...]
-- ---------------------------------------------------------------------------
create or replace function public.place_supply_order(
  p_reseller_id uuid,
  p_supplier_id uuid,
  p_items jsonb,
  p_note text default null
)
returns public.supply_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_req jsonb;
  v_found integer;
  v_wanted integer;
  v_name text;
  v_min integer;
  v_order public.supply_orders;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_org_member(p_reseller_id)
     or (select type from public.organizations where id = p_reseller_id) is distinct from 'RESELLER' then
    raise exception 'not authorized';
  end if;
  if not public.is_supplier_of(p_supplier_id, p_reseller_id) then
    raise exception 'Fornecedor indisponível';
  end if;
  if length(coalesce(p_note, '')) > 1000 then
    raise exception 'A observação pode ter até 1.000 caracteres';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione ao menos um item';
  end if;

  -- Shape check before any cast (CASE guarantees evaluation order).
  if exists (
    select 1
    from jsonb_array_elements(p_items) as e
    where case
      when jsonb_typeof(e) <> 'object' then true
      when coalesce(e ->> 'variant_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then true
      when jsonb_typeof(e -> 'quantity') <> 'number' then true
      when (e ->> 'quantity')::numeric <> trunc((e ->> 'quantity')::numeric) then true
      else (e ->> 'quantity')::numeric not between 1 and 100000
    end
  ) then
    raise exception 'Quantidade inválida no item';
  end if;

  -- BR-ORD-02: the same variant twice is summed.
  select jsonb_agg(jsonb_build_object('variant_id', r.variant_id, 'quantity', r.quantity))
  into v_req
  from (
    select (e ->> 'variant_id')::uuid as variant_id, sum((e ->> 'quantity')::integer) as quantity
    from jsonb_array_elements(p_items) as e
    group by 1
  ) r;

  v_wanted := jsonb_array_length(v_req);
  if v_wanted > 200 then
    raise exception 'O pedido pode ter até 200 variações';
  end if;
  if exists (select 1 from jsonb_to_recordset(v_req) as r(variant_id uuid, quantity integer)
             where r.quantity > 100000) then
    raise exception 'Quantidade inválida no item';
  end if;

  select count(*) into v_found
  from jsonb_to_recordset(v_req) as r(variant_id uuid, quantity integer)
  join public.product_variants pv on pv.id = r.variant_id
  join public.products p on p.id = pv.product_id
  where pv.organization_id = p_supplier_id
    and pv.archived_at is null
    and p.archived_at is null;
  if v_found <> v_wanted then
    raise exception 'Item indisponível';
  end if;

  select p.name into v_name
  from jsonb_to_recordset(v_req) as r(variant_id uuid, quantity integer)
  join public.product_variants pv on pv.id = r.variant_id
  join public.products p on p.id = pv.product_id
  where pv.retail_price <= 0
  order by p.name
  limit 1;
  if v_name is not null then
    raise exception 'Item sem preço definido: %', v_name;
  end if;

  -- BR-ORD-03: minimum order per product, over all its variants.
  select p.name, p.min_order_quantity into v_name, v_min
  from jsonb_to_recordset(v_req) as r(variant_id uuid, quantity integer)
  join public.product_variants pv on pv.id = r.variant_id
  join public.products p on p.id = pv.product_id
  group by p.id, p.name, p.min_order_quantity
  having sum(r.quantity) < p.min_order_quantity
  order by p.name
  limit 1;
  if v_name is not null then
    raise exception 'Pedido mínimo de % peças para %', v_min, v_name;
  end if;

  insert into public.supply_orders (
    reseller_id, supplier_id, status, note, total_quantity, total_amount, created_by
  )
  select
    p_reseller_id,
    p_supplier_id,
    'PENDING',
    nullif(btrim(p_note), ''),
    sum(r.quantity),
    sum(pv.retail_price * r.quantity),
    v_user
  from jsonb_to_recordset(v_req) as r(variant_id uuid, quantity integer)
  join public.product_variants pv on pv.id = r.variant_id
  returning * into v_order;

  insert into public.supply_order_items (
    order_id, product_id, variant_id, product_name, color, size, sku, unit_price, quantity
  )
  select v_order.id, p.id, pv.id, p.name, pv.color, pv.size, pv.sku, pv.retail_price, r.quantity
  from jsonb_to_recordset(v_req) as r(variant_id uuid, quantity integer)
  join public.product_variants pv on pv.id = r.variant_id
  join public.products p on p.id = pv.product_id;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- respond_supply_order — RF-ORD-004 (supplier admin only)
-- ---------------------------------------------------------------------------
create or replace function public.respond_supply_order(
  p_order_id uuid,
  p_decision text,
  p_note text default null
)
returns public.supply_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.supply_orders;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_order from public.supply_orders where id = p_order_id for update;
  if not found or not public.has_org_role(
    v_order.supplier_id,
    array['FACTORY_ADMIN', 'PLATFORM_ADMIN']::public.member_role[]
  ) then
    raise exception 'not authorized';
  end if;
  if p_decision not in ('confirm', 'reject') then
    raise exception 'Ação inválida';
  end if;
  if v_order.status <> 'PENDING' then
    raise exception 'Este pedido não está mais pendente';
  end if;
  if length(coalesce(p_note, '')) > 1000 then
    raise exception 'A justificativa pode ter até 1.000 caracteres';
  end if;

  update public.supply_orders
  set status = case p_decision when 'confirm' then 'CONFIRMED' else 'REJECTED' end::public.supply_order_status,
      response_note = nullif(btrim(p_note), ''),
      responded_by = v_user,
      responded_at = now()
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_supply_order — RF-ORD-005 (reseller only, while pending)
-- ---------------------------------------------------------------------------
create or replace function public.cancel_supply_order(
  p_order_id uuid,
  p_reason text default null
)
returns public.supply_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.supply_orders;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_order from public.supply_orders where id = p_order_id for update;
  if not found or not public.is_org_member(v_order.reseller_id) then
    raise exception 'not authorized';
  end if;
  if v_order.status <> 'PENDING' then
    raise exception 'Este pedido não está mais pendente';
  end if;
  if length(coalesce(p_reason, '')) > 1000 then
    raise exception 'O motivo pode ter até 1.000 caracteres';
  end if;

  update public.supply_orders
  set status = 'CANCELLED',
      cancel_reason = nullif(btrim(p_reason), ''),
      cancelled_at = now()
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications — RF-ORD-006
-- ---------------------------------------------------------------------------
create or replace function public.notify_supply_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reseller text;
  v_supplier text;
  v_pieces text := new.total_quantity || case when new.total_quantity = 1 then ' peça' else ' peças' end;
  v_link text := '/pedidos/' || new.id;
begin
  select name into v_reseller from public.organizations where id = new.reseller_id;
  select name into v_supplier from public.organizations where id = new.supplier_id;

  if tg_op = 'INSERT' then
    insert into public.notifications (organization_id, type, title, body, link)
    values (
      new.supplier_id,
      'SUPPLY_ORDER_PLACED',
      'Novo pedido de abastecimento',
      coalesce(v_reseller, 'Uma revendedora') || ' · ' || v_pieces,
      v_link
    );
  elsif new.status is distinct from old.status then
    if new.status = 'CONFIRMED' then
      insert into public.notifications (organization_id, type, title, body, link)
      values (new.reseller_id, 'SUPPLY_ORDER_CONFIRMED', 'Pedido confirmado',
              coalesce(v_supplier, 'O fornecedor') || ' confirmou seu pedido de ' || v_pieces, v_link);
    elsif new.status = 'REJECTED' then
      insert into public.notifications (organization_id, type, title, body, link)
      values (new.reseller_id, 'SUPPLY_ORDER_REJECTED', 'Pedido recusado',
              coalesce(v_supplier, 'O fornecedor') || ' recusou seu pedido de ' || v_pieces, v_link);
    elsif new.status = 'CANCELLED' then
      insert into public.notifications (organization_id, type, title, body, link)
      values (new.supplier_id, 'SUPPLY_ORDER_CANCELLED', 'Pedido cancelado',
              coalesce(v_reseller, 'A revendedora') || ' cancelou o pedido de ' || v_pieces, v_link);
    end if;
  end if;

  return new;
end;
$$;

create trigger supply_orders_notify
  after insert or update of status on public.supply_orders
  for each row execute function public.notify_supply_order();

-- ---------------------------------------------------------------------------
-- Grants — signed-in users only; the helper is internal
-- ---------------------------------------------------------------------------
revoke execute on function public.is_supplier_of(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.notify_supply_order() from public, anon, authenticated;
revoke execute on function public.list_supplier_order_catalog(uuid) from public, anon;
revoke execute on function public.place_supply_order(uuid, uuid, jsonb, text) from public, anon;
revoke execute on function public.respond_supply_order(uuid, text, text) from public, anon;
revoke execute on function public.cancel_supply_order(uuid, text) from public, anon;

grant execute on function public.list_supplier_order_catalog(uuid) to authenticated;
grant execute on function public.place_supply_order(uuid, uuid, jsonb, text) to authenticated;
grant execute on function public.respond_supply_order(uuid, text, text) to authenticated;
grant execute on function public.cancel_supply_order(uuid, text) to authenticated;

-- SPEC-007 — Sales + sale items + transactional RPCs (ADR-0004).

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  status public.sale_status not null default 'CONFIRMED',
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  total numeric(12, 2) not null check (total >= 0),
  payment_method public.payment_method not null,
  sold_by uuid references public.profiles (id),
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sales_org_idx on public.sales (organization_id, created_at desc);
create index sales_customer_idx on public.sales (customer_id);

create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_variant_id uuid not null references public.product_variants (id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0)
);

create index sale_items_sale_idx on public.sale_items (sale_id);

alter table public.sales enable row level security;
create policy sales_select on public.sales
  for select using (public.is_org_member(organization_id));

alter table public.sale_items enable row level security;
create policy sale_items_select on public.sale_items
  for select using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- confirm_sale — RF-SALE-001..007, atomic
-- p_items: jsonb array of { variant_id, quantity }
-- ---------------------------------------------------------------------------
create or replace function public.confirm_sale(
  p_customer_id uuid,
  p_payment_method public.payment_method,
  p_discount numeric,
  p_items jsonb
)
returns public.sales
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_org uuid;
  v_item jsonb;
  v_variant public.product_variants%rowtype;
  v_qty integer;
  v_subtotal numeric(12,2) := 0;
  v_discount numeric(12,2) := coalesce(p_discount, 0);
  v_sale public.sales;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Adicione ao menos um item';
  end if;

  -- Resolve org from the first variant and validate membership.
  select organization_id into v_org from public.product_variants
  where id = (p_items -> 0 ->> 'variant_id')::uuid;
  if v_org is null or not public.is_org_member(v_org) then
    raise exception 'not authorized';
  end if;

  insert into public.sales (organization_id, customer_id, status, subtotal, discount, total, payment_method, sold_by)
  values (v_org, p_customer_id, 'CONFIRMED', 0, v_discount, 0, p_payment_method, v_user)
  returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Quantidade inválida no item';
    end if;

    select * into v_variant from public.product_variants
    where id = (v_item ->> 'variant_id')::uuid for update;
    if not found or v_variant.organization_id <> v_org then
      raise exception 'Item inválido';
    end if;
    if v_variant.archived_at is not null then
      raise exception 'Produto indisponível';
    end if;
    if v_variant.stock_on_hand < v_qty then
      raise exception 'Estoque insuficiente para % (disponível %)',
        (select name from public.products where id = v_variant.product_id), v_variant.stock_on_hand;
    end if;

    insert into public.sale_items (sale_id, organization_id, product_variant_id, quantity, unit_price, line_total)
    values (v_sale.id, v_org, v_variant.id, v_qty, v_variant.retail_price, v_variant.retail_price * v_qty);

    v_subtotal := v_subtotal + (v_variant.retail_price * v_qty);

    perform public.apply_inventory_movement(v_variant.id, 'VENDA', -v_qty, 'sale', v_sale.id, null);
  end loop;

  if v_discount > v_subtotal then
    raise exception 'Desconto maior que o subtotal';
  end if;

  update public.sales
  set subtotal = v_subtotal, total = v_subtotal - v_discount
  where id = v_sale.id
  returning * into v_sale;

  return v_sale;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_sale — RF-SALE-008/009, atomic
-- ---------------------------------------------------------------------------
create or replace function public.cancel_sale(p_sale_id uuid, p_reason text)
returns public.sales
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.sales;
  v_item public.sale_items%rowtype;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found or not public.is_org_member(v_sale.organization_id) then
    raise exception 'not authorized';
  end if;
  if v_sale.status = 'CANCELLED' then
    raise exception 'Venda já cancelada';
  end if;

  for v_item in select * from public.sale_items where sale_id = p_sale_id
  loop
    perform public.apply_inventory_movement(
      v_item.product_variant_id, 'CANCELAMENTO', v_item.quantity, 'sale', v_sale.id, p_reason
    );
  end loop;

  update public.sales
  set status = 'CANCELLED', cancelled_at = now(), cancel_reason = p_reason
  where id = p_sale_id
  returning * into v_sale;

  return v_sale;
end;
$$;

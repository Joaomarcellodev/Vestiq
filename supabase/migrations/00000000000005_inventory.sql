-- SPEC-005 — Inventory movements (append-only ledger) + RPCs.
-- ADR-0004 (transactional functions), ADR-0005 (balance from movements).

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_variant_id uuid not null references public.product_variants (id) on delete cascade,
  type public.inventory_movement_type not null,
  quantity integer not null check (quantity <> 0),
  balance_after integer not null check (balance_after >= 0),
  reference_type text,
  reference_id uuid,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index inventory_movements_variant_idx
  on public.inventory_movements (product_variant_id, created_at desc);
create index inventory_movements_org_idx on public.inventory_movements (organization_id);

alter table public.inventory_movements enable row level security;

-- RF-INV-006: read-only from the client; writes only through SECURITY DEFINER RPCs.
create policy inventory_movements_select on public.inventory_movements
  for select using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Core: apply a movement atomically (updates cache + writes ledger row).
-- Not exposed directly; used by the RPCs below and by sales/negotiations.
-- ---------------------------------------------------------------------------
create or replace function public.apply_inventory_movement(
  p_variant_id uuid,
  p_type public.inventory_movement_type,
  p_quantity integer,           -- signed: >0 in, <0 out
  p_reference_type text,
  p_reference_id uuid,
  p_note text
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_variant public.product_variants%rowtype;
  v_new_balance integer;
  v_row public.inventory_movements;
begin
  select * into v_variant from public.product_variants where id = p_variant_id for update;
  if not found then
    raise exception 'Variação não encontrada';
  end if;

  v_new_balance := v_variant.stock_on_hand + p_quantity;
  if v_new_balance < 0 then
    raise exception 'Estoque insuficiente: saldo atual %', v_variant.stock_on_hand
      using errcode = 'check_violation';
  end if;

  update public.product_variants
  set stock_on_hand = v_new_balance
  where id = p_variant_id;

  insert into public.inventory_movements (
    organization_id, product_variant_id, type, quantity, balance_after,
    reference_type, reference_id, note, created_by
  )
  values (
    v_variant.organization_id, p_variant_id, p_type, p_quantity, v_new_balance,
    p_reference_type, p_reference_id, p_note, (select auth.uid())
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- RF-INV-002: manual stock entry.
create or replace function public.record_inventory_entry(
  p_variant_id uuid,
  p_quantity integer,
  p_note text default null
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_org_member((select organization_id from public.product_variants where id = p_variant_id)) then
    raise exception 'not authorized';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantidade de entrada deve ser maior que zero';
  end if;
  return public.apply_inventory_movement(p_variant_id, 'ENTRADA', p_quantity, 'manual', null, p_note);
end;
$$;

-- RF-INV-002 / RF-INV-005: adjustment (signed delta), reason required.
create or replace function public.adjust_inventory(
  p_variant_id uuid,
  p_delta integer,
  p_note text
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_org_member((select organization_id from public.product_variants where id = p_variant_id)) then
    raise exception 'not authorized';
  end if;
  if p_delta is null or p_delta = 0 then
    raise exception 'Informe uma quantidade de ajuste diferente de zero';
  end if;
  if p_note is null or length(trim(p_note)) = 0 then
    raise exception 'Informe o motivo do ajuste';
  end if;
  return public.apply_inventory_movement(p_variant_id, 'AJUSTE', p_delta, 'manual', null, p_note);
end;
$$;

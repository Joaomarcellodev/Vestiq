-- SPEC-009 — Negotiations, events, state machine, transactional completion.
-- ADR-0004 (transactional), ADR-0007 (events not realtime).

create table public.negotiations (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  network_id uuid not null references public.factory_networks (id) on delete cascade,
  seller_org_id uuid not null references public.organizations (id) on delete cascade,
  buyer_org_id uuid not null references public.organizations (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  amount numeric(12, 2) not null check (amount > 0),
  status public.negotiation_status not null default 'PENDING',
  created_by uuid references public.profiles (id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (seller_org_id <> buyer_org_id)
);

create index negotiations_seller_idx on public.negotiations (seller_org_id, status);
create index negotiations_buyer_idx on public.negotiations (buyer_org_id, status);
create index negotiations_offer_idx on public.negotiations (offer_id);

create trigger negotiations_set_updated_at
  before update on public.negotiations
  for each row execute function public.set_updated_at();

create table public.negotiation_events (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid not null references public.negotiations (id) on delete cascade,
  type public.negotiation_event_type not null,
  body text,
  payload jsonb,
  actor_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index negotiation_events_negotiation_idx
  on public.negotiation_events (negotiation_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS — only the two parties see a negotiation and its events
-- ---------------------------------------------------------------------------
create or replace function public.can_access_negotiation(neg_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.negotiations n
    where n.id = neg_id
      and (public.is_org_member(n.seller_org_id) or public.is_org_member(n.buyer_org_id))
  );
$$;

alter table public.negotiations enable row level security;
create policy negotiations_select on public.negotiations
  for select using (
    public.is_org_member(seller_org_id) or public.is_org_member(buyer_org_id)
  );

alter table public.negotiation_events enable row level security;
create policy negotiation_events_select on public.negotiation_events
  for select using (public.can_access_negotiation(negotiation_id));

-- ---------------------------------------------------------------------------
-- open_negotiation — RF-NEG-001/002
-- ---------------------------------------------------------------------------
create or replace function public.open_negotiation(
  p_offer_id uuid,
  p_quantity integer,
  p_amount numeric,
  p_message text default null
)
returns public.negotiations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_offer public.offers%rowtype;
  v_buyer uuid;
  v_neg public.negotiations;
begin
  select * into v_offer from public.offers where id = p_offer_id;
  if not found then raise exception 'Oferta não encontrada'; end if;
  if v_offer.status not in ('ACTIVE', 'PARTIALLY_NEGOTIATED') then
    raise exception 'Oferta indisponível';
  end if;

  select nm.reseller_id into v_buyer
  from public.network_members nm
  where nm.network_id = v_offer.network_id
    and nm.reseller_id in (select public.auth_org_ids())
    and nm.status = 'ACTIVE'
  limit 1;

  if v_buyer is null then raise exception 'Você não participa desta rede'; end if;
  if v_buyer = v_offer.organization_id then raise exception 'Você é a dona desta oferta'; end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity > v_offer.quantity_remaining then
    raise exception 'Quantidade indisponível (restam %)', v_offer.quantity_remaining;
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Informe um valor válido'; end if;

  insert into public.negotiations (
    offer_id, network_id, seller_org_id, buyer_org_id, quantity, amount, status, created_by
  )
  values (
    p_offer_id, v_offer.network_id, v_offer.organization_id, v_buyer,
    p_quantity, p_amount, 'PENDING', (select auth.uid())
  )
  returning * into v_neg;

  insert into public.negotiation_events (negotiation_id, type, body, actor_id)
  values (v_neg.id, 'CREATED', p_message, (select auth.uid()));

  return v_neg;
end;
$$;

-- ---------------------------------------------------------------------------
-- negotiation_transition — RF-NEG-003/004/005/006 (state machine guard)
-- actions: 'accept' | 'reject' | 'cancel' | 'message'
-- ---------------------------------------------------------------------------
create or replace function public.negotiation_transition(
  p_negotiation_id uuid,
  p_action text,
  p_message text default null
)
returns public.negotiations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_neg public.negotiations;
  v_is_seller boolean;
  v_is_buyer boolean;
  v_new public.negotiation_status;
  v_event public.negotiation_event_type;
begin
  select * into v_neg from public.negotiations where id = p_negotiation_id for update;
  if not found then raise exception 'Negociação não encontrada'; end if;

  v_is_seller := public.is_org_member(v_neg.seller_org_id);
  v_is_buyer := public.is_org_member(v_neg.buyer_org_id);
  if not (v_is_seller or v_is_buyer) then raise exception 'not authorized'; end if;

  if p_action = 'message' then
    if v_neg.status in ('REJECTED', 'CANCELLED', 'COMPLETED') then
      raise exception 'Negociação encerrada';
    end if;
    insert into public.negotiation_events (negotiation_id, type, body, actor_id)
    values (p_negotiation_id, 'MESSAGE', p_message, (select auth.uid()));
    return v_neg;
  end if;

  if p_action = 'accept' then
    if v_neg.status <> 'PENDING' or not v_is_seller then raise exception 'Ação inválida'; end if;
    v_new := 'ACCEPTED'; v_event := 'ACCEPTED';
  elsif p_action = 'reject' then
    if v_neg.status <> 'PENDING' or not v_is_seller then raise exception 'Ação inválida'; end if;
    v_new := 'REJECTED'; v_event := 'REJECTED';
  elsif p_action = 'cancel' then
    if v_neg.status = 'PENDING' and not v_is_buyer then raise exception 'Ação inválida'; end if;
    if v_neg.status not in ('PENDING', 'ACCEPTED') then raise exception 'Ação inválida'; end if;
    v_new := 'CANCELLED'; v_event := 'CANCELLED';
  else
    raise exception 'Ação desconhecida: %', p_action;
  end if;

  update public.negotiations set status = v_new where id = p_negotiation_id
  returning * into v_neg;

  insert into public.negotiation_events (negotiation_id, type, body, actor_id)
  values (p_negotiation_id, v_event, p_message, (select auth.uid()));

  return v_neg;
end;
$$;

-- ---------------------------------------------------------------------------
-- complete_negotiation — RF-NEG-006/007/008, fully transactional
-- ---------------------------------------------------------------------------
create or replace function public.complete_negotiation(p_negotiation_id uuid)
returns public.negotiations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_neg public.negotiations;
  v_offer public.offers%rowtype;
  v_src_variant public.product_variants%rowtype;
  v_src_product public.products%rowtype;
  v_dst_product_id uuid;
  v_dst_variant_id uuid;
begin
  select * into v_neg from public.negotiations where id = p_negotiation_id for update;
  if not found then raise exception 'Negociação não encontrada'; end if;
  if not public.is_org_member(v_neg.seller_org_id) then
    raise exception 'Apenas a vendedora conclui a negociação';
  end if;
  if v_neg.status <> 'ACCEPTED' then
    raise exception 'A negociação precisa estar aceita';
  end if;

  select * into v_offer from public.offers where id = v_neg.offer_id for update;
  select * into v_src_variant from public.product_variants where id = v_offer.product_variant_id for update;
  select * into v_src_product from public.products where id = v_src_variant.product_id;

  if v_src_variant.stock_on_hand < v_neg.quantity then
    raise exception 'Estoque insuficiente na origem';
  end if;

  -- Source: outbound transfer.
  perform public.apply_inventory_movement(
    v_src_variant.id, 'TRANSFERENCIA_SAIDA', -v_neg.quantity, 'negotiation', v_neg.id, null
  );

  -- Destination: find-or-create "Recebido via rede" product + matching variant.
  select id into v_dst_product_id from public.products
  where organization_id = v_neg.buyer_org_id
    and name = v_src_product.name
    and coalesce(brand, '') = coalesce(v_src_product.brand, '')
  limit 1;

  if v_dst_product_id is null then
    insert into public.products (organization_id, name, brand, description)
    values (v_neg.buyer_org_id, v_src_product.name, v_src_product.brand, v_src_product.description)
    returning id into v_dst_product_id;
  end if;

  select id into v_dst_variant_id from public.product_variants
  where product_id = v_dst_product_id
    and coalesce(size, '') = coalesce(v_src_variant.size, '')
    and coalesce(color, '') = coalesce(v_src_variant.color, '')
  limit 1;

  if v_dst_variant_id is null then
    insert into public.product_variants (
      organization_id, product_id, size, color, cost_price, retail_price, stock_on_hand
    )
    values (
      v_neg.buyer_org_id, v_dst_product_id, v_src_variant.size, v_src_variant.color,
      round(v_neg.amount / v_neg.quantity, 2), v_src_variant.retail_price, 0
    )
    returning id into v_dst_variant_id;
  end if;

  perform public.apply_inventory_movement(
    v_dst_variant_id, 'TRANSFERENCIA_ENTRADA', v_neg.quantity, 'negotiation', v_neg.id, null
  );

  -- Update the offer.
  update public.offers
  set quantity_remaining = quantity_remaining - v_neg.quantity,
      status = case
        when quantity_remaining - v_neg.quantity <= 0 then 'FULFILLED'
        else 'PARTIALLY_NEGOTIATED'
      end
  where id = v_offer.id;

  update public.negotiations
  set status = 'COMPLETED', completed_at = now()
  where id = p_negotiation_id
  returning * into v_neg;

  insert into public.negotiation_events (negotiation_id, type, actor_id)
  values (p_negotiation_id, 'COMPLETED', (select auth.uid()));

  return v_neg;
end;
$$;

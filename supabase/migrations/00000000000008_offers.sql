-- SPEC-008 — Network offers (private marketplace).

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  network_id uuid not null references public.factory_networks (id) on delete cascade,
  product_variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity_offered integer not null check (quantity_offered > 0),
  quantity_remaining integer not null check (quantity_remaining >= 0),
  transfer_price numeric(12, 2) not null check (transfer_price >= 0),
  note text,
  status public.offer_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (quantity_remaining <= quantity_offered)
);

create index offers_network_active_idx on public.offers (network_id, status)
  where status in ('ACTIVE', 'PARTIALLY_NEGOTIATED');
create index offers_org_idx on public.offers (organization_id);

create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

alter table public.offers enable row level security;

-- RF-OFFER-004/005 + SDD §8: owner sees all; network peers see only active offers
-- of the SAME network. No other data crosses the boundary.
create policy offers_select on public.offers
  for select using (
    public.is_org_member(organization_id)
    or (
      status in ('ACTIVE', 'PARTIALLY_NEGOTIATED')
      and network_id in (select public.auth_network_ids())
    )
  );

create policy offers_write_owner on public.offers
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- publish_offer — RF-OFFER-001/002/003
-- ---------------------------------------------------------------------------
create or replace function public.publish_offer(
  p_variant_id uuid,
  p_network_id uuid,
  p_quantity integer,
  p_transfer_price numeric,
  p_note text default null
)
returns public.offers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_variant public.product_variants%rowtype;
  v_offer public.offers;
begin
  select * into v_variant from public.product_variants where id = p_variant_id;
  if not found or not public.is_org_member(v_variant.organization_id) then
    raise exception 'not authorized';
  end if;
  if v_variant.archived_at is not null then
    raise exception 'Produto indisponível';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantidade inválida';
  end if;
  if p_quantity > v_variant.stock_on_hand then
    raise exception 'Você tem apenas % em estoque', v_variant.stock_on_hand;
  end if;
  if not exists (
    select 1 from public.network_members nm
    where nm.network_id = p_network_id
      and nm.reseller_id = v_variant.organization_id
      and nm.status = 'ACTIVE'
  ) then
    raise exception 'Você não participa desta rede';
  end if;

  insert into public.offers (
    organization_id, network_id, product_variant_id,
    quantity_offered, quantity_remaining, transfer_price, note, status
  )
  values (
    v_variant.organization_id, p_network_id, p_variant_id,
    p_quantity, p_quantity, p_transfer_price, p_note, 'ACTIVE'
  )
  returning * into v_offer;

  return v_offer;
end;
$$;

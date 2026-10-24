-- VES-89 (RF-OFFER-009) — the owner edits an open offer's transfer price,
-- quantity and note instead of cancelling and publishing it again.
--
-- * Only while no negotiation is in progress (PENDING or ACCEPTED): a proposal
--   was made on the price and quantity the buyer saw.
-- * `p_quantity` is what stays available (`quantity_remaining`); what was
--   already transferred keeps counting in `quantity_offered`. Growing it only
--   fits in the free stock — the offers_assert_free_stock trigger
--   (migration 0029) checks that.
-- * `edited_at` records the change and is shown on the offer and in the feed.
--
-- Messages avoid ":" — the action layer strips everything up to the first one.

alter table public.offers add column edited_at timestamptz;

create or replace function public.update_offer(
  p_offer_id uuid,
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
  v_offer public.offers%rowtype;
begin
  select * into v_offer from public.offers where id = p_offer_id for update;
  if not found or not public.is_org_member(v_offer.organization_id) then
    raise exception 'not authorized';
  end if;
  if v_offer.status not in ('ACTIVE', 'PARTIALLY_NEGOTIATED') then
    raise exception 'Esta oferta não está mais ativa';
  end if;
  if exists (
    select 1 from public.negotiations n
    where n.offer_id = p_offer_id and n.status in ('PENDING', 'ACCEPTED')
  ) then
    raise exception 'Esta oferta tem negociação em andamento — responda ou conclua antes de editar'
      using errcode = 'check_violation';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantidade inválida' using errcode = 'check_violation';
  end if;
  if p_transfer_price is null or p_transfer_price < 0 then
    raise exception 'Preço inválido' using errcode = 'check_violation';
  end if;

  update public.offers
  set quantity_offered = quantity_offered - quantity_remaining + p_quantity,
      quantity_remaining = p_quantity,
      transfer_price = p_transfer_price,
      note = nullif(btrim(coalesce(p_note, '')), ''),
      edited_at = now()
  where id = p_offer_id
  returning * into v_offer;

  return v_offer;
end;
$$;

revoke execute on function public.update_offer(uuid, integer, numeric, text) from public, anon;
grant execute on function public.update_offer(uuid, integer, numeric, text) to authenticated;

-- Same projection as 0026, plus `edited_at`.
drop function public.list_visible_offers(uuid);

create function public.list_visible_offers(p_offer_id uuid default null)
returns table (
  id uuid,
  organization_id uuid,
  network_id uuid,
  seller_name text,
  status public.offer_status,
  quantity_remaining integer,
  transfer_price numeric,
  note text,
  created_at timestamptz,
  product_name text,
  brand text,
  description text,
  color text,
  size text,
  image_urls text[],
  edited_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.id,
    o.organization_id,
    o.network_id,
    org.name,
    o.status,
    o.quantity_remaining,
    o.transfer_price,
    o.note,
    o.created_at,
    p.name,
    p.brand,
    p.description,
    v.color,
    v.size,
    case when cardinality(o.image_urls) > 0 then o.image_urls else p.image_urls end,
    o.edited_at
  from public.offers o
  join public.organizations org on org.id = o.organization_id
  join public.product_variants v on v.id = o.product_variant_id
  join public.products p on p.id = v.product_id
  where (p_offer_id is null or o.id = p_offer_id)
    -- same rule as the offers_select policy (migration 0008)
    and (
      public.is_org_member(o.organization_id)
      or (
        o.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED')
        and o.network_id in (select public.auth_network_ids())
      )
    )
  order by o.created_at desc;
$$;

revoke execute on function public.list_visible_offers(uuid) from public, anon;
grant execute on function public.list_visible_offers(uuid) to authenticated;

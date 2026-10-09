-- VES-73 — offers and accepted negotiations never promise more stock than the
-- reseller has (BR-OFFER-11/12, BR-NEG-13/14).
--
-- Per variant the rule is a chain of reservations:
--
--   accepted negotiations  ≤  open offers  ≤  stock_on_hand
--
-- * "Open offers" = sum(quantity_remaining) of the variant's ACTIVE and
--   PARTIALLY_NEGOTIATED offers. A new or grown open offer only fits in the
--   FREE stock (stock_on_hand − the other open offers). Enforced by a trigger
--   on `offers`, so publish_offer, archive_product_to_offers and a direct
--   update allowed by the owner RLS policy all obey it. The trigger locks the
--   variant row, which serialises two concurrent publishes of the same variant.
-- * Accepting a negotiation reserves its quantity inside the offer: the
--   accepted negotiations of an offer can't add up to more than its
--   quantity_remaining (the offer only shrinks when the transfer completes).
--   Pending negotiations reserve nothing — the seller may get several
--   proposals and accept only the ones that fit.
-- * Stock leaving the variant (local sale, adjustment, transfer) may not go
--   below what accepted negotiations reserve, and open offers that no longer
--   fit are reduced, newest first, never below their own accepted
--   reservations; an offer that reaches 0 is cancelled.
--
-- complete_negotiation now takes the negotiation and the offer out of the
-- reservation before moving the stock, so its own outbound transfer doesn't
-- trip either rule (and an oversubscribed offer fails with a clear message
-- instead of the quantity_remaining check constraint).
--
-- Messages avoid ":" — the action layer strips everything up to the first one.

-- ---------------------------------------------------------------------------
-- Reservation totals
-- ---------------------------------------------------------------------------
create or replace function public.variant_offered_quantity(p_variant_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(o.quantity_remaining), 0)::integer
  from public.offers o
  where o.product_variant_id = p_variant_id
    and o.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED');
$$;

create or replace function public.offer_reserved_quantity(p_offer_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(n.quantity), 0)::integer
  from public.negotiations n
  where n.offer_id = p_offer_id and n.status = 'ACCEPTED';
$$;

create or replace function public.variant_reserved_quantity(p_variant_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(n.quantity), 0)::integer
  from public.negotiations n
  join public.offers o on o.id = n.offer_id
  where o.product_variant_id = p_variant_id and n.status = 'ACCEPTED';
$$;

revoke all on function public.variant_offered_quantity(uuid) from public, anon, authenticated;
revoke all on function public.offer_reserved_quantity(uuid) from public, anon, authenticated;
revoke all on function public.variant_reserved_quantity(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- BR-OFFER-11 — an open offer only takes free stock
-- ---------------------------------------------------------------------------
create or replace function public.assert_offer_fits_free_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_open integer := 0;
  v_new_open integer := 0;
  v_stock integer;
  v_free integer;
begin
  if new.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED') then
    v_new_open := new.quantity_remaining;
  end if;
  if tg_op = 'UPDATE' and old.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED') then
    v_old_open := old.quantity_remaining;
  end if;
  if v_new_open <= v_old_open then
    return new;
  end if;

  select stock_on_hand into v_stock
  from public.product_variants where id = new.product_variant_id for update;

  select v_stock - coalesce(sum(o.quantity_remaining), 0)::integer into v_free
  from public.offers o
  where o.product_variant_id = new.product_variant_id
    and o.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED')
    and o.id <> new.id;

  if v_new_open > v_free then
    raise exception 'Estoque livre insuficiente (% %, o restante já está em ofertas ativas)',
      greatest(v_free, 0),
      case when greatest(v_free, 0) = 1 then 'disponível' else 'disponíveis' end
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger offers_assert_free_stock
  before insert or update of quantity_remaining, status on public.offers
  for each row execute function public.assert_offer_fits_free_stock();

-- ---------------------------------------------------------------------------
-- BR-OFFER-12 — shrink open offers that no longer fit the stock
-- ---------------------------------------------------------------------------
create or replace function public.fit_offers_to_stock(p_variant_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_excess integer;
  v_offer record;
  v_cut integer;
begin
  select public.variant_offered_quantity(p_variant_id) - pv.stock_on_hand into v_excess
  from public.product_variants pv where pv.id = p_variant_id;

  for v_offer in
    select o.id, o.quantity_remaining,
           public.offer_reserved_quantity(o.id) as reserved
    from public.offers o
    where o.product_variant_id = p_variant_id
      and o.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED')
    order by o.created_at desc, o.id desc
    for update of o
  loop
    exit when v_excess is null or v_excess <= 0;
    v_cut := least(v_excess, v_offer.quantity_remaining - v_offer.reserved);
    continue when v_cut <= 0;

    update public.offers
    set quantity_remaining = quantity_remaining - v_cut,
        status = case
          when quantity_remaining - v_cut = 0 then 'CANCELLED'::public.offer_status
          else status
        end
    where id = v_offer.id;

    v_excess := v_excess - v_cut;
  end loop;
end;
$$;

revoke all on function public.fit_offers_to_stock(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- BR-NEG-14 — stock can't leave below the accepted reservations
-- ---------------------------------------------------------------------------
create or replace function public.guard_reserved_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reserved integer;
begin
  v_reserved := public.variant_reserved_quantity(new.id);
  if new.stock_on_hand < v_reserved then
    raise exception 'Estoque reservado para negociações aceitas (% un.), conclua ou cancele a negociação antes',
      v_reserved
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create or replace function public.shrink_offers_after_stock_out()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.fit_offers_to_stock(new.id);
  return null;
end;
$$;

create trigger product_variants_guard_reserved_stock
  before update of stock_on_hand on public.product_variants
  for each row when (new.stock_on_hand < old.stock_on_hand)
  execute function public.guard_reserved_stock();

create trigger product_variants_shrink_offers
  after update of stock_on_hand on public.product_variants
  for each row when (new.stock_on_hand < old.stock_on_hand)
  execute function public.shrink_offers_after_stock_out();

-- ---------------------------------------------------------------------------
-- BR-NEG-13 — accepting reserves the quantity inside the offer
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
  v_offer public.offers%rowtype;
  v_stock integer;
  v_free integer;
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

    -- Same lock order as complete_negotiation: negotiation → offer → variant.
    select * into v_offer from public.offers where id = v_neg.offer_id for update;
    if v_offer.status not in ('ACTIVE', 'PARTIALLY_NEGOTIATED') then
      raise exception 'Esta oferta não está mais ativa';
    end if;
    v_free := v_offer.quantity_remaining - public.offer_reserved_quantity(v_offer.id);
    if v_neg.quantity > v_free then
      raise exception 'A oferta não tem quantidade livre para aceitar (restam % un. não reservadas)',
        greatest(v_free, 0);
    end if;

    select stock_on_hand into v_stock
    from public.product_variants where id = v_offer.product_variant_id for update;
    v_free := v_stock - public.variant_reserved_quantity(v_offer.product_variant_id);
    if v_neg.quantity > v_free then
      raise exception 'Estoque insuficiente para aceitar (% %)', greatest(v_free, 0),
        case when greatest(v_free, 0) = 1 then 'disponível' else 'disponíveis' end;
    end if;

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
-- BR-NEG-14 — completion releases its reservation before moving the stock
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

  if v_offer.quantity_remaining < v_neg.quantity then
    raise exception 'A oferta não tem mais a quantidade negociada (restam % un.)',
      v_offer.quantity_remaining;
  end if;
  if v_src_variant.stock_on_hand < v_neg.quantity then
    raise exception 'Estoque insuficiente na origem';
  end if;

  -- The offer and the negotiation leave the reservation first, so the
  -- outbound movement below neither shrinks other offers on account of this
  -- one nor trips the accepted-reservation guard.
  update public.offers
  set quantity_remaining = quantity_remaining - v_neg.quantity,
      status = (case
        when quantity_remaining - v_neg.quantity <= 0 then 'FULFILLED'
        else 'PARTIALLY_NEGOTIATED'
      end)::public.offer_status
  where id = v_offer.id;

  update public.negotiations
  set status = 'COMPLETED', completed_at = now()
  where id = p_negotiation_id
  returning * into v_neg;

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

  insert into public.negotiation_events (negotiation_id, type, actor_id)
  values (p_negotiation_id, 'COMPLETED', (select auth.uid()));

  return v_neg;
end;
$$;

-- ---------------------------------------------------------------------------
-- Backfill — bring existing oversubscribed variants back within their stock.
-- ---------------------------------------------------------------------------
do $$
declare
  v_variant uuid;
begin
  for v_variant in
    select o.product_variant_id
    from public.offers o
    join public.product_variants pv on pv.id = o.product_variant_id
    where o.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED')
    group by o.product_variant_id, pv.stock_on_hand
    having sum(o.quantity_remaining) > pv.stock_on_hand
  loop
    perform public.fit_offers_to_stock(v_variant);
  end loop;
end;
$$;

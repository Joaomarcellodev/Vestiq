-- VES-32 — after confirming, the factory follows the order up to delivery.
--
--   CONFIRMED → IN_PRODUCTION → SHIPPED → DELIVERED
--
-- The factory (FACTORY_ADMIN / PLATFORM_ADMIN) moves it to production and
-- ships it, optionally with a tracking code; shipping straight from stock
-- skips production. The reseller marks it received: the order becomes
-- DELIVERED and its pieces enter her stock as ENTRADA movements tied to the
-- order (find-or-create her product/variant, like a network transfer — 0029).
-- Each stage is timestamped for the order history and notifies the other side.
-- Paying stays possible through these stages (BR-PAY-01).

alter table public.supply_orders
  add column production_started_at timestamptz,
  add column shipped_at timestamptz,
  add column tracking_code text check (length(tracking_code) <= 100),
  add column delivered_at timestamptz,
  add column received_by uuid references public.profiles (id) on delete set null;

-- ---------------------------------------------------------------------------
-- advance_supply_order — the factory starts production or ships
-- ---------------------------------------------------------------------------
create or replace function public.advance_supply_order(
  p_order_id uuid,
  p_stage text,
  p_tracking_code text default null
)
returns public.supply_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.supply_orders;
  v_tracking text := nullif(btrim(p_tracking_code), '');
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
  if length(coalesce(v_tracking, '')) > 100 then
    raise exception 'O código de rastreio pode ter até 100 caracteres';
  end if;

  if p_stage = 'IN_PRODUCTION' then
    if v_order.status <> 'CONFIRMED' then
      raise exception 'Só um pedido confirmado entra em produção';
    end if;
    update public.supply_orders
    set status = 'IN_PRODUCTION', production_started_at = now()
    where id = p_order_id
    returning * into v_order;
  elsif p_stage = 'SHIPPED' then
    if v_order.status not in ('CONFIRMED', 'IN_PRODUCTION') then
      raise exception 'Só um pedido confirmado ou em produção pode ser enviado';
    end if;
    update public.supply_orders
    set status = 'SHIPPED', shipped_at = now(), tracking_code = v_tracking
    where id = p_order_id
    returning * into v_order;
  else
    raise exception 'Etapa inválida';
  end if;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- receive_supply_order — the reseller confirms delivery; pieces enter her stock
-- ---------------------------------------------------------------------------
create or replace function public.receive_supply_order(p_order_id uuid)
returns public.supply_orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.supply_orders;
  v_item record;
  v_product_id uuid;
  v_variant_id uuid;
  v_note text;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_order from public.supply_orders where id = p_order_id for update;
  if not found or not public.is_org_member(v_order.reseller_id) then
    raise exception 'not authorized';
  end if;
  if v_order.status <> 'SHIPPED' then
    raise exception 'Só um pedido enviado pode ser marcado como recebido';
  end if;

  v_note := 'Pedido #' || upper(left(replace(v_order.id::text, '-', ''), 8));

  for v_item in
    select i.product_name, i.color, i.size, i.unit_price, i.quantity,
           p.brand, p.description
    from public.supply_order_items i
    left join public.products p on p.id = i.product_id
    where i.order_id = p_order_id
    order by i.position
  loop
    select id into v_product_id from public.products
    where organization_id = v_order.reseller_id
      and name = v_item.product_name
      and coalesce(brand, '') = coalesce(v_item.brand, '')
    limit 1;

    if v_product_id is null then
      insert into public.products (organization_id, name, brand, description)
      values (v_order.reseller_id, v_item.product_name, v_item.brand, v_item.description)
      returning id into v_product_id;
    end if;

    select id into v_variant_id from public.product_variants
    where product_id = v_product_id
      and coalesce(size, '') = coalesce(v_item.size, '')
      and coalesce(color, '') = coalesce(v_item.color, '')
    limit 1;

    if v_variant_id is null then
      insert into public.product_variants (
        organization_id, product_id, size, color, cost_price, retail_price, stock_on_hand
      )
      values (
        v_order.reseller_id, v_product_id, v_item.size, v_item.color,
        v_item.unit_price, v_item.unit_price, 0
      )
      returning id into v_variant_id;
    end if;

    perform public.apply_inventory_movement(
      v_variant_id, 'ENTRADA', v_item.quantity, 'supply_order', v_order.id, v_note
    );
  end loop;

  update public.supply_orders
  set status = 'DELIVERED', delivered_at = now(), received_by = v_user
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notifications — each new stage notifies the other side
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
    elsif new.status = 'IN_PRODUCTION' then
      insert into public.notifications (organization_id, type, title, body, link)
      values (new.reseller_id, 'SUPPLY_ORDER_IN_PRODUCTION', 'Pedido em produção',
              coalesce(v_supplier, 'O fornecedor') || ' começou a produzir seu pedido de ' || v_pieces, v_link);
    elsif new.status = 'SHIPPED' then
      insert into public.notifications (organization_id, type, title, body, link)
      values (new.reseller_id, 'SUPPLY_ORDER_SHIPPED', 'Pedido enviado',
              coalesce(v_supplier, 'O fornecedor') || ' enviou seu pedido de ' || v_pieces
                || coalesce(' · rastreio ' || new.tracking_code, ''), v_link);
    elsif new.status = 'DELIVERED' then
      insert into public.notifications (organization_id, type, title, body, link)
      values (new.supplier_id, 'SUPPLY_ORDER_DELIVERED', 'Pedido entregue',
              coalesce(v_reseller, 'A revendedora') || ' recebeu o pedido de ' || v_pieces, v_link);
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- register_supply_order_payment (0037) — payable through the new stages
-- ---------------------------------------------------------------------------
create or replace function public.register_supply_order_payment(
  p_order_id uuid,
  p_checkout_session_id text,
  p_amount numeric,
  p_platform_fee_amount numeric,
  p_destination_account_id text
)
returns public.supply_order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.supply_orders;
  v_percent numeric;
  v_payment public.supply_order_payments;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_order from public.supply_orders where id = p_order_id for update;
  if not found or not public.is_org_member(v_order.reseller_id) then
    raise exception 'not authorized';
  end if;
  -- BR-PAY-01: only an order the supplier confirmed can be paid — also once it
  -- moves on to production, shipping or delivery (VES-32).
  if v_order.status not in ('CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED') then
    raise exception 'Só é possível pagar um pedido confirmado pelo fornecedor';
  end if;
  -- BR-PAY-02: an order is paid once.
  if exists (
    select 1 from public.supply_order_payments
    where order_id = p_order_id and status = 'PAID'
  ) then
    raise exception 'Este pedido já foi pago';
  end if;
  -- BR-PAY-07: to buy again after a refund, the reseller places a new order.
  if exists (
    select 1 from public.supply_order_payments
    where order_id = p_order_id and status = 'REFUNDED'
  ) then
    raise exception 'Este pedido foi reembolsado';
  end if;
  if exists (
    select 1 from public.supply_order_payments
    where order_id = p_order_id and status = 'PENDING'
  ) then
    raise exception 'Já existe um pagamento em andamento para este pedido';
  end if;
  -- BR-PAY-04: the checkout charges exactly the frozen order total.
  if p_amount is distinct from v_order.total_amount then
    raise exception 'O valor do pagamento não confere com o total do pedido';
  end if;
  if coalesce(btrim(p_checkout_session_id), '') = '' then
    raise exception 'Sessão de pagamento inválida';
  end if;
  -- BR-COM-04: the money goes to the supplier's own connected account, ready to receive.
  if not exists (
    select 1 from public.factory_payment_accounts
    where organization_id = v_order.supplier_id
      and stripe_account_id = p_destination_account_id
      and transfers_status = 'active'
  ) then
    raise exception 'O fornecedor ainda não pode receber pagamentos pelo Vestiq';
  end if;
  -- BR-COM-02: the commission is the supplier's percentage of the total, rounded to centavos.
  v_percent := public.platform_fee_percent_of(v_order.supplier_id);
  if p_platform_fee_amount is distinct from round(v_order.total_amount * v_percent / 100, 2) then
    raise exception 'A comissão não confere com o percentual do fornecedor';
  end if;

  insert into public.supply_order_payments (
    order_id, checkout_session_id, amount, created_by,
    platform_fee_percent, platform_fee_amount, destination_account_id
  )
  values (
    p_order_id, p_checkout_session_id, p_amount, v_user,
    v_percent, p_platform_fee_amount, p_destination_account_id
  )
  returning * into v_payment;

  return v_payment;
end;
$$;

revoke execute on function public.advance_supply_order(uuid, text, text) from public, anon;
grant execute on function public.advance_supply_order(uuid, text, text) to authenticated;
revoke execute on function public.receive_supply_order(uuid) from public, anon;
grant execute on function public.receive_supply_order(uuid) to authenticated;

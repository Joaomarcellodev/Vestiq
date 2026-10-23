-- SPEC-014 (RF-PAY-004) — reembolso de um pedido pago. A fábrica reembolsa o
-- valor integral pelo Vestiq; reembolsos feitos no painel do Stripe (inclusive
-- parciais) chegam pelo webhook `charge.refunded`. O valor reembolsado vem
-- sempre do Stripe (`charge.amount_refunded`), como o status do pagamento.

alter table public.supply_order_payments
  add column refunded_amount numeric(18, 2) not null default 0,
  add column refunded_at timestamptz,
  add column refunded_by uuid references public.profiles (id) on delete set null,
  add column refund_reason text check (length(refund_reason) <= 500),
  add constraint supply_order_payments_refund_within_amount
    check (refunded_amount >= 0 and refunded_amount <= amount);

-- Stripe's refund events carry the payment intent, not the checkout session.
create index supply_order_payments_payment_intent_idx
  on public.supply_order_payments (payment_intent_id) where payment_intent_id is not null;

-- ---------------------------------------------------------------------------
-- register_supply_order_payment — BR-PAY-07: a refunded order is not paid again
-- (same body as 0034 plus the refund guard)
-- ---------------------------------------------------------------------------
create or replace function public.register_supply_order_payment(
  p_order_id uuid,
  p_checkout_session_id text,
  p_amount numeric
)
returns public.supply_order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_order public.supply_orders;
  v_payment public.supply_order_payments;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_order from public.supply_orders where id = p_order_id for update;
  if not found or not public.is_org_member(v_order.reseller_id) then
    raise exception 'not authorized';
  end if;
  -- BR-PAY-01: only an order the supplier confirmed can be paid.
  if v_order.status <> 'CONFIRMED' then
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

  insert into public.supply_order_payments (order_id, checkout_session_id, amount, created_by)
  values (p_order_id, p_checkout_session_id, p_amount, v_user)
  returning * into v_payment;

  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------
-- authorize_supply_order_refund — RF-PAY-004 (BR-PAY-08)
-- Checked by the app before it asks Stripe for the refund. Changes nothing:
-- the refund is recorded only once Stripe reports it.
-- ---------------------------------------------------------------------------
create or replace function public.authorize_supply_order_refund(
  p_order_id uuid,
  p_reason text default null
)
returns public.supply_order_payments
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order public.supply_orders;
  v_payment public.supply_order_payments;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  select * into v_order from public.supply_orders where id = p_order_id;
  if not found or not public.has_org_role(
    v_order.supplier_id,
    array['FACTORY_ADMIN', 'PLATFORM_ADMIN']::public.member_role[]
  ) then
    raise exception 'not authorized';
  end if;
  if length(coalesce(p_reason, '')) > 500 then
    raise exception 'O motivo pode ter até 500 caracteres';
  end if;

  select * into v_payment from public.supply_order_payments
  where order_id = p_order_id and status = 'PAID';
  if not found or v_payment.payment_intent_id is null then
    raise exception 'Este pedido não tem um pagamento para reembolsar';
  end if;

  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------
-- apply_supply_order_payment_refund — RF-PAY-004
-- Service role only: the webhook (`charge.refunded`) and the refund action,
-- both after reading the refunded total from Stripe. Idempotent and
-- monotonic — a repeated or late event never lowers the refunded amount.
-- ---------------------------------------------------------------------------
create or replace function public.apply_supply_order_payment_refund(
  p_payment_intent_id text,
  p_amount_refunded numeric,
  p_refunded_by uuid default null,
  p_reason text default null
)
returns public.supply_order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.supply_order_payments;
begin
  select * into v_payment from public.supply_order_payments
  where payment_intent_id = p_payment_intent_id
  for update;
  if not found then
    raise exception 'Pagamento não encontrado' using errcode = 'no_data_found';
  end if;
  if v_payment.status not in ('PAID', 'REFUNDED') then
    raise exception 'Este pagamento não foi concluído';
  end if;
  if p_amount_refunded is null or p_amount_refunded > v_payment.amount then
    raise exception 'O valor reembolsado não confere com o pagamento';
  end if;

  if p_amount_refunded <= v_payment.refunded_amount then
    return v_payment;
  end if;

  update public.supply_order_payments
  set refunded_amount = p_amount_refunded,
      refunded_at = now(),
      refunded_by = coalesce(p_refunded_by, refunded_by),
      refund_reason = coalesce(nullif(btrim(p_reason), ''), refund_reason),
      -- BR-PAY-09: only a full refund changes the status.
      status = case when p_amount_refunded = amount then 'REFUNDED' else status end
  where id = v_payment.id
  returning * into v_payment;

  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notification — the reseller learns about every refund
-- ---------------------------------------------------------------------------
create or replace function public.notify_supply_order_refunded()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.supply_orders;
  v_supplier text;
  v_value text;
begin
  if new.refunded_amount <= old.refunded_amount then
    return new;
  end if;

  select * into v_order from public.supply_orders where id = new.order_id;
  select name into v_supplier from public.organizations where id = v_order.supplier_id;
  -- 1234.5 → "1.234,50" without depending on the server's lc_numeric
  v_value := translate(to_char(new.refunded_amount, 'FM999,999,999,990.00'), ',.', '.,');

  insert into public.notifications (organization_id, type, title, body, link)
  values (
    v_order.reseller_id,
    'SUPPLY_ORDER_REFUNDED',
    case when new.status = 'REFUNDED' then 'Pagamento reembolsado' else 'Reembolso parcial' end,
    'R$ ' || v_value || ' do pedido para ' || coalesce(v_supplier, 'o fornecedor')
      || ' foram reembolsados no seu cartão',
    '/pedidos/' || new.order_id
  );

  return new;
end;
$$;

create trigger supply_order_payments_notify_refund
  after update of refunded_amount on public.supply_order_payments
  for each row execute function public.notify_supply_order_refunded();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke execute on function public.notify_supply_order_refunded() from public, anon, authenticated;
revoke execute on function public.authorize_supply_order_refund(uuid, text) from public, anon;
grant execute on function public.authorize_supply_order_refund(uuid, text) to authenticated;
revoke execute on function public.apply_supply_order_payment_refund(text, numeric, uuid, text) from public, anon, authenticated;
grant execute on function public.apply_supply_order_payment_refund(text, numeric, uuid, text) to service_role;

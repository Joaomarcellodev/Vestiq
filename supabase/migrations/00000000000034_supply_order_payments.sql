-- SPEC-014 (VES-24) — a revendedora paga com cartão, à vista, um pedido de
-- abastecimento que a fábrica confirmou. O cartão é digitado no Checkout do
-- Stripe (ADR-0012): o Vestiq guarda só a sessão de checkout e o status.
--
-- Writes happen only through the functions below (ADR-0004); the table has a
-- select policy only. The webhook is the source of truth for the status and
-- runs with the service role.

create type public.payment_status as enum ('PENDING', 'PAID', 'FAILED', 'EXPIRED');

create table public.supply_order_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.supply_orders (id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  checkout_session_id text not null unique,
  payment_intent_id text,
  status public.payment_status not null default 'PENDING',
  amount numeric(18, 2) not null check (amount > 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  created_by uuid references public.profiles (id) on delete set null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index supply_order_payments_order_idx
  on public.supply_order_payments (order_id, created_at desc);

-- BR-PAY-03: one checkout in progress per order, so two open sessions can't
-- both charge the reseller.
create unique index supply_order_payments_one_pending
  on public.supply_order_payments (order_id) where status = 'PENDING';

create trigger supply_order_payments_set_updated_at
  before update on public.supply_order_payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — both parties of the order read; nobody writes directly
-- ---------------------------------------------------------------------------
alter table public.supply_order_payments enable row level security;

create policy supply_order_payments_select on public.supply_order_payments
  for select using (
    -- the order's own select policy decides
    exists (select 1 from public.supply_orders o where o.id = supply_order_payments.order_id)
  );

-- ---------------------------------------------------------------------------
-- register_supply_order_payment — RF-PAY-001
-- Called by the app right after it opens the Stripe checkout session.
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
-- apply_supply_order_payment_status — RF-PAY-002
-- Service role only: the Stripe webhook and the return from the checkout, both
-- after the status was read from Stripe itself. Idempotent — Stripe retries
-- events and the two paths may report the same outcome.
-- ---------------------------------------------------------------------------
create or replace function public.apply_supply_order_payment_status(
  p_checkout_session_id text,
  p_status public.payment_status,
  p_amount numeric default null,
  p_payment_intent_id text default null
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
  where checkout_session_id = p_checkout_session_id
  for update;
  if not found then
    raise exception 'Pagamento não encontrado' using errcode = 'no_data_found';
  end if;
  if p_status = 'PENDING' then
    raise exception 'Status inválido';
  end if;
  if p_status = 'PAID' and p_amount is distinct from v_payment.amount then
    raise exception 'O valor pago não confere com o pagamento registrado';
  end if;

  -- PAID, FAILED and EXPIRED are final: a late or repeated event changes nothing.
  if v_payment.status <> 'PENDING' then
    return v_payment;
  end if;

  update public.supply_order_payments
  set status = p_status,
      payment_intent_id = coalesce(p_payment_intent_id, payment_intent_id),
      paid_at = case when p_status = 'PAID' then now() end
  where id = v_payment.id
  returning * into v_payment;

  return v_payment;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notification — RF-PAY-003: the supplier learns the order was paid
-- ---------------------------------------------------------------------------
create or replace function public.notify_supply_order_paid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.supply_orders;
  v_reseller text;
begin
  if new.status <> 'PAID' or old.status = 'PAID' then
    return new;
  end if;

  select * into v_order from public.supply_orders where id = new.order_id;
  select name into v_reseller from public.organizations where id = v_order.reseller_id;

  insert into public.notifications (organization_id, type, title, body, link)
  values (
    v_order.supplier_id,
    'SUPPLY_ORDER_PAID',
    'Pedido pago',
    coalesce(v_reseller, 'A revendedora') || ' pagou o pedido de ' || v_order.total_quantity
      || case when v_order.total_quantity = 1 then ' peça' else ' peças' end,
    '/pedidos/' || new.order_id
  );

  return new;
end;
$$;

create trigger supply_order_payments_notify
  after update of status on public.supply_order_payments
  for each row execute function public.notify_supply_order_paid();

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke execute on function public.notify_supply_order_paid() from public, anon, authenticated;
revoke execute on function public.register_supply_order_payment(uuid, text, numeric) from public, anon;
grant execute on function public.register_supply_order_payment(uuid, text, numeric) to authenticated;
revoke execute on function public.apply_supply_order_payment_status(text, public.payment_status, numeric, text) from public, anon, authenticated;
grant execute on function public.apply_supply_order_payment_status(text, public.payment_status, numeric, text) to service_role;

-- SPEC-015 (VES-27) — comissão da plataforma. A fábrica recebe o pagamento do
-- pedido numa conta conectada do Stripe Connect (cobrança com destino), e o
-- Vestiq retém um percentual por fábrica (`application_fee_amount`). Bruto,
-- comissão e líquido ficam registrados em cada pagamento (ADR-0012).

-- ---------------------------------------------------------------------------
-- factory_payment_accounts — where a supplier receives, and its commission
-- ---------------------------------------------------------------------------
create table public.factory_payment_accounts (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  stripe_account_id text unique,
  -- `configuration.recipient.capabilities.stripe_balance.stripe_transfers.status`
  transfers_status text not null default 'pending'
    check (transfers_status in ('active', 'pending', 'restricted', 'rejected', 'unsupported')),
  -- BR-COM-01: set by the platform only (service role), never by the factory.
  platform_fee_percent numeric(5, 2) not null default 10.00
    check (platform_fee_percent >= 0 and platform_fee_percent <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger factory_payment_accounts_set_updated_at
  before update on public.factory_payment_accounts
  for each row execute function public.set_updated_at();

alter table public.factory_payment_accounts enable row level security;

-- The factory's own members read it; resellers get what they need from
-- quote_supply_order_payment. Nobody writes directly.
create policy factory_payment_accounts_select on public.factory_payment_accounts
  for select using (public.is_org_member(organization_id));

-- BR-COM-01: the commission of a factory without a row is the default.
create or replace function public.platform_fee_percent_of(p_organization_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select platform_fee_percent from public.factory_payment_accounts
     where organization_id = p_organization_id),
    10.00
  );
$$;

-- ---------------------------------------------------------------------------
-- Commission on each payment — BR-COM-02/03
-- ---------------------------------------------------------------------------
alter table public.supply_order_payments
  add column platform_fee_percent numeric(5, 2),
  add column platform_fee_amount numeric(18, 2) not null default 0,
  add column net_amount numeric(18, 2) generated always as (amount - platform_fee_amount) stored,
  add column destination_account_id text,
  add constraint supply_order_payments_fee_within_amount
    check (platform_fee_amount >= 0 and platform_fee_amount <= amount);

-- ---------------------------------------------------------------------------
-- quote_supply_order_payment — what the checkout will charge, and for whom
-- ---------------------------------------------------------------------------
create or replace function public.quote_supply_order_payment(p_order_id uuid)
returns table (
  amount numeric,
  platform_fee_percent numeric,
  platform_fee_amount numeric,
  destination_account_id text,
  destination_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order public.supply_orders;
  v_account public.factory_payment_accounts;
  v_percent numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;
  select * into v_order from public.supply_orders where id = p_order_id;
  if not found or not public.is_org_member(v_order.reseller_id) then
    raise exception 'not authorized';
  end if;

  select * into v_account from public.factory_payment_accounts
  where organization_id = v_order.supplier_id;
  v_percent := public.platform_fee_percent_of(v_order.supplier_id);

  return query select
    v_order.total_amount,
    v_percent,
    round(v_order.total_amount * v_percent / 100, 2),
    v_account.stripe_account_id,
    v_account.transfers_status;
end;
$$;

-- ---------------------------------------------------------------------------
-- register_supply_order_payment — now with the commission and the destination
-- (same guards as 0036, plus BR-COM-02..04)
-- ---------------------------------------------------------------------------
drop function public.register_supply_order_payment(uuid, text, numeric);

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

-- ---------------------------------------------------------------------------
-- Connected accounts — service role only, after reading Stripe
-- ---------------------------------------------------------------------------
create or replace function public.link_factory_payment_account(
  p_organization_id uuid,
  p_stripe_account_id text,
  p_transfers_status text
)
returns public.factory_payment_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.factory_payment_accounts;
begin
  if not exists (
    select 1 from public.organizations where id = p_organization_id and type = 'FACTORY'
  ) then
    raise exception 'Só fábricas recebem pagamentos pelo Vestiq';
  end if;

  insert into public.factory_payment_accounts (organization_id, stripe_account_id, transfers_status)
  values (p_organization_id, p_stripe_account_id, p_transfers_status)
  on conflict (organization_id) do update
    set stripe_account_id = excluded.stripe_account_id,
        transfers_status = excluded.transfers_status
    -- a factory keeps the account it was linked to
    where public.factory_payment_accounts.stripe_account_id is null
       or public.factory_payment_accounts.stripe_account_id = excluded.stripe_account_id
  returning * into v_account;

  if v_account.organization_id is null then
    raise exception 'Esta fábrica já tem outra conta de recebimento';
  end if;
  return v_account;
end;
$$;

create or replace function public.set_factory_payment_account_status(
  p_stripe_account_id text,
  p_transfers_status text
)
returns public.factory_payment_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.factory_payment_accounts;
begin
  update public.factory_payment_accounts
  set transfers_status = p_transfers_status
  where stripe_account_id = p_stripe_account_id
  returning * into v_account;
  if not found then
    raise exception 'Conta de recebimento não encontrada' using errcode = 'no_data_found';
  end if;
  return v_account;
end;
$$;

-- BR-COM-01: how the platform changes a factory's commission (SQL editor or a script).
create or replace function public.set_factory_platform_fee(
  p_organization_id uuid,
  p_percent numeric
)
returns public.factory_payment_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.factory_payment_accounts;
begin
  if not exists (
    select 1 from public.organizations where id = p_organization_id and type = 'FACTORY'
  ) then
    raise exception 'Só fábricas têm comissão';
  end if;
  insert into public.factory_payment_accounts (organization_id, platform_fee_percent)
  values (p_organization_id, p_percent)
  on conflict (organization_id) do update set platform_fee_percent = excluded.platform_fee_percent
  returning * into v_account;
  return v_account;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke execute on function public.platform_fee_percent_of(uuid) from public, anon, authenticated;
revoke execute on function public.quote_supply_order_payment(uuid) from public, anon;
grant execute on function public.quote_supply_order_payment(uuid) to authenticated;
revoke execute on function public.register_supply_order_payment(uuid, text, numeric, numeric, text) from public, anon;
grant execute on function public.register_supply_order_payment(uuid, text, numeric, numeric, text) to authenticated;
revoke execute on function public.link_factory_payment_account(uuid, text, text) from public, anon, authenticated;
grant execute on function public.link_factory_payment_account(uuid, text, text) to service_role;
revoke execute on function public.set_factory_payment_account_status(text, text) from public, anon, authenticated;
grant execute on function public.set_factory_payment_account_status(text, text) to service_role;
revoke execute on function public.set_factory_platform_fee(uuid, numeric) from public, anon, authenticated;
grant execute on function public.set_factory_platform_fee(uuid, numeric) to service_role;

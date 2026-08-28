-- SPEC-001 / SPEC-002 — Foundation: extensions, enums, helpers, profiles.
-- See docs/DATA_MODEL.md and docs/SECURITY.md.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums (docs/DATA_MODEL.md §Enums)
-- ---------------------------------------------------------------------------
create type public.organization_type as enum ('FACTORY', 'RESELLER', 'PLATFORM');
create type public.organization_status as enum ('ACTIVE', 'SUSPENDED');

create type public.member_role as enum ('PLATFORM_ADMIN', 'FACTORY_ADMIN', 'RESELLER');
create type public.member_status as enum ('ACTIVE', 'INVITED', 'DISABLED');

create type public.network_member_status as enum ('INVITED', 'ACTIVE', 'DISABLED');

create type public.inventory_movement_type as enum (
  'ENTRADA', 'SAIDA', 'AJUSTE', 'VENDA', 'CANCELAMENTO',
  'TRANSFERENCIA_ENTRADA', 'TRANSFERENCIA_SAIDA'
);

create type public.sale_status as enum ('CONFIRMED', 'CANCELLED');
create type public.payment_method as enum ('PIX', 'CARTAO', 'DINHEIRO');

create type public.offer_status as enum (
  'ACTIVE', 'PARTIALLY_NEGOTIATED', 'FULFILLED', 'CANCELLED'
);

create type public.negotiation_status as enum (
  'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'
);
create type public.negotiation_event_type as enum (
  'CREATED', 'MESSAGE', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED'
);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (mirror of auth.users) — SPEC-001
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select_self on public.profiles
  for select using (id = (select auth.uid()));

create policy profiles_update_self on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Auto-create a profile row when an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- SPEC-006 — Customers.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  email extensions.citext,
  phone text,
  document text,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, document)
);

create index customers_org_idx on public.customers (organization_id);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;

-- RF-CUSTOMER-003: a reseller only accesses its own customers.
create policy customers_all on public.customers
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

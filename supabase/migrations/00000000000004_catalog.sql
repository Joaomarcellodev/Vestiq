-- SPEC-004 — Categories, products, product variants.

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null check (length(trim(name)) > 0),
  brand text,
  description text,
  internal_sku text,
  image_urls text[] not null default '{}',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, internal_sku)
);

create index products_org_idx on public.products (organization_id) where archived_at is null;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  size text,
  color text,
  sku text,
  cost_price numeric(12, 2) not null default 0 check (cost_price >= 0),
  retail_price numeric(12, 2) not null default 0 check (retail_price >= 0),
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create index product_variants_product_idx on public.product_variants (product_id);

create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

-- Keep product_variants.organization_id in sync with its product (RLS convenience).
create or replace function public.sync_variant_org()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.organization_id := (select organization_id from public.products where id = new.product_id);
  return new;
end;
$$;

create trigger product_variants_sync_org
  before insert or update of product_id on public.product_variants
  for each row execute function public.sync_variant_org();

-- ---------------------------------------------------------------------------
-- RLS — tenant = organization
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
create policy categories_all on public.categories
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

alter table public.products enable row level security;
create policy products_all on public.products
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

alter table public.product_variants enable row level security;
create policy product_variants_all on public.product_variants
  for all using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

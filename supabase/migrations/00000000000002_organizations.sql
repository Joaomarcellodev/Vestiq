-- SPEC-002 — Organizations, members and RLS helper functions.

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  type public.organization_type not null,
  status public.organization_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null,
  status public.member_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);
create index organization_members_org_idx on public.organization_members (organization_id);

create trigger organization_members_set_updated_at
  before update on public.organization_members
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helper functions (docs/SECURITY.md §Row Level Security)
-- ---------------------------------------------------------------------------

-- Set of organization ids the current user actively belongs to.
create or replace function public.auth_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select om.organization_id
  from public.organization_members om
  where om.user_id = (select auth.uid())
    and om.status = 'ACTIVE';
$$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = org
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
  );
$$;

create or replace function public.has_org_role(org uuid, roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = org
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and om.role = any(roles)
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

create policy organizations_select_member on public.organizations
  for select using (public.is_org_member(id));

create policy organizations_update_admin on public.organizations
  for update using (public.has_org_role(id, array['FACTORY_ADMIN', 'PLATFORM_ADMIN']::public.member_role[]));

alter table public.organization_members enable row level security;

-- A user sees membership rows of organizations they belong to (to list teammates),
-- plus always their own rows.
create policy organization_members_select on public.organization_members
  for select using (
    user_id = (select auth.uid())
    or public.is_org_member(organization_id)
  );

create policy organization_members_admin_write on public.organization_members
  for all using (
    public.has_org_role(organization_id, array['FACTORY_ADMIN', 'PLATFORM_ADMIN']::public.member_role[])
  ) with check (
    public.has_org_role(organization_id, array['FACTORY_ADMIN', 'PLATFORM_ADMIN']::public.member_role[])
  );

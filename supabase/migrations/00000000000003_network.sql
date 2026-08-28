-- SPEC-003 — Factory networks, membership, invitations.

create table public.factory_networks (
  id uuid primary key default gen_random_uuid(),
  factory_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  status public.organization_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index factory_networks_factory_idx on public.factory_networks (factory_id);

create trigger factory_networks_set_updated_at
  before update on public.factory_networks
  for each row execute function public.set_updated_at();

-- BR-NET-01: a network's owner must be a FACTORY organization.
create or replace function public.assert_factory_org()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select type from public.organizations where id = new.factory_id) <> 'FACTORY' then
    raise exception 'factory_networks.factory_id must reference a FACTORY organization';
  end if;
  return new;
end;
$$;

create trigger factory_networks_assert_factory
  before insert or update on public.factory_networks
  for each row execute function public.assert_factory_org();

create table public.network_members (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.factory_networks (id) on delete cascade,
  reseller_id uuid references public.organizations (id) on delete cascade,
  status public.network_member_status not null default 'INVITED',
  invited_email extensions.citext not null,
  invite_token uuid not null default gen_random_uuid(),
  invite_expires_at timestamptz not null default (now() + interval '14 days'),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (network_id, reseller_id),
  unique (invite_token)
);

create index network_members_reseller_idx on public.network_members (reseller_id) where status = 'ACTIVE';
create index network_members_network_idx on public.network_members (network_id);

create trigger network_members_set_updated_at
  before update on public.network_members
  for each row execute function public.set_updated_at();

-- shares_network(a, b): true when both orgs are ACTIVE members of the same network.
create or replace function public.shares_network(org_a uuid, org_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.network_members na
    join public.network_members nb on nb.network_id = na.network_id
    where na.reseller_id = org_a and na.status = 'ACTIVE'
      and nb.reseller_id = org_b and nb.status = 'ACTIVE'
  );
$$;

-- current user's active network ids (as a reseller).
create or replace function public.auth_network_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select nm.network_id
  from public.network_members nm
  where nm.reseller_id in (select public.auth_org_ids())
    and nm.status = 'ACTIVE';
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.factory_networks enable row level security;

create policy factory_networks_select on public.factory_networks
  for select using (
    public.is_org_member(factory_id)
    or id in (select public.auth_network_ids())
  );

create policy factory_networks_write_admin on public.factory_networks
  for all using (public.has_org_role(factory_id, array['FACTORY_ADMIN', 'PLATFORM_ADMIN']::public.member_role[]))
  with check (public.has_org_role(factory_id, array['FACTORY_ADMIN', 'PLATFORM_ADMIN']::public.member_role[]));

alter table public.network_members enable row level security;

create policy network_members_select on public.network_members
  for select using (
    reseller_id in (select public.auth_org_ids())
    or public.has_org_role(
      (select factory_id from public.factory_networks fn where fn.id = network_id),
      array['FACTORY_ADMIN', 'PLATFORM_ADMIN']::public.member_role[]
    )
  );

create policy network_members_write_admin on public.network_members
  for all using (
    public.has_org_role(
      (select factory_id from public.factory_networks fn where fn.id = network_id),
      array['FACTORY_ADMIN', 'PLATFORM_ADMIN']::public.member_role[]
    )
  ) with check (
    public.has_org_role(
      (select factory_id from public.factory_networks fn where fn.id = network_id),
      array['FACTORY_ADMIN', 'PLATFORM_ADMIN']::public.member_role[]
    )
  );

-- ---------------------------------------------------------------------------
-- accept_invite RPC (RF-NET-004/005) — transactional
-- ---------------------------------------------------------------------------
create or replace function public.accept_network_invite(p_token uuid, p_reseller_name text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_email extensions.citext := (select email from auth.users where id = v_user);
  v_member public.network_members%rowtype;
  v_org_id uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select * into v_member from public.network_members
  where invite_token = p_token
  for update;

  if not found then
    raise exception 'Convite inválido ou expirado';
  end if;
  if v_member.status = 'ACTIVE' then
    return v_member.reseller_id;
  end if;
  if v_member.invite_expires_at < now() then
    raise exception 'Convite inválido ou expirado';
  end if;
  if lower(v_member.invited_email::text) <> lower(v_email::text) then
    raise exception 'Este convite é para outro email';
  end if;

  -- Reuse an existing reseller org the user already belongs to, or create one.
  select om.organization_id into v_org_id
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  where om.user_id = v_user and o.type = 'RESELLER' and om.status = 'ACTIVE'
  limit 1;

  if v_org_id is null then
    insert into public.organizations (name, type)
    values (coalesce(nullif(trim(p_reseller_name), ''), split_part(v_email::text, '@', 1)), 'RESELLER')
    returning id into v_org_id;

    insert into public.organization_members (organization_id, user_id, role, status)
    values (v_org_id, v_user, 'RESELLER', 'ACTIVE');
  end if;

  update public.network_members
  set reseller_id = v_org_id,
      status = 'ACTIVE',
      joined_at = now()
  where id = v_member.id;

  return v_org_id;
end;
$$;

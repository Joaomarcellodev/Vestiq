-- VES-65 — public profile of a reseller inside the network (SPEC-003,
-- AC-NET-008-02). A peer sees the identity of another reseller of one of her
-- networks — name, city, the owner's avatar and a few public counters — and
-- never her stock, customers or sales (SDD §8).
--
-- `profiles` is readable only by its owner, so the avatar and the counters
-- come from a SECURITY DEFINER projection that applies the same rule as the
-- `organizations_select_network` policy (migration 0011).

alter table public.organizations
  add column city text check (city is null or length(city) between 1 and 80);

comment on column public.organizations.city is
  'Cidade exibida no perfil público da revendedora (VES-65), ex.: "Teresina, PI".';

-- ---------------------------------------------------------------------------
-- set_organization_city — any active member edits her organization's city.
-- The organizations UPDATE policy is admin-only (it would also let a member
-- change `status`), so this goes through a narrow function instead.
-- ---------------------------------------------------------------------------
create or replace function public.set_organization_city(p_org_id uuid, p_city text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_city text := nullif(trim(p_city), '');
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'not authorized';
  end if;
  if v_city is not null and length(v_city) > 80 then
    raise exception 'Use no máximo 80 caracteres na cidade';
  end if;
  update public.organizations set city = v_city where id = p_org_id;
end;
$$;

revoke execute on function public.set_organization_city(uuid, text) from public, anon;
grant execute on function public.set_organization_city(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- get_reseller_profile — empty for an organization the caller can't see
-- (the page answers 404), for a factory and for the platform.
-- ---------------------------------------------------------------------------
create or replace function public.get_reseller_profile(p_org_id uuid)
returns table (
  id uuid,
  name text,
  city text,
  avatar_url text,
  member_since timestamptz,
  active_offers integer,
  completed_deals integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    org.id,
    org.name,
    org.city,
    (
      select p.avatar_url
      from public.organization_members om
      join public.profiles p on p.id = om.user_id
      where om.organization_id = org.id
        and om.status = 'ACTIVE'
      order by om.created_at
      limit 1
    ),
    org.created_at,
    (
      select count(*)::integer
      from public.offers o
      where o.organization_id = org.id
        and o.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED')
        and (
          public.is_org_member(o.organization_id)
          or o.network_id in (select public.auth_network_ids())
        )
    ),
    (
      select count(*)::integer
      from public.negotiations n
      where n.status = 'COMPLETED'
        and (n.seller_org_id = org.id or n.buyer_org_id = org.id)
    )
  from public.organizations org
  where org.id = p_org_id
    and org.type = 'RESELLER'
    and (
      public.is_org_member(org.id)
      or exists (
        select 1
        from public.auth_org_ids() as my(id)
        where public.shares_network(my.id, org.id)
      )
    );
$$;

revoke execute on function public.get_reseller_profile(uuid) from public, anon;
grant execute on function public.get_reseller_profile(uuid) to authenticated;

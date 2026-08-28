-- SPEC-003 — a network's participants must be able to see each other's
-- *identity* (organization name), even though operational data stays private
-- (SDD §8). Additive SELECT policy on organizations.

create policy organizations_select_network on public.organizations
  for select using (
    -- a factory admin sees the resellers of their own networks
    exists (
      select 1
      from public.network_members nm
      join public.factory_networks fn on fn.id = nm.network_id
      where nm.reseller_id = organizations.id
        and public.has_org_role(
          fn.factory_id,
          array['FACTORY_ADMIN', 'PLATFORM_ADMIN']::public.member_role[]
        )
    )
    -- a reseller sees other resellers that share one of its active networks
    or exists (
      select 1
      from public.network_members me
      join public.network_members peer on peer.network_id = me.network_id
      where me.reseller_id in (select public.auth_org_ids())
        and me.status = 'ACTIVE'
        and peer.reseller_id = organizations.id
        and peer.status = 'ACTIVE'
    )
    -- a reseller sees the factory that owns one of its networks
    or exists (
      select 1
      from public.factory_networks fn
      where fn.factory_id = organizations.id
        and fn.id in (select public.auth_network_ids())
    )
  );

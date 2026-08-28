-- Fix: the reseller-peer branch of organizations_select_network queried
-- network_members directly, which is itself RLS-protected, so a reseller could
-- not see a peer's membership row and the branch always failed. Use the
-- SECURITY DEFINER helpers instead.

drop policy if exists organizations_select_network on public.organizations;

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
      from public.auth_org_ids() as my(id)
      where public.shares_network(my.id, organizations.id)
    )
    -- a reseller sees the factory that owns one of its networks
    or exists (
      select 1
      from public.factory_networks fn
      where fn.factory_id = organizations.id
        and fn.id in (select public.auth_network_ids())
    )
  );

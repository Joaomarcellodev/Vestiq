-- RF-FACTORY-DASH-001 (VES-61/VES-75) — aggregated network indicators for the
-- factory admin.
--
-- The factory admin is not a member of its own network, so the `offers` and
-- `negotiations` RLS (org owner + network peers) hides every row from it and
-- the /rede-fabrica cards always read 0. Opening those policies would expose
-- each reseller's private operations (SDD §8). Instead this view runs with the
-- owner's rights and returns ONE row per network with counts only — never a
-- reseller, offer or negotiation row.
--
-- security_barrier: the authorisation predicate below is evaluated before any
-- user-supplied filter, so a leaky function in a WHERE clause cannot observe
-- rows of networks the caller does not administer.

create view public.factory_network_stats
with (security_barrier = true)
as
select
  fn.id as network_id,
  fn.factory_id,
  (select count(*) from public.network_members nm
    where nm.network_id = fn.id and nm.status = 'ACTIVE')::integer as active_resellers,
  (select count(*) from public.network_members nm
    where nm.network_id = fn.id and nm.status = 'DISABLED')::integer as disabled_resellers,
  (select count(*) from public.network_members nm
    where nm.network_id = fn.id and nm.status = 'INVITED')::integer as pending_invites,
  (select count(*) from public.offers o
    where o.network_id = fn.id and o.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED'))::integer
    as active_offers,
  (select count(*) from public.offers o where o.network_id = fn.id)::integer as total_offers,
  (select count(*) from public.negotiations n where n.network_id = fn.id)::integer
    as negotiations_started,
  (select count(*) from public.negotiations n
    where n.network_id = fn.id and n.status = 'COMPLETED')::integer as negotiations_completed
from public.factory_networks fn
where public.has_org_role(
  fn.factory_id,
  array['FACTORY_ADMIN', 'PLATFORM_ADMIN']::public.member_role[]
);

comment on view public.factory_network_stats is
  'Per-network aggregates for the factory admin (RF-FACTORY-DASH-001). Aggregates only — no reseller rows.';

revoke all on public.factory_network_stats from public, anon, authenticated;
grant select on public.factory_network_stats to authenticated;

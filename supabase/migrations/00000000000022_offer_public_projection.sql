-- SPEC-008 — public projection of network offers (RF-OFFER-004, SDD §8, VES-23).
-- `offers` is readable by network peers, but `products` / `product_variants`
-- only by their owner, so a peer's feed and offer detail lost the product
-- name, brand and photo. This returns, for the offers the caller may see, only
-- the product's public fields — never cost, stock, SKU or other private data.

create or replace function public.list_visible_offers(p_offer_id uuid default null)
returns table (
  id uuid,
  organization_id uuid,
  network_id uuid,
  seller_name text,
  status public.offer_status,
  quantity_remaining integer,
  transfer_price numeric,
  note text,
  created_at timestamptz,
  product_name text,
  brand text,
  description text,
  color text,
  size text,
  image_urls text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.id,
    o.organization_id,
    o.network_id,
    org.name,
    o.status,
    o.quantity_remaining,
    o.transfer_price,
    o.note,
    o.created_at,
    p.name,
    p.brand,
    p.description,
    v.color,
    v.size,
    p.image_urls
  from public.offers o
  join public.organizations org on org.id = o.organization_id
  join public.product_variants v on v.id = o.product_variant_id
  join public.products p on p.id = v.product_id
  where (p_offer_id is null or o.id = p_offer_id)
    -- same rule as the offers_select policy (migration 0008)
    and (
      public.is_org_member(o.organization_id)
      or (
        o.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED')
        and o.network_id in (select public.auth_network_ids())
      )
    )
  order by o.created_at desc;
$$;

revoke execute on function public.list_visible_offers(uuid) from public, anon;
grant execute on function public.list_visible_offers(uuid) to authenticated;

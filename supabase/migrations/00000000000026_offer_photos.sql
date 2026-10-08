-- RF-OFFER-008 (VES-106) — an offer can carry its own photos (the actual piece
-- being passed on: condition, details, tag). Stored in the `product-images`
-- bucket under `<org>/offers/<offer>/`, so the existing per-organization
-- storage policies (migration 0014) already apply.

alter table public.offers
  add column image_urls text[] not null default '{}';

-- Same projection as 0022; the photos are the offer's own when it has any,
-- the product's otherwise (AC-OFFER-008-03).
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
    case when cardinality(o.image_urls) > 0 then o.image_urls else p.image_urls end
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

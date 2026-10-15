-- VES-97 — the product of each negotiation, for both parties.
-- The buyer can't read the seller's `products` / `product_variants`, and reads
-- the `offers` row only while it is open (offers_select, migration 0008), so
-- her negotiations showed "—" instead of the product. `list_visible_offers`
-- (0022/0026) doesn't cover it either: once the offer is sold out or cancelled
-- it disappears for her, while the negotiation stays in her history.
-- This returns, for the negotiations the caller is a party to, only the
-- product's public fields — never cost, stock, SKU or other private data.

create or replace function public.list_negotiation_products(p_negotiation_id uuid default null)
returns table (
  negotiation_id uuid,
  product_name text,
  brand text,
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
    n.id,
    p.name,
    p.brand,
    v.color,
    v.size,
    -- same photo rule as list_visible_offers (migration 0026)
    case when cardinality(o.image_urls) > 0 then o.image_urls else p.image_urls end
  from public.negotiations n
  join public.offers o on o.id = n.offer_id
  join public.product_variants v on v.id = o.product_variant_id
  join public.products p on p.id = v.product_id
  where (p_negotiation_id is null or n.id = p_negotiation_id)
    -- same rule as the negotiations_select policy (migration 0009)
    and (public.is_org_member(n.seller_org_id) or public.is_org_member(n.buyer_org_id));
$$;

revoke execute on function public.list_negotiation_products(uuid) from public, anon;
grant execute on function public.list_negotiation_products(uuid) to authenticated;

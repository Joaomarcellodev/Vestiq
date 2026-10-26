-- VES-90 — the network offer feed is paged, so its search moves into SQL:
-- filtering in the app after a page was cut would drop matches from later
-- pages. Same rule as before (src/features/offers/search.ts): every word of the
-- query in the product name, brand, colour / size ("Único" without either) or
-- seller name, case- and accent-insensitive — `search_matches` (migration 0017).
--
-- Same projection as 0033, plus `p_query`.

drop function public.list_visible_offers(uuid);

create function public.list_visible_offers(
  p_offer_id uuid default null,
  p_query text default null
)
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
  image_urls text[],
  edited_at timestamptz
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
    case when cardinality(o.image_urls) > 0 then o.image_urls else p.image_urls end,
    o.edited_at
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
    and public.search_matches(
      concat_ws(' ',
        p.name,
        p.brand,
        coalesce(nullif(concat_ws(' / ', v.color, v.size), ''), 'Único'),
        org.name
      ),
      p_query
    )
  order by o.created_at desc, o.id desc;
$$;

revoke execute on function public.list_visible_offers(uuid, text) from public, anon;
grant execute on function public.list_visible_offers(uuid, text) to authenticated;

-- SPEC-004 (RF-PROD-002/003, BR-CAT-03/04) — cadastro de produto atômico.
-- A action fazia insert do produto, update das fotos, um insert por variação e
-- um RPC de estoque inicial por variação, cada um por conta própria: um SKU de
-- variação repetido deixava o produto e as variações anteriores gravados, e uma
-- falha no estoque inicial era ignorada (produto criado sem estoque, com toast
-- de sucesso). Aqui tudo acontece em uma transação (ADR-0004).
--
-- p_product:  { id?, name, brand?, category_id?, internal_sku?, description?,
--               image_urls?, min_order_quantity?, size_grid? }
--             `id` vem da action, que já subiu as fotos para a pasta do produto.
-- p_variants: [{ size?, color?, sku?, cost_price, retail_price, initial_stock }]

create or replace function public.create_product(
  p_organization_id uuid,
  p_product jsonb,
  p_variants jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
  v_variant jsonb;
  v_variant_id uuid;
  v_initial_stock integer;
begin
  if not public.is_org_member(p_organization_id) then
    raise exception 'not authorized';
  end if;
  -- BR-CAT-03: a product always has at least one variant.
  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) = 0 then
    raise exception 'Informe ao menos uma variação';
  end if;

  insert into public.products (
    id, organization_id, name, brand, category_id, internal_sku, description,
    image_urls, min_order_quantity, size_grid
  )
  values (
    coalesce((p_product ->> 'id')::uuid, gen_random_uuid()),
    p_organization_id,
    p_product ->> 'name',
    nullif(p_product ->> 'brand', ''),
    nullif(p_product ->> 'category_id', '')::uuid,
    nullif(p_product ->> 'internal_sku', ''),
    nullif(p_product ->> 'description', ''),
    coalesce(
      array(select jsonb_array_elements_text(p_product -> 'image_urls')),
      '{}'
    ),
    coalesce((p_product ->> 'min_order_quantity')::integer, 1),
    coalesce(
      array(select jsonb_array_elements_text(p_product -> 'size_grid')),
      '{}'
    )
  )
  returning id into v_product_id;

  for v_variant in select value from jsonb_array_elements(p_variants)
  loop
    -- organization_id comes from the product (trigger product_variants_sync_org).
    insert into public.product_variants (
      product_id, size, color, sku, cost_price, retail_price
    )
    values (
      v_product_id,
      nullif(v_variant ->> 'size', ''),
      nullif(v_variant ->> 'color', ''),
      nullif(v_variant ->> 'sku', ''),
      coalesce((v_variant ->> 'cost_price')::numeric, 0),
      coalesce((v_variant ->> 'retail_price')::numeric, 0)
    )
    returning id into v_variant_id;

    v_initial_stock := coalesce((v_variant ->> 'initial_stock')::integer, 0);
    if v_initial_stock > 0 then
      perform public.apply_inventory_movement(
        v_variant_id, 'ENTRADA', v_initial_stock, 'manual', null, 'Estoque inicial'
      );
    end if;
  end loop;

  return v_product_id;
end;
$$;

revoke execute on function public.create_product(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.create_product(uuid, jsonb, jsonb) to authenticated;

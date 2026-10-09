-- VES-68 — editing a product edits its variants too (colour, size, SKU, cost
-- and retail price), adds new ones and archives the ones taken off the form.
-- One transaction with the product's own fields: a duplicated SKU or a bad
-- price leaves the product exactly as it was (ADR-0004).
--
-- p_product: { name, brand, category_id, internal_sku, description, image_urls,
--              min_order_quantity?, size_grid? }  — the wholesale keys only
--              come from a factory (BR-CAT-13); absent keys keep the column.
-- p_variants: the product's active variants after the edit, or null to leave
--   them alone.
--   [{ "id": uuid | null, "size", "color", "sku", "cost_price", "retail_price",
--      "initial_stock" }]
--   - with an id: updates that variant (it must be an active one of this product);
--   - without an id: creates it, entering "initial_stock" as an ENTRADA movement;
--   - an active variant missing from the list is archived, never deleted —
--     sales, offers and the movement history keep pointing at it.
-- Stock is never set here: it only changes through movements (ADR-0005).

create or replace function public.update_product(
  p_product_id uuid,
  p_product jsonb,
  p_variants jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_item jsonb;
  v_variant_id uuid;
  v_cost numeric;
  v_retail numeric;
  v_stock numeric;
  v_category uuid := nullif(p_product ->> 'category_id', '')::uuid;
begin
  select * into v_product from public.products where id = p_product_id for update;
  if not found or not public.is_org_member(v_product.organization_id) then
    raise exception 'not authorized';
  end if;
  if v_product.archived_at is not null then
    raise exception 'Produto arquivado não pode ser editado';
  end if;
  if v_category is not null and not exists (
    select 1 from public.categories
    where id = v_category and organization_id = v_product.organization_id
  ) then
    raise exception 'Categoria inválida';
  end if;

  update public.products set
    name = p_product ->> 'name',
    brand = nullif(trim(p_product ->> 'brand'), ''),
    category_id = v_category,
    internal_sku = nullif(trim(p_product ->> 'internal_sku'), ''),
    description = nullif(trim(p_product ->> 'description'), ''),
    image_urls = coalesce(
      (select array_agg(u) from jsonb_array_elements_text(p_product -> 'image_urls') u),
      '{}'
    ),
    min_order_quantity = case
      when p_product ? 'min_order_quantity' then (p_product ->> 'min_order_quantity')::integer
      else min_order_quantity
    end,
    size_grid = case
      when p_product ? 'size_grid' then coalesce(
        (select array_agg(s) from jsonb_array_elements_text(p_product -> 'size_grid') s),
        '{}'
      )
      else size_grid
    end
  where id = p_product_id;

  if p_variants is null then
    return;
  end if;
  if jsonb_typeof(p_variants) <> 'array' then
    raise exception 'Variações inválidas';
  end if;
  -- BR-CAT-03: a product always has at least one variant.
  if jsonb_array_length(p_variants) = 0 then
    raise exception 'O produto precisa de pelo menos uma variação';
  end if;

  update public.product_variants set archived_at = now()
  where product_id = p_product_id
    and archived_at is null
    and id not in (
      select (e ->> 'id')::uuid from jsonb_array_elements(p_variants) e
      where nullif(e ->> 'id', '') is not null
    );

  for v_item in select * from jsonb_array_elements(p_variants) loop
    v_cost := coalesce((v_item ->> 'cost_price')::numeric, 0);
    v_retail := coalesce((v_item ->> 'retail_price')::numeric, 0);
    if v_cost < 0 then
      raise exception 'Custo inválido';
    end if;
    if v_retail < 0 then
      raise exception 'Preço de venda inválido';
    end if;

    v_variant_id := nullif(v_item ->> 'id', '')::uuid;
    if v_variant_id is not null then
      update public.product_variants set
        size = nullif(trim(v_item ->> 'size'), ''),
        color = nullif(trim(v_item ->> 'color'), ''),
        sku = nullif(trim(v_item ->> 'sku'), ''),
        cost_price = v_cost,
        retail_price = v_retail
      where id = v_variant_id and product_id = p_product_id and archived_at is null;
      if not found then
        raise exception 'Variação não pertence ao produto';
      end if;
    else
      insert into public.product_variants (
        organization_id, product_id, size, color, sku, cost_price, retail_price
      )
      values (
        v_product.organization_id, p_product_id,
        nullif(trim(v_item ->> 'size'), ''),
        nullif(trim(v_item ->> 'color'), ''),
        nullif(trim(v_item ->> 'sku'), ''),
        v_cost, v_retail
      )
      returning id into v_variant_id;

      v_stock := coalesce((v_item ->> 'initial_stock')::numeric, 0);
      if v_stock < 0 or v_stock <> trunc(v_stock) then
        raise exception 'Estoque inicial inválido';
      end if;
      if v_stock > 0 then
        perform public.apply_inventory_movement(
          v_variant_id, 'ENTRADA', v_stock::integer, 'manual', null, 'Estoque inicial'
        );
      end if;
    end if;
  end loop;
end;
$$;

revoke all on function public.update_product(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.update_product(uuid, jsonb, jsonb) to authenticated;

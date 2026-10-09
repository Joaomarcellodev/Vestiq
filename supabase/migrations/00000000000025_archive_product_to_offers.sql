-- AC-PROD-006-03/04 (VES-69) — archiving a product publishes its stock to the
-- network. One transaction: the offers are created and the product and its
-- variants archived together, or nothing changes (ADR-0004).
--
-- p_items: [{ "variant_id": uuid, "quantity": int, "transfer_price": numeric }]
-- Items with quantity 0 are skipped; an empty list (or a null network) only
-- archives. publish_offer refuses archived variants, so the offers are created
-- here, before the product is archived, with the same checks.

create or replace function public.archive_product_to_offers(
  p_product_id uuid,
  p_network_id uuid default null,
  p_items jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_item jsonb;
  v_quantity integer;
  v_price numeric;
  v_offers integer := 0;
begin
  select * into v_product from public.products where id = p_product_id for update;
  if not found or not public.is_org_member(v_product.organization_id) then
    raise exception 'not authorized';
  end if;
  if v_product.archived_at is not null then
    raise exception 'Este produto já está arquivado';
  end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Itens inválidos';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    if jsonb_typeof(v_item -> 'quantity') <> 'number'
      or (v_item ->> 'quantity')::numeric <> trunc((v_item ->> 'quantity')::numeric) then
      raise exception 'Quantidade inválida';
    end if;
    v_quantity := (v_item ->> 'quantity')::integer;
    if v_quantity < 0 then
      raise exception 'Quantidade inválida';
    end if;
    continue when v_quantity = 0;

    if p_network_id is null then
      raise exception 'Escolha a rede das ofertas';
    end if;
    if not exists (
      select 1 from public.network_members nm
      where nm.network_id = p_network_id
        and nm.reseller_id = v_product.organization_id
        and nm.status = 'ACTIVE'
    ) then
      raise exception 'Você não participa desta rede';
    end if;

    select * into v_variant from public.product_variants
    where id = (v_item ->> 'variant_id')::uuid and product_id = p_product_id
    for update;
    if not found then
      raise exception 'Variação não pertence ao produto';
    end if;
    if v_quantity > v_variant.stock_on_hand then
      raise exception 'Você tem apenas % em estoque', v_variant.stock_on_hand;
    end if;

    v_price := (v_item ->> 'transfer_price')::numeric;
    if v_price is null or v_price <= 0 then
      raise exception 'Informe o preço de repasse de cada variação';
    end if;

    insert into public.offers (
      organization_id, network_id, product_variant_id,
      quantity_offered, quantity_remaining, transfer_price, status
    )
    values (
      v_product.organization_id, p_network_id, v_variant.id,
      v_quantity, v_quantity, v_price, 'ACTIVE'
    );
    v_offers := v_offers + 1;
  end loop;

  update public.products set archived_at = now() where id = p_product_id;
  update public.product_variants set archived_at = now()
  where product_id = p_product_id and archived_at is null;

  return v_offers;
end;
$$;

revoke all on function public.archive_product_to_offers(uuid, uuid, jsonb) from public, anon;
grant execute on function public.archive_product_to_offers(uuid, uuid, jsonb) to authenticated;

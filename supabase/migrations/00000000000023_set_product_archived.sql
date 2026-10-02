-- SPEC-004 (RF-PROD-006, BR-CAT-07/08) — arquivar/desarquivar produto de forma atômica.
-- A action fazia dois updates separados (products e product_variants): se o
-- segundo falhasse, o produto ficava arquivado com variações ativas (ou o
-- contrário), e essas variações continuavam aparecendo em venda e ofertas.
-- Aqui as duas escritas acontecem na mesma transação (ADR-0004).

create or replace function public.set_product_archived(
  p_product_id uuid,
  p_archived boolean
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid;
  v_archived_at timestamptz := case when p_archived then now() end;
begin
  select organization_id into v_org from public.products where id = p_product_id;
  if v_org is null then
    raise exception 'Produto não encontrado' using errcode = 'no_data_found';
  end if;
  if not public.is_org_member(v_org) then
    raise exception 'not authorized';
  end if;

  update public.products set archived_at = v_archived_at where id = p_product_id;
  update public.product_variants set archived_at = v_archived_at where product_id = p_product_id;

  return v_archived_at;
end;
$$;

revoke execute on function public.set_product_archived(uuid, boolean) from public, anon;
grant execute on function public.set_product_archived(uuid, boolean) to authenticated;

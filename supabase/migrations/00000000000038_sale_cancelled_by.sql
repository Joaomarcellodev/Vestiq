-- VES-83 — a cancelled sale records who cancelled it.
--
-- `cancel_sale` kept the reason and the time, but not the user, so the sale
-- detail could only show the "Cancelada" badge. Now it stores `cancelled_by`
-- (the caller), and `sale_cancelled_by_name` hands the detail page that
-- person's name: `profiles` is readable only by its owner, so the page can't
-- join it for a teammate. The function returns just the name, and only to an
-- active member of the sale's organization.
--
-- Sales cancelled before this migration take the user from the CANCELAMENTO
-- movements `cancel_sale` wrote for them (same transaction, same caller).

alter table public.sales
  add column cancelled_by uuid references public.profiles (id) on delete set null;

update public.sales s
set cancelled_by = (
  select im.created_by
  from public.inventory_movements im
  where im.reference_type = 'sale'
    and im.reference_id = s.id
    and im.type = 'CANCELAMENTO'
    and im.created_by is not null
  limit 1
)
where s.status = 'CANCELLED'
  and s.cancelled_by is null;

create or replace function public.cancel_sale(p_sale_id uuid, p_reason text)
returns public.sales
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sale public.sales;
  v_item public.sale_items%rowtype;
begin
  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found or not public.is_org_member(v_sale.organization_id) then
    raise exception 'not authorized';
  end if;
  if v_sale.status = 'CANCELLED' then
    raise exception 'Venda já cancelada';
  end if;

  for v_item in select * from public.sale_items where sale_id = p_sale_id
  loop
    perform public.apply_inventory_movement(
      v_item.product_variant_id, 'CANCELAMENTO', v_item.quantity, 'sale', v_sale.id, p_reason
    );
  end loop;

  update public.sales
  set status = 'CANCELLED',
      cancelled_at = now(),
      cancel_reason = p_reason,
      cancelled_by = (select auth.uid())
  where id = p_sale_id
  returning * into v_sale;

  return v_sale;
end;
$$;

-- Name of whoever cancelled the sale: profile name, then the signup name,
-- then the part of the email before the "@". Null when the caller isn't a
-- member of the sale's organization, or nobody is recorded.
create or replace function public.sale_cancelled_by_name(p_sale_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    nullif(btrim(p.full_name), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    split_part(u.email::text, '@', 1)
  )
  from public.sales s
  join auth.users u on u.id = s.cancelled_by
  left join public.profiles p on p.id = u.id
  where s.id = p_sale_id
    and public.is_org_member(s.organization_id);
$$;

revoke execute on function public.sale_cancelled_by_name(uuid) from public, anon;
grant execute on function public.sale_cancelled_by_name(uuid) to authenticated;

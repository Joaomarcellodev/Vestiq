-- SPEC-004 (extensão) — condições de atacado da fábrica (RF-PROD-007).
-- A fábrica define, por produto, o pedido mínimo (em peças) e a grade de
-- tamanhos disponível para pedido — prática comum no atacado de roupa.
-- Revendedoras não definem essas condições (BR-CAT-13).

alter table public.products
  add column min_order_quantity integer not null default 1
    constraint products_min_order_quantity_check check (min_order_quantity >= 1),
  add column size_grid text[] not null default '{}'
    constraint products_size_grid_check check (
      cardinality(size_grid) <= 20
      and array_position(size_grid, null) is null
      and '' <> all (size_grid)
    );

comment on column public.products.min_order_quantity is
  'Pedido mínimo em peças (atacado). 1 = sem mínimo. Só fábricas definem.';
comment on column public.products.size_grid is
  'Grade de tamanhos disponível para pedido, na ordem de exibição. Só fábricas definem.';

-- BR-CAT-13: only FACTORY organizations set wholesale conditions.
create or replace function public.assert_wholesale_conditions_factory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.min_order_quantity <> 1 or cardinality(new.size_grid) > 0)
     and (select type from public.organizations where id = new.organization_id) <> 'FACTORY' then
    raise exception 'Somente a fábrica define pedido mínimo e grade de tamanhos'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger products_assert_wholesale_conditions
  before insert or update of min_order_quantity, size_grid, organization_id on public.products
  for each row execute function public.assert_wholesale_conditions_factory();

-- VES-42 / VES-47 — SPEC-016: rating a finished transaction. Each party of a
-- COMPLETED negotiation (reseller ↔ reseller) or a DELIVERED supply order
-- (reseller ↔ factory) rates the other once, 1 to 5 with an optional comment.
-- The average and the count show on the reseller's public profile (VES-65).
--
-- Writes go only through `submit_review` (no INSERT/UPDATE/DELETE policy), so
-- nobody writes a review in someone else's name or edits one afterwards.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  negotiation_id uuid references public.negotiations (id) on delete cascade,
  supply_order_id uuid references public.supply_orders (id) on delete cascade,
  reviewer_org_id uuid not null references public.organizations (id) on delete cascade,
  reviewed_org_id uuid not null references public.organizations (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or length(comment) between 1 and 500),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(negotiation_id, supply_order_id) = 1),
  check (reviewer_org_id <> reviewed_org_id)
);

-- BR-REV-02: one review per party and per transaction.
create unique index reviews_negotiation_reviewer_key
  on public.reviews (negotiation_id, reviewer_org_id) where negotiation_id is not null;
create unique index reviews_supply_order_reviewer_key
  on public.reviews (supply_order_id, reviewer_org_id) where supply_order_id is not null;
create index reviews_reviewed_idx on public.reviews (reviewed_org_id);

alter table public.reviews enable row level security;

-- The two parties read the review; the public profile shows only aggregates.
create policy reviews_select_parties on public.reviews
  for select using (
    public.is_org_member(reviewer_org_id) or public.is_org_member(reviewed_org_id)
  );

-- ---------------------------------------------------------------------------
-- submit_review — exactly one of p_negotiation_id / p_supply_order_id.
-- ---------------------------------------------------------------------------
create or replace function public.submit_review(
  p_rating integer,
  p_negotiation_id uuid default null,
  p_supply_order_id uuid default null,
  p_comment text default null
)
returns public.reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_comment text := nullif(trim(p_comment), '');
  v_status text;
  v_finished text := 'COMPLETED';
  v_party_a uuid;
  v_party_b uuid;
  v_reviewer uuid;
  v_reviewed uuid;
  v_review public.reviews;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if num_nonnulls(p_negotiation_id, p_supply_order_id) <> 1 then
    raise exception 'Informe a transação avaliada';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'A nota deve ser de 1 a 5';
  end if;
  if v_comment is not null and length(v_comment) > 500 then
    raise exception 'Use no máximo 500 caracteres no comentário';
  end if;

  if p_negotiation_id is not null then
    select n.status::text, n.seller_org_id, n.buyer_org_id
      into v_status, v_party_a, v_party_b
      from public.negotiations n
      where n.id = p_negotiation_id;
  else
    v_finished := 'DELIVERED';
    select o.status::text, o.supplier_id, o.reseller_id
      into v_status, v_party_a, v_party_b
      from public.supply_orders o
      where o.id = p_supply_order_id;
  end if;

  -- BR-REV-03: only a party of the transaction rates it.
  if not found then
    raise exception 'not authorized';
  end if;
  if public.is_org_member(v_party_a) then
    v_reviewer := v_party_a;
    v_reviewed := v_party_b;
  elsif public.is_org_member(v_party_b) then
    v_reviewer := v_party_b;
    v_reviewed := v_party_a;
  else
    raise exception 'not authorized';
  end if;

  -- BR-REV-01: only a finished transaction.
  if v_status <> v_finished then
    raise exception 'Só é possível avaliar uma transação concluída';
  end if;

  begin
    insert into public.reviews (
      negotiation_id, supply_order_id, reviewer_org_id, reviewed_org_id,
      rating, comment, created_by
    )
    values (
      p_negotiation_id, p_supply_order_id, v_reviewer, v_reviewed,
      p_rating, v_comment, v_user
    )
    returning * into v_review;
  exception when unique_violation then
    raise exception 'Você já avaliou esta transação';
  end;

  return v_review;
end;
$$;

revoke execute on function public.submit_review(integer, uuid, uuid, text) from public, anon;
grant execute on function public.submit_review(integer, uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- get_reseller_profile — same as 0044 plus the rating (BR-REV-04).
-- ---------------------------------------------------------------------------
drop function public.get_reseller_profile(uuid);

create function public.get_reseller_profile(p_org_id uuid)
returns table (
  id uuid,
  name text,
  city text,
  avatar_url text,
  member_since timestamptz,
  active_offers integer,
  completed_deals integer,
  rating_average numeric,
  rating_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    org.id,
    org.name,
    org.city,
    (
      select p.avatar_url
      from public.organization_members om
      join public.profiles p on p.id = om.user_id
      where om.organization_id = org.id
        and om.status = 'ACTIVE'
      order by om.created_at
      limit 1
    ),
    org.created_at,
    (
      select count(*)::integer
      from public.offers o
      where o.organization_id = org.id
        and o.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED')
        and (
          public.is_org_member(o.organization_id)
          or o.network_id in (select public.auth_network_ids())
        )
    ),
    (
      select count(*)::integer
      from public.negotiations n
      where n.status = 'COMPLETED'
        and (n.seller_org_id = org.id or n.buyer_org_id = org.id)
    ),
    (select round(avg(r.rating), 1) from public.reviews r where r.reviewed_org_id = org.id),
    (select count(*)::integer from public.reviews r where r.reviewed_org_id = org.id)
  from public.organizations org
  where org.id = p_org_id
    and org.type = 'RESELLER'
    and (
      public.is_org_member(org.id)
      or exists (
        select 1
        from public.auth_org_ids() as my(id)
        where public.shares_network(my.id, org.id)
      )
    );
$$;

revoke execute on function public.get_reseller_profile(uuid) from public, anon;
grant execute on function public.get_reseller_profile(uuid) to authenticated;

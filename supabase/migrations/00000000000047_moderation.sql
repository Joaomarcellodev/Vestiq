-- VES-44 / VES-35 — SPEC-017: the platform admin reviews the reports
-- (migration 0046), archives them, removes an offer or suspends an
-- organization, always with a recorded reason.
--
-- Suspension is enforced in the database: the RLS helpers below only count
-- memberships of ACTIVE organizations, so a suspended store reads and writes
-- nothing — whatever client it uses — and the app shows /conta-suspensa.

alter table public.organizations
  add column suspended_at timestamptz,
  add column suspension_reason text
    check (suspension_reason is null or length(suspension_reason) between 1 and 1000);

-- ---------------------------------------------------------------------------
-- RLS helpers (migration 0002) — only memberships of ACTIVE organizations.
-- ---------------------------------------------------------------------------
create or replace function public.auth_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select om.organization_id
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  where om.user_id = (select auth.uid())
    and om.status = 'ACTIVE'
    and o.status = 'ACTIVE';
$$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.organization_id = org
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and o.status = 'ACTIVE'
  );
$$;

create or replace function public.has_org_role(org uuid, roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.organization_id = org
      and om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and om.role = any(roles)
      and o.status = 'ACTIVE'
  );
$$;

-- The moderation panel names every organization involved in a report.
create policy organizations_select_platform_admin on public.organizations
  for select using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- A suspended store leaves the network: no feed, offer page or profile.
-- Same as migration 0039 plus `org.status = 'ACTIVE'`.
-- ---------------------------------------------------------------------------
create or replace function public.list_visible_offers(
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
    coalesce(nullif(o.image_urls, '{}'), p.image_urls),
    o.edited_at
  from public.offers o
  join public.organizations org on org.id = o.organization_id
  join public.product_variants v on v.id = o.product_variant_id
  join public.products p on p.id = v.product_id
  where (p_offer_id is null or o.id = p_offer_id)
    and org.status = 'ACTIVE'
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

-- Same as migration 0045 plus `org.status = 'ACTIVE'`.
create or replace function public.get_reseller_profile(p_org_id uuid)
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
    and org.status = 'ACTIVE'
    and (
      public.is_org_member(org.id)
      or exists (
        select 1
        from public.auth_org_ids() as my(id)
        where public.shares_network(my.id, org.id)
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- moderation_actions — the audit trail (BR-MOD-03).
-- ---------------------------------------------------------------------------
create type public.moderation_action as enum (
  'DISMISS_REPORT', 'REMOVE_OFFER', 'SUSPEND_ORGANIZATION', 'REACTIVATE_ORGANIZATION'
);

create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  action public.moderation_action not null,
  report_id uuid references public.reports (id) on delete set null,
  target_org_id uuid not null references public.organizations (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  reason text not null check (length(reason) between 1 and 1000),
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index moderation_actions_org_idx on public.moderation_actions (target_org_id, created_at desc);

alter table public.moderation_actions enable row level security;

create policy moderation_actions_select_platform_admin on public.moderation_actions
  for select using (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- moderate_report — archive it, remove the reported offer or suspend the
-- organization behind it. Acting closes the other open reports it settles.
-- ---------------------------------------------------------------------------
create or replace function public.moderate_report(
  p_report_id uuid,
  p_action public.moderation_action,
  p_reason text
)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_reason text := nullif(trim(p_reason), '');
  v_report public.reports;
  v_offer_id uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;
  if v_reason is null then
    raise exception 'Informe o motivo da decisão';
  end if;
  if length(v_reason) > 1000 then
    raise exception 'Use no máximo 1000 caracteres no motivo';
  end if;

  select * into v_report from public.reports where id = p_report_id for update;
  if not found then
    raise exception 'Denúncia não encontrada';
  end if;
  if v_report.status <> 'OPEN' then
    raise exception 'Esta denúncia já foi resolvida';
  end if;

  if p_action = 'DISMISS_REPORT' then
    update public.reports
      set status = 'DISMISSED', resolution_note = v_reason, resolved_by = v_user, resolved_at = now()
      where id = v_report.id
      returning * into v_report;

  elsif p_action = 'REMOVE_OFFER' then
    if v_report.target_type <> 'OFFER' then
      raise exception 'Só uma denúncia de oferta remove a oferta';
    end if;
    v_offer_id := v_report.target_id;
    update public.offers
      set status = 'CANCELLED'
      where id = v_offer_id and status in ('ACTIVE', 'PARTIALLY_NEGOTIATED');
    update public.reports
      set status = 'ACTIONED', resolution_note = v_reason, resolved_by = v_user, resolved_at = now()
      where status = 'OPEN' and target_type = 'OFFER' and target_id = v_offer_id;

  elsif p_action = 'SUSPEND_ORGANIZATION' then
    update public.organizations
      set status = 'SUSPENDED', suspended_at = now(), suspension_reason = v_reason
      where id = v_report.target_org_id and type <> 'PLATFORM';
    if not found then
      raise exception 'not authorized';
    end if;
    update public.reports
      set status = 'ACTIONED', resolution_note = v_reason, resolved_by = v_user, resolved_at = now()
      where status = 'OPEN' and target_org_id = v_report.target_org_id;

  else
    raise exception 'Ação inválida para uma denúncia';
  end if;

  insert into public.moderation_actions (action, report_id, target_org_id, offer_id, reason, actor_id)
  values (p_action, v_report.id, v_report.target_org_id, v_offer_id, v_reason, v_user);

  select * into v_report from public.reports where id = p_report_id;
  return v_report;
end;
$$;

revoke execute on function public.moderate_report(uuid, public.moderation_action, text)
  from public, anon;
grant execute on function public.moderate_report(uuid, public.moderation_action, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- set_organization_suspension — suspend or reactivate outside a report.
-- ---------------------------------------------------------------------------
create or replace function public.set_organization_suspension(
  p_org_id uuid,
  p_suspended boolean,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text := nullif(trim(p_reason), '');
begin
  if not public.is_platform_admin() then
    raise exception 'not authorized';
  end if;
  if v_reason is null then
    raise exception 'Informe o motivo da decisão';
  end if;
  if length(v_reason) > 1000 then
    raise exception 'Use no máximo 1000 caracteres no motivo';
  end if;

  if p_suspended then
    update public.organizations
      set status = 'SUSPENDED', suspended_at = now(), suspension_reason = v_reason
      where id = p_org_id and type <> 'PLATFORM' and status = 'ACTIVE';
  else
    update public.organizations
      set status = 'ACTIVE', suspended_at = null, suspension_reason = null
      where id = p_org_id and status = 'SUSPENDED';
  end if;
  if not found then
    raise exception 'Organização não encontrada ou já neste estado';
  end if;

  insert into public.moderation_actions (action, target_org_id, reason, actor_id)
  values (
    (array['REACTIVATE_ORGANIZATION', 'SUSPEND_ORGANIZATION']::public.moderation_action[])[
      p_suspended::integer + 1
    ],
    p_org_id,
    v_reason,
    (select auth.uid())
  );
end;
$$;

revoke execute on function public.set_organization_suspension(uuid, boolean, text) from public, anon;
grant execute on function public.set_organization_suspension(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- list_moderation_reports — the queue, with what each report points at.
-- ---------------------------------------------------------------------------
create or replace function public.list_moderation_reports(
  p_status public.report_status default null,
  p_report_id uuid default null
)
returns table (
  id uuid,
  target_type public.report_target,
  target_id uuid,
  target_label text,
  target_active boolean,
  target_org_id uuid,
  target_org_name text,
  target_org_status public.organization_status,
  target_org_suspension_reason text,
  reporter_org_name text,
  reason public.report_reason,
  description text,
  status public.report_status,
  resolution_note text,
  resolved_at timestamptz,
  created_at timestamptz,
  open_reports_on_org integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.target_type,
    r.target_id,
    coalesce(
      (
        select p.name
        from public.offers o
        join public.product_variants v on v.id = o.product_variant_id
        join public.products p on p.id = v.product_id
        where r.target_type = 'OFFER' and o.id = r.target_id
      ),
      (
        select 'Negociação de ' || p.name
        from public.negotiations n
        join public.offers o on o.id = n.offer_id
        join public.product_variants v on v.id = o.product_variant_id
        join public.products p on p.id = v.product_id
        where r.target_type = 'NEGOTIATION' and n.id = r.target_id
      ),
      target.name
    ),
    exists (
      select 1 from public.offers o
      where r.target_type = 'OFFER'
        and o.id = r.target_id
        and o.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED')
    ),
    r.target_org_id,
    target.name,
    target.status,
    target.suspension_reason,
    reporter.name,
    r.reason,
    r.description,
    r.status,
    r.resolution_note,
    r.resolved_at,
    r.created_at,
    (
      select count(*)::integer
      from public.reports other
      where other.target_org_id = r.target_org_id and other.status = 'OPEN'
    )
  from public.reports r
  join public.organizations target on target.id = r.target_org_id
  join public.organizations reporter on reporter.id = r.reporter_org_id
  where public.is_platform_admin()
    and (p_status is null or r.status = p_status)
    and (p_report_id is null or r.id = p_report_id)
  order by r.created_at desc, r.id desc;
$$;

revoke execute on function public.list_moderation_reports(public.report_status, uuid) from public, anon;
grant execute on function public.list_moderation_reports(public.report_status, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- get_my_suspension — why the user's store is blocked (login and
-- /conta-suspensa). Only when no ACTIVE organization is left to her.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_suspension()
returns table (organization_name text, reason text, suspended_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select o.name, o.suspension_reason, o.suspended_at
  from public.organization_members om
  join public.organizations o on o.id = om.organization_id
  where om.user_id = (select auth.uid())
    and om.status = 'ACTIVE'
    and o.status = 'SUSPENDED'
    and not exists (select 1 from public.auth_org_ids())
  order by o.suspended_at desc
  limit 1;
$$;

revoke execute on function public.get_my_suspension() from public, anon;
grant execute on function public.get_my_suspension() to authenticated;

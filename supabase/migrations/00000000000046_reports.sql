-- VES-43 / VES-48 — SPEC-017: reporting an offer, a negotiation (its
-- conversation) or a reseller. The reporter gets a confirmation and sees only
-- her own reports; the platform admin reviews them in the moderation panel
-- (VES-44, migration 0047).

create type public.report_target as enum ('OFFER', 'NEGOTIATION', 'ORGANIZATION');
create type public.report_reason as enum (
  'SPAM', 'FRAUDE', 'PRODUTO_FALSIFICADO', 'CONTEUDO_INADEQUADO', 'ASSEDIO', 'OUTRO'
);
create type public.report_status as enum ('OPEN', 'DISMISSED', 'ACTIONED');

-- ---------------------------------------------------------------------------
-- is_platform_admin — an active PLATFORM_ADMIN of the platform organization.
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_admin()
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
    where om.user_id = (select auth.uid())
      and om.status = 'ACTIVE'
      and om.role = 'PLATFORM_ADMIN'
      and o.type = 'PLATFORM'
      and o.status = 'ACTIVE'
  );
$$;

revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_org_id uuid not null references public.organizations (id) on delete cascade,
  reporter_user_id uuid references public.profiles (id) on delete set null,
  target_type public.report_target not null,
  -- the offer, negotiation or organization reported (no FK: polymorphic)
  target_id uuid not null,
  -- the organization behind the target — the one moderation acts on
  target_org_id uuid not null references public.organizations (id) on delete cascade,
  reason public.report_reason not null,
  description text check (description is null or length(description) between 1 and 1000),
  status public.report_status not null default 'OPEN',
  resolution_note text check (resolution_note is null or length(resolution_note) <= 1000),
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (reporter_org_id <> target_org_id)
);

-- BR-REP-04: one open report per reporter and target.
create unique index reports_open_per_reporter_key
  on public.reports (reporter_org_id, target_type, target_id) where status = 'OPEN';
create index reports_status_idx on public.reports (status, created_at desc);
create index reports_target_idx on public.reports (target_type, target_id);

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

alter table public.reports enable row level security;

-- BR-REP-05: the reporter sees her own reports only (never who else reported);
-- the platform admin sees all. Writes only through the functions.
create policy reports_select on public.reports
  for select using (public.is_org_member(reporter_org_id) or public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- submit_report — the reporter must be able to see what she reports.
-- ---------------------------------------------------------------------------
create or replace function public.submit_report(
  p_target_type public.report_target,
  p_target_id uuid,
  p_reason public.report_reason,
  p_description text default null
)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_description text := nullif(trim(p_description), '');
  v_reporter uuid;
  v_target_org uuid;
  v_seller uuid;
  v_buyer uuid;
  v_report public.reports;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if p_reason is null then
    raise exception 'Escolha o motivo da denúncia';
  end if;
  if v_description is not null and length(v_description) > 1000 then
    raise exception 'Use no máximo 1000 caracteres na descrição';
  end if;

  if p_target_type = 'OFFER' then
    -- an offer the caller sees in her network feed (offers_select, 0008)
    select o.organization_id, nm.reseller_id
      into v_target_org, v_reporter
      from public.offers o
      join public.network_members nm
        on nm.network_id = o.network_id and nm.status = 'ACTIVE'
      where o.id = p_target_id
        and o.status in ('ACTIVE', 'PARTIALLY_NEGOTIATED')
        and nm.reseller_id in (select public.auth_org_ids())
      order by nm.reseller_id = o.organization_id
      limit 1;
  elsif p_target_type = 'NEGOTIATION' then
    -- a party reports the other party's conduct in the conversation
    select n.seller_org_id, n.buyer_org_id
      into v_seller, v_buyer
      from public.negotiations n
      where n.id = p_target_id;
    if public.is_org_member(v_seller) then
      v_reporter := v_seller;
      v_target_org := v_buyer;
    elsif public.is_org_member(v_buyer) then
      v_reporter := v_buyer;
      v_target_org := v_seller;
    end if;
  else
    -- a reseller of one of the caller's networks (her public profile, 0044)
    select org.id, my.id
      into v_target_org, v_reporter
      from public.organizations org
      cross join public.auth_org_ids() as my(id)
      where org.id = p_target_id
        and org.type = 'RESELLER'
        and (org.id = my.id or public.shares_network(my.id, org.id))
      order by org.id = my.id
      limit 1;
  end if;

  if v_reporter is null then
    raise exception 'not authorized';
  end if;
  if v_reporter = v_target_org then
    raise exception 'Você não pode denunciar a sua própria loja';
  end if;

  begin
    insert into public.reports (
      reporter_org_id, reporter_user_id, target_type, target_id, target_org_id,
      reason, description
    )
    values (
      v_reporter, v_user, p_target_type, p_target_id, v_target_org,
      p_reason, v_description
    )
    returning * into v_report;
  exception when unique_violation then
    raise exception 'Você já denunciou isto. A moderação vai analisar.';
  end;

  return v_report;
end;
$$;

revoke execute on function public.submit_report(public.report_target, uuid, public.report_reason, text)
  from public, anon;
grant execute on function public.submit_report(public.report_target, uuid, public.report_reason, text)
  to authenticated;

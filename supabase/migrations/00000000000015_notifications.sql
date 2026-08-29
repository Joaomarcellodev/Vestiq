-- SPEC-008/009 (extensão) — central de notificações in-app.
-- Notificações são por organização (equipes pequenas); qualquer membro ativo
-- lê e marca como lida. Só triggers SECURITY DEFINER escrevem.

create type public.notification_type as enum (
  'OFFER_PUBLISHED',
  'NEGOTIATION_OPENED',
  'NEGOTIATION_MESSAGE',
  'NEGOTIATION_ACCEPTED',
  'NEGOTIATION_REJECTED',
  'NEGOTIATION_CANCELLED',
  'NEGOTIATION_COMPLETED'
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_org_idx on public.notifications (organization_id, created_at desc);
create index notifications_unread_idx on public.notifications (organization_id)
  where read_at is null;

alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select using (public.is_org_member(organization_id));

create policy notifications_update on public.notifications
  for update using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- Fan-out: oferta publicada → notifica as demais revendedoras ATIVAS da rede
-- ---------------------------------------------------------------------------
create or replace function public.notify_offer_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product text;
  v_seller text;
begin
  if new.status <> 'ACTIVE' then
    return new;
  end if;

  select p.name into v_product
  from public.product_variants pv
  join public.products p on p.id = pv.product_id
  where pv.id = new.product_variant_id;

  select name into v_seller from public.organizations where id = new.organization_id;

  insert into public.notifications (organization_id, type, title, body, link)
  select
    nm.reseller_id,
    'OFFER_PUBLISHED',
    'Nova oferta na rede',
    coalesce(v_seller, 'Uma revendedora') || ' ofertou ' || coalesce(v_product, 'uma peça') || '.',
    '/rede/ofertas/' || new.id
  from public.network_members nm
  where nm.network_id = new.network_id
    and nm.status = 'ACTIVE'
    and nm.reseller_id is not null
    and nm.reseller_id <> new.organization_id;

  return new;
end;
$$;

create trigger offers_notify_published
  after insert on public.offers
  for each row execute function public.notify_offer_published();

-- ---------------------------------------------------------------------------
-- Fan-out: evento de negociação → notifica a contraparte (quem NÃO agiu)
-- ---------------------------------------------------------------------------
create or replace function public.notify_negotiation_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_neg public.negotiations%rowtype;
  v_actor_org uuid;
  v_recipient uuid;
  v_type public.notification_type;
  v_title text;
  v_product text;
begin
  select * into v_neg from public.negotiations where id = new.negotiation_id;
  if not found then
    return new;
  end if;

  -- org do autor entre as duas partes
  select om.organization_id into v_actor_org
  from public.organization_members om
  where om.user_id = new.actor_id
    and om.organization_id in (v_neg.seller_org_id, v_neg.buyer_org_id)
  limit 1;

  if v_actor_org is null then
    return new;
  end if;

  v_recipient := case
    when v_actor_org = v_neg.seller_org_id then v_neg.buyer_org_id
    else v_neg.seller_org_id
  end;

  select case new.type
    when 'CREATED' then 'NEGOTIATION_OPENED'::public.notification_type
    when 'MESSAGE' then 'NEGOTIATION_MESSAGE'
    when 'ACCEPTED' then 'NEGOTIATION_ACCEPTED'
    when 'REJECTED' then 'NEGOTIATION_REJECTED'
    when 'CANCELLED' then 'NEGOTIATION_CANCELLED'
    when 'COMPLETED' then 'NEGOTIATION_COMPLETED'
  end into v_type;

  v_title := case new.type
    when 'CREATED' then 'Nova proposta recebida'
    when 'MESSAGE' then 'Nova mensagem na negociação'
    when 'ACCEPTED' then 'Sua proposta foi aceita'
    when 'REJECTED' then 'Sua proposta foi recusada'
    when 'CANCELLED' then 'Negociação cancelada'
    when 'COMPLETED' then 'Transferência concluída'
  end;

  if v_type is null then
    return new;
  end if;

  select p.name into v_product
  from public.offers o
  join public.product_variants pv on pv.id = o.product_variant_id
  join public.products p on p.id = pv.product_id
  where o.id = v_neg.offer_id;

  insert into public.notifications (organization_id, type, title, body, link)
  values (
    v_recipient,
    v_type,
    v_title,
    coalesce(v_product, 'Negociação') || ' · ' || to_char(v_neg.amount, 'FM999G999G990D00'),
    '/negociacoes/' || v_neg.id
  );

  return new;
end;
$$;

create trigger negotiation_events_notify
  after insert on public.negotiation_events
  for each row execute function public.notify_negotiation_event();

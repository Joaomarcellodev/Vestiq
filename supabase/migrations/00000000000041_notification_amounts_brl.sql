-- VES-85 — negotiation notifications show the amount as "R$ 160,00".
--
-- `notify_negotiation_event` (0015) wrote the amount with
-- `to_char(…, 'FM999G999G990D00')`, whose separators follow the server's
-- `lc_numeric` — en_US on Supabase — so the bell read "Bolsa · 160.00", with no
-- currency and a decimal point. `format_brl` uses literal separators and swaps
-- them, like the refund notification already does (0036), so the text no
-- longer depends on the server locale.
--
-- Notifications already sent are rewritten the same way.

create or replace function public.format_brl(p_value numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'R$ ' || translate(to_char(round(p_value, 2), 'FM999,999,999,990.00'), ',.', '.,');
$$;

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
    coalesce(v_product, 'Negociação') || ' · ' || public.format_brl(v_neg.amount),
    '/negociacoes/' || v_neg.id
  );

  return new;
end;
$$;

update public.notifications
set body = regexp_replace(body, ' · [0-9,]+\.[0-9]{2}$', '')
  || ' · '
  || public.format_brl(replace(substring(body from ' · ([0-9,]+\.[0-9]{2})$'), ',', '')::numeric)
where type::text like 'NEGOTIATION\_%'
  and body ~ ' · [0-9,]+\.[0-9]{2}$';

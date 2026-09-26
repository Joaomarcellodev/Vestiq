-- ADR-0010 — chat de negociação em tempo real (RF-NEG-010/011).
-- Supabase Realtime (postgres_changes) streams inserts/updates of these tables
-- to subscribed clients, applying each subscriber's RLS select policies
-- (can_access_negotiation / negotiations_select): only the two parties receive them.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'negotiation_events'
  ) then
    alter publication supabase_realtime add table public.negotiation_events;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'negotiations'
  ) then
    alter publication supabase_realtime add table public.negotiations;
  end if;
end;
$$;

-- BR-NEG-11 — sends a chat message and returns the event, so the screen can
-- swap its optimistic bubble for the real one without reloading.
create or replace function public.send_negotiation_message(
  p_negotiation_id uuid,
  p_body text
)
returns public.negotiation_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_neg public.negotiations;
  v_body text := btrim(coalesce(p_body, ''));
  v_event public.negotiation_events;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated';
  end if;

  -- share lock: messages don't serialize each other, but wait for a concurrent status change
  select * into v_neg from public.negotiations where id = p_negotiation_id for share;
  if not found
     or not (public.is_org_member(v_neg.seller_org_id) or public.is_org_member(v_neg.buyer_org_id)) then
    raise exception 'not authorized';
  end if;
  if v_neg.status in ('REJECTED', 'CANCELLED', 'COMPLETED') then
    raise exception 'Negociação encerrada';
  end if;
  if v_body = '' then
    raise exception 'Escreva uma mensagem';
  end if;
  if length(v_body) > 1000 then
    raise exception 'A mensagem pode ter até 1.000 caracteres';
  end if;

  insert into public.negotiation_events (negotiation_id, type, body, actor_id)
  values (p_negotiation_id, 'MESSAGE', v_body, (select auth.uid()))
  returning * into v_event;

  return v_event;
end;
$$;

revoke execute on function public.send_negotiation_message(uuid, text) from public, anon;
grant execute on function public.send_negotiation_message(uuid, text) to authenticated;

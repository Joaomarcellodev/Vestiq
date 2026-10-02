-- ADR-0011 — notificações em tempo real (RF-NOTIF-001/002, VES-22).
-- Supabase Realtime (postgres_changes) streams new rows of `notifications` to
-- subscribed clients, applying each subscriber's RLS select policy
-- (notifications_select → is_org_member): only members of the recipient
-- organization receive them. Rows are still written only by the
-- SECURITY DEFINER triggers of migrations 0015 and 0019.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

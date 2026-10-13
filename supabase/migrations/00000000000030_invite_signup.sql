-- VES-95 — a reseller invited to a network creates her account from the invite.
--
-- `/convite/<token>` must work without a session: the invitee may open the
-- link in another browser, after the email link expired, or receive it copied
-- by the factory. `network_members` is hidden from anon by RLS, so the page
-- reads the one invite it was given through `get_network_invite`. The token is
-- an unguessable uuid sent only to the invitee (or to the factory that issued
-- it), so whoever holds it may see that invite — and nothing else.

create or replace function public.get_network_invite(p_token uuid)
returns table (
  email text,
  network_name text,
  factory_name text,
  -- PENDING: can be accepted · EXPIRED: past invite_expires_at · USED: already accepted or disabled
  state text,
  -- the invite email already has an account with a password → sign in, don't sign up
  has_account boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    nm.invited_email::text,
    fn.name,
    o.name,
    case
      when nm.status <> 'INVITED' then 'USED'
      when nm.invite_expires_at < now() then 'EXPIRED'
      else 'PENDING'
    end,
    exists (
      select 1 from auth.users u
      where lower(u.email) = lower(nm.invited_email::text)
        and coalesce(u.encrypted_password, '') <> ''
    )
  from public.network_members nm
  join public.factory_networks fn on fn.id = nm.network_id
  join public.organizations o on o.id = fn.factory_id
  where nm.invite_token = p_token;
$$;

revoke all on function public.get_network_invite(uuid) from public;
grant execute on function public.get_network_invite(uuid) to anon, authenticated;

-- The invite email (RF-NET-003) creates the auth user up front, without a
-- password (`inviteUserByEmail`). Signing up from the invite must claim that
-- user instead of failing with "email already registered". This resolves it
-- for the server action, which then sets the password with the admin API.
-- Only a password-less account is returned: one with a password belongs to
-- someone who signs in to accept.
create or replace function public.invite_signup_user_id(p_token uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from public.network_members nm
  join auth.users u on lower(u.email) = lower(nm.invited_email::text)
  where nm.invite_token = p_token
    and nm.status = 'INVITED'
    and nm.invite_expires_at >= now()
    and coalesce(u.encrypted_password, '') = ''
  limit 1;
$$;

revoke all on function public.invite_signup_user_id(uuid) from public, anon, authenticated;
grant execute on function public.invite_signup_user_id(uuid) to service_role;

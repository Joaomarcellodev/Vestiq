-- VES-95 (fix) — the invite link only claims an account nobody uses yet.
--
-- `invite_signup_user_id` (0030) handed over any password-less account with
-- the invited email, and the factory holds the token too (it copies the link
-- in `/rede-fabrica`). So factory B could invite a reseller that factory A had
-- already invited — her account exists, created by A's invite email, still
-- without a password — set a password of its own choosing, and keep a way into
-- the account she goes on to use. Same for a password-less account that
-- already belongs to an organization.
--
-- Now the account is claimed only while it is still empty: no organization
-- membership and no open invite from another network. Otherwise she proves the
-- email (the invite email's link, or "Esqueci minha senha") and signs in to
-- accept — and `get_network_invite` reports `has_account` so the page shows
-- the login instead of a signup that would be refused.

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
    and not exists (
      select 1 from public.organization_members om where om.user_id = u.id
    )
    and not exists (
      select 1 from public.network_members other
      where other.invited_email = nm.invited_email
        and other.network_id <> nm.network_id
        and other.status = 'INVITED'
        and other.invite_expires_at >= now()
    )
  limit 1;
$$;

create or replace function public.get_network_invite(p_token uuid)
returns table (
  email text,
  network_name text,
  factory_name text,
  -- PENDING: can be accepted · EXPIRED: past invite_expires_at · USED: already accepted or disabled
  state text,
  -- the invite email already has an account this link can't claim → sign in, don't sign up
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
    ) and public.invite_signup_user_id(p_token) is null
  from public.network_members nm
  join public.factory_networks fn on fn.id = nm.network_id
  join public.organizations o on o.id = fn.factory_id
  where nm.invite_token = p_token;
$$;

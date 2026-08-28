-- Safety net: allow a user to create their own profile row if the
-- on_auth_user_created trigger ever failed to.

create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- RLS helper lives outside the exposed public API schema.
create or replace function private.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id
  from public.profiles
  where id = (select auth.uid())
$$;
revoke execute on function private.current_household_id() from public, anon;
grant execute on function private.current_household_id() to authenticated;

-- Rebuild policies against the private helper and explicitly scope them to authenticated users.
drop policy if exists "household members read household" on public.households;
create policy "household members read household" on public.households
for select to authenticated
using (id = (select private.current_household_id()));

drop policy if exists "household members read profiles" on public.profiles;
create policy "household members read profiles" on public.profiles
for select to authenticated
using (household_id = (select private.current_household_id()));

drop policy if exists "users read own profile before household" on public.profiles;
create policy "users read own profile before household" on public.profiles
for select to authenticated
using (id = (select auth.uid()));

drop policy if exists "household members read events" on public.events;
create policy "household members read events" on public.events
for select to authenticated
using (household_id = (select private.current_household_id()));

drop policy if exists "household members create events" on public.events;
create policy "household members create events" on public.events
for insert to authenticated
with check (
  household_id = (select private.current_household_id())
  and created_by = (select auth.uid())
);

drop policy if exists "household members update events" on public.events;
create policy "household members update events" on public.events
for update to authenticated
using (household_id = (select private.current_household_id()))
with check (household_id = (select private.current_household_id()));

drop policy if exists "household members delete events" on public.events;
create policy "household members delete events" on public.events
for delete to authenticated
using (household_id = (select private.current_household_id()));

drop policy if exists "household members read participants" on public.event_participants;
create policy "household members read participants" on public.event_participants
for select to authenticated
using (exists (
  select 1 from public.events e
  where e.id = event_id
    and e.household_id = (select private.current_household_id())
));

drop policy if exists "household members add participants" on public.event_participants;
create policy "household members add participants" on public.event_participants
for insert to authenticated
with check (exists (
  select 1 from public.events e
  where e.id = event_id
    and e.household_id = (select private.current_household_id())
));

drop policy if exists "household members remove participants" on public.event_participants;
create policy "household members remove participants" on public.event_participants
for delete to authenticated
using (exists (
  select 1 from public.events e
  where e.id = event_id
    and e.household_id = (select private.current_household_id())
));

drop policy if exists "household members read recurrence exceptions" on public.recurrence_exceptions;
create policy "household members read recurrence exceptions" on public.recurrence_exceptions
for select to authenticated
using (exists (
  select 1 from public.events e
  where e.id = event_id
    and e.household_id = (select private.current_household_id())
));

drop policy if exists "household members manage recurrence exceptions" on public.recurrence_exceptions;
create policy "household members manage recurrence exceptions" on public.recurrence_exceptions
for all to authenticated
using (exists (
  select 1 from public.events e
  where e.id = event_id
    and e.household_id = (select private.current_household_id())
))
with check (exists (
  select 1 from public.events e
  where e.id = event_id
    and e.household_id = (select private.current_household_id())
));

-- Private implementations for privileged onboarding operations.
create or replace function private.make_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare code text;
begin
  loop
    code := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end $$;

create or replace function private.create_household_for_current_user(p_display_name text, p_color text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare hid uuid; code text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if exists(select 1 from public.profiles where id = auth.uid() and household_id is not null) then
    raise exception 'Already in a household';
  end if;
  code := private.make_invite_code();
  insert into public.households(name, invite_code)
  values('Our Calendar', code)
  returning id into hid;
  insert into public.profiles(id, display_name, color, household_id)
  values(auth.uid(), left(trim(p_display_name), 80), left(trim(p_color), 32), hid)
  on conflict(id) do update
    set display_name = excluded.display_name,
        color = excluded.color,
        household_id = excluded.household_id;
  return code;
end $$;

create or replace function private.join_household_by_code(p_invite_code text, p_display_name text, p_color text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if exists(select 1 from public.profiles where id = auth.uid() and household_id is not null) then
    raise exception 'Already in a household';
  end if;
  select id into hid
  from public.households
  where invite_code = upper(trim(p_invite_code));
  if hid is null then raise exception 'Invite code not found'; end if;
  insert into public.profiles(id, display_name, color, household_id)
  values(auth.uid(), left(trim(p_display_name), 80), left(trim(p_color), 32), hid)
  on conflict(id) do update
    set display_name = excluded.display_name,
        color = excluded.color,
        household_id = excluded.household_id;
end $$;

revoke execute on all functions in schema private from public, anon;
grant execute on function private.current_household_id() to authenticated;
grant execute on function private.create_household_for_current_user(text, text) to authenticated;
grant execute on function private.join_household_by_code(text, text, text) to authenticated;

-- Public wrappers are invoker functions and expose only the intended RPC surface.
create or replace function public.create_household_for_current_user(p_display_name text, p_color text)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.create_household_for_current_user(p_display_name, p_color)
$$;

create or replace function public.join_household_by_code(p_invite_code text, p_display_name text, p_color text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.join_household_by_code(p_invite_code, p_display_name, p_color)
$$;

create or replace function public.current_household_invite_code()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select h.invite_code
  from public.households h
  join public.profiles p on p.household_id = h.id
  where p.id = (select auth.uid())
$$;

revoke execute on function public.create_household_for_current_user(text, text) from public, anon;
revoke execute on function public.join_household_by_code(text, text, text) from public, anon;
revoke execute on function public.current_household_invite_code() from public, anon;
grant execute on function public.create_household_for_current_user(text, text) to authenticated;
grant execute on function public.join_household_by_code(text, text, text) to authenticated;
grant execute on function public.current_household_invite_code() to authenticated;

-- The auth trigger function is not an RPC and should not be executable by browser roles.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name, color, household_id)
  values(new.id, coalesce(split_part(new.email, '@', 1), 'Me'), '#1E3A8A', null)
  on conflict (id) do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Remove superseded public helpers.
drop function if exists public.make_invite_code();
drop function if exists public.current_household_id();

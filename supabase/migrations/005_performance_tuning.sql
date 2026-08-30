create index if not exists profiles_household_id_idx on public.profiles(household_id);
create index if not exists events_household_id_idx on public.events(household_id);
create index if not exists events_created_by_idx on public.events(created_by);
create index if not exists event_participants_user_id_idx on public.event_participants(user_id);

-- Combine profile visibility into one permissive SELECT policy.
drop policy if exists "household members read profiles" on public.profiles;
drop policy if exists "users read own profile before household" on public.profiles;
create policy "users read own or household profiles" on public.profiles
for select to authenticated
using (
  id = (select auth.uid())
  or household_id = (select private.current_household_id())
);

-- Avoid overlapping SELECT policies on recurrence exceptions.
drop policy if exists "household members manage recurrence exceptions" on public.recurrence_exceptions;
create policy "household members insert recurrence exceptions" on public.recurrence_exceptions
for insert to authenticated
with check (exists (
  select 1 from public.events e
  where e.id = event_id
    and e.household_id = (select private.current_household_id())
));
create policy "household members update recurrence exceptions" on public.recurrence_exceptions
for update to authenticated
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
create policy "household members delete recurrence exceptions" on public.recurrence_exceptions
for delete to authenticated
using (exists (
  select 1 from public.events e
  where e.id = event_id
    and e.household_id = (select private.current_household_id())
));

create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our Calendar',
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  color text not null,
  household_id uuid references public.households(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  location text,
  notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  event_date date not null,
  all_day boolean not null default false,
  blocks_all_day boolean not null default false,
  recurrence_rule text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_event_times check (
    (all_day = true) or (starts_at is not null and ends_at is not null and ends_at > starts_at)
  )
);

create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.recurrence_exceptions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  occurrence_date date not null,
  cancelled boolean not null default false,
  override_start timestamptz,
  override_end timestamptz,
  override_title text,
  override_location text,
  override_notes text,
  unique(event_id, occurrence_date)
);

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.recurrence_exceptions enable row level security;

create or replace function public.current_household_id()
returns uuid language sql stable security definer set search_path = public
as $$ select household_id from public.profiles where id = auth.uid() $$;

create policy "household members read household" on public.households
for select using (id = public.current_household_id());

create policy "household members read profiles" on public.profiles
for select using (household_id = public.current_household_id());

create policy "household members read events" on public.events
for select using (household_id = public.current_household_id());
create policy "household members create events" on public.events
for insert with check (household_id = public.current_household_id() and created_by = auth.uid());
create policy "household members update events" on public.events
for update using (household_id = public.current_household_id()) with check (household_id = public.current_household_id());
create policy "household members delete events" on public.events
for delete using (household_id = public.current_household_id());

create policy "household members read participants" on public.event_participants
for select using (exists (select 1 from public.events e where e.id = event_id and e.household_id = public.current_household_id()));
create policy "household members add participants" on public.event_participants
for insert with check (exists (select 1 from public.events e where e.id = event_id and e.household_id = public.current_household_id()));
create policy "household members remove participants" on public.event_participants
for delete using (exists (select 1 from public.events e where e.id = event_id and e.household_id = public.current_household_id()));

create policy "household members read recurrence exceptions" on public.recurrence_exceptions
for select using (exists (select 1 from public.events e where e.id = event_id and e.household_id = public.current_household_id()));
create policy "household members manage recurrence exceptions" on public.recurrence_exceptions
for all using (exists (select 1 from public.events e where e.id = event_id and e.household_id = public.current_household_id()))
with check (exists (select 1 from public.events e where e.id = event_id and e.household_id = public.current_household_id()));

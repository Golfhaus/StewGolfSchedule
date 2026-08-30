-- Explicit Data API grants for signed-in household members.
grant select on table public.households to authenticated;
grant select on table public.profiles to authenticated;
grant select, insert, update, delete on table public.events to authenticated;
grant select, insert, delete on table public.event_participants to authenticated;
grant select, insert, update, delete on table public.recurrence_exceptions to authenticated;

-- Keep unauthenticated callers away from application tables.
revoke all on table public.households from anon;
revoke all on table public.profiles from anon;
revoke all on table public.events from anon;
revoke all on table public.event_participants from anon;
revoke all on table public.recurrence_exceptions from anon;

-- Explicitly restrict helper/privileged functions. Postgres grants EXECUTE to PUBLIC by default.
revoke execute on function public.current_household_id() from public, anon, authenticated;
revoke execute on function public.make_invite_code() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_household_for_current_user(text, text) from public, anon;
revoke execute on function public.join_household_by_code(text, text, text) from public, anon;
revoke execute on function public.current_household_invite_code() from public, anon;

-- These three RPCs are intentionally callable by signed-in users and validate auth.uid().
grant execute on function public.create_household_for_current_user(text, text) to authenticated;
grant execute on function public.join_household_by_code(text, text, text) to authenticated;
grant execute on function public.current_household_invite_code() to authenticated;

-- Prevent future functions in public from becoming executable by browser roles by default.
alter default privileges for role postgres in schema public revoke execute on functions from public, anon, authenticated;

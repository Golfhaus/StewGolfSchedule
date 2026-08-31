create or replace function private.add_current_user_to_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_household uuid;
  v_event public.events%rowtype;
  v_conflict boolean := false;
begin
  if v_actor is null then
    raise exception 'Not authenticated';
  end if;

  select household_id into v_household
  from public.profiles
  where id = v_actor;

  if v_household is null then
    raise exception 'No household';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
    and household_id = v_household;

  if not found then
    raise exception 'Event not found';
  end if;

  if exists (
    select 1 from public.event_participants
    where event_id = p_event_id and user_id = v_actor
  ) then
    return;
  end if;

  if not (v_event.all_day and not v_event.blocks_all_day) then
    select exists (
      select 1
      from public.events e
      join public.event_participants ep on ep.event_id = e.id
      where ep.user_id = v_actor
        and e.id <> p_event_id
        and e.event_date = v_event.event_date
        and not (e.all_day and not e.blocks_all_day)
        and (
          v_event.all_day
          or e.all_day
          or (e.starts_at < v_event.ends_at and e.ends_at > v_event.starts_at)
        )
    ) into v_conflict;
  end if;

  if v_conflict then
    raise exception 'SELF_CONFLICT';
  end if;

  insert into public.event_participants(event_id, user_id)
  values (p_event_id, v_actor);
end;
$$;

create or replace function public.add_current_user_to_event(p_event_id uuid)
returns void
language sql
set search_path = ''
as $$
  select private.add_current_user_to_event(p_event_id)
$$;

revoke all on function private.add_current_user_to_event(uuid) from public;
revoke all on function public.add_current_user_to_event(uuid) from public;
grant execute on function private.add_current_user_to_event(uuid) to authenticated;
grant execute on function public.add_current_user_to_event(uuid) to authenticated;

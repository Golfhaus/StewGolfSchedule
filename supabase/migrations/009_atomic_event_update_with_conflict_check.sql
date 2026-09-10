create or replace function private.update_event_for_current_user(
  p_event_id uuid,
  p_title text,
  p_location text,
  p_notes text,
  p_event_date date,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_all_day boolean,
  p_blocks_all_day boolean,
  p_recurrence_rule text,
  p_participant_ids uuid[],
  p_override_self_conflict boolean default false
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_household uuid;
  v_event_household uuid;
  v_self_conflict boolean := false;
begin
  if v_actor is null then raise exception 'Not authenticated'; end if;

  select household_id into v_household from public.profiles where id = v_actor;
  if v_household is null then raise exception 'No household'; end if;

  select household_id into v_event_household from public.events where id = p_event_id;
  if v_event_household is null or v_event_household is distinct from v_household then
    raise exception 'Event not found';
  end if;

  if coalesce(array_length(p_participant_ids, 1), 0) = 0 then
    raise exception 'At least one participant is required';
  end if;

  if exists (
    select 1 from unnest(p_participant_ids) pid
    left join public.profiles p on p.id = pid
    where p.id is null or p.household_id is distinct from v_household
  ) then raise exception 'Invalid participant'; end if;

  if not p_all_day and (p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at) then
    raise exception 'Invalid event time';
  end if;

  if v_actor = any(p_participant_ids) and not (p_all_day and not p_blocks_all_day) then
    select exists (
      select 1
      from public.events e
      join public.event_participants ep on ep.event_id = e.id
      where ep.user_id = v_actor
        and e.id <> p_event_id
        and e.event_date = p_event_date
        and not (e.all_day and not e.blocks_all_day)
        and (p_all_day or e.all_day or (e.starts_at < p_ends_at and e.ends_at > p_starts_at))
    ) into v_self_conflict;
  end if;

  if v_self_conflict and not p_override_self_conflict then raise exception 'SELF_CONFLICT'; end if;

  update public.events
  set title = left(trim(p_title), 200),
      location = nullif(trim(p_location), ''),
      notes = nullif(trim(p_notes), ''),
      event_date = p_event_date,
      starts_at = case when p_all_day then null else p_starts_at end,
      ends_at = case when p_all_day then null else p_ends_at end,
      all_day = p_all_day,
      blocks_all_day = p_blocks_all_day,
      recurrence_rule = nullif(p_recurrence_rule, ''),
      updated_at = now()
  where id = p_event_id;

  delete from public.event_participants where event_id = p_event_id;
  insert into public.event_participants(event_id, user_id)
  select p_event_id, pid from unnest(p_participant_ids) pid;
end;
$$;

create or replace function public.update_event_for_current_user(
  p_event_id uuid,
  p_title text,
  p_location text,
  p_notes text,
  p_event_date date,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_all_day boolean,
  p_blocks_all_day boolean,
  p_recurrence_rule text,
  p_participant_ids uuid[],
  p_override_self_conflict boolean default false
) returns void
language sql
set search_path = ''
as $$
  select private.update_event_for_current_user(
    p_event_id, p_title, p_location, p_notes, p_event_date, p_starts_at, p_ends_at,
    p_all_day, p_blocks_all_day, p_recurrence_rule, p_participant_ids, p_override_self_conflict
  )
$$;

revoke all on function public.update_event_for_current_user(uuid,text,text,text,date,timestamptz,timestamptz,boolean,boolean,text,uuid[],boolean) from public, anon;
grant execute on function public.update_event_for_current_user(uuid,text,text,text,date,timestamptz,timestamptz,boolean,boolean,text,uuid[],boolean) to authenticated;

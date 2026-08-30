alter table public.households add column if not exists invite_code text unique;

create or replace function public.make_invite_code()
returns text language plpgsql as $$
declare code text;
begin
  loop
    code := upper(substr(encode(gen_random_bytes(6),'hex'),1,8));
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name, color, household_id)
  values(new.id, coalesce(split_part(new.email,'@',1),'Me'), '#1E3A8A', null)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.create_household_for_current_user(p_display_name text, p_color text)
returns text language plpgsql security definer set search_path = public as $$
declare hid uuid; code text;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if exists(select 1 from public.profiles where id=auth.uid() and household_id is not null) then raise exception 'Already in a household'; end if;
  code := public.make_invite_code();
  insert into public.households(name, invite_code) values('Our Calendar', code) returning id into hid;
  insert into public.profiles(id, display_name, color, household_id)
  values(auth.uid(), p_display_name, p_color, hid)
  on conflict(id) do update set display_name=excluded.display_name,color=excluded.color,household_id=excluded.household_id;
  return code;
end $$;

create or replace function public.join_household_by_code(p_invite_code text, p_display_name text, p_color text)
returns void language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select id into hid from public.households where invite_code = upper(trim(p_invite_code));
  if hid is null then raise exception 'Invite code not found'; end if;
  insert into public.profiles(id, display_name, color, household_id)
  values(auth.uid(), p_display_name, p_color, hid)
  on conflict(id) do update set display_name=excluded.display_name,color=excluded.color,household_id=excluded.household_id;
end $$;

create or replace function public.current_household_invite_code()
returns text language sql stable security definer set search_path = public as $$
  select h.invite_code from public.households h join public.profiles p on p.household_id=h.id where p.id=auth.uid()
$$;

grant execute on function public.create_household_for_current_user(text,text) to authenticated;
grant execute on function public.join_household_by_code(text,text,text) to authenticated;
grant execute on function public.current_household_invite_code() to authenticated;

create policy "users read own profile before household" on public.profiles
for select using (id = auth.uid());

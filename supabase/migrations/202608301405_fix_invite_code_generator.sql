create or replace function private.make_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare code text;
begin
  loop
    code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;
  return code;
end
$$;

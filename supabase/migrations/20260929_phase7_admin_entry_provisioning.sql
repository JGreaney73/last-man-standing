-- New Auth accounts receive a profile only. Entries are provisioned by an admin.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(new.raw_user_meta_data ->> 'display_name', new.email)
  );

  return new;
end;
$$;

drop function if exists public.create_competition_entry();
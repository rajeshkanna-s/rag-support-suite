-- Run this once in Supabase SQL Editor for an existing database.
-- It makes every existing and future signed-in user an admin.

update public.profiles set role = 'admin';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'admin')
  on conflict (id) do update set role = 'admin', email = excluded.email;

  return new;
end;
$$;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select user_id is not null;
$$;

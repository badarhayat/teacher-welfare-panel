-- Email-only faculty access: auto-approve UET users, backfill profiles.
-- Run against the live Supabase project (SQL Editor).

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
declare
  is_uet boolean := lower(coalesce(new.email, '')) like '%@uet.edu.pk';
begin
  if public.is_email_blocked(new.email) then
    raise exception 'This email address is not allowed to register'
      using errcode = 'P0001';
  end if;

  insert into public.profiles (
    id, email, full_name, campus, department, designation, role,
    is_approved, approved_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'campus', 'Main Campus'),
    coalesce(new.raw_user_meta_data->>'department', ''),
    coalesce(new.raw_user_meta_data->>'designation', 'Lecturer'),
    coalesce(new.raw_user_meta_data->>'role', 'teacher'),
    is_uet,
    case when is_uet then now() else null end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill missing profiles for existing UET auth users
insert into public.profiles (
  id, email, full_name, campus, department, designation, role,
  is_approved, approved_at
)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  coalesce(u.raw_user_meta_data->>'campus', 'Main Campus'),
  coalesce(u.raw_user_meta_data->>'department', ''),
  coalesce(u.raw_user_meta_data->>'designation', 'Lecturer'),
  coalesce(u.raw_user_meta_data->>'role', 'teacher'),
  true,
  now()
from auth.users u
where lower(coalesce(u.email, '')) like '%@uet.edu.pk'
  and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Ensure all UET faculty profiles are approved (email verification is enough)
update public.profiles
set
  is_approved = true,
  approved_at = coalesce(approved_at, now())
where email ilike '%@uet.edu.pk'
  and is_approved = false;

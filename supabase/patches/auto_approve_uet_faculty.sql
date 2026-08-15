-- Auto-approve @uet.edu.pk faculty on signup (email verification only).
-- Run this against the live Supabase project (SQL Editor).

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  is_uet boolean := lower(coalesce(new.email, '')) like '%@uet.edu.pk';
begin
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
  );
  return new;
end;
$$;

-- Backfill: unblock existing pending UET faculty
update public.profiles
set
  is_approved = true,
  approved_at = coalesce(approved_at, now())
where role = 'teacher'
  and is_approved = false
  and email ilike '%@uet.edu.pk';
;
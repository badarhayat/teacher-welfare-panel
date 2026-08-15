-- Faculty delete support + blocked emails for departed teachers.
-- Run against the live Supabase project (SQL Editor).

create table if not exists public.blocked_emails (
  id         uuid primary key default uuid_generate_v4(),
  email      text not null unique,
  reason     text,
  blocked_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint blocked_emails_email_lower check (email = lower(email))
);

alter table public.blocked_emails enable row level security;

drop policy if exists "Admins can view blocked emails" on public.blocked_emails;
create policy "Admins can view blocked emails"
  on public.blocked_emails for select
  using (public.current_user_is_admin());

drop policy if exists "Admins can insert blocked emails" on public.blocked_emails;
create policy "Admins can insert blocked emails"
  on public.blocked_emails for insert
  with check (public.current_user_is_admin());

drop policy if exists "Admins can update blocked emails" on public.blocked_emails;
create policy "Admins can update blocked emails"
  on public.blocked_emails for update
  using (public.current_user_is_admin());

drop policy if exists "Admins can delete blocked emails" on public.blocked_emails;
create policy "Admins can delete blocked emails"
  on public.blocked_emails for delete
  using (public.current_user_is_admin());

create or replace function public.is_email_blocked(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blocked_emails
    where email = lower(trim(p_email))
  );
$$;

grant execute on function public.is_email_blocked(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
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
  );
  return new;
end;
$$;

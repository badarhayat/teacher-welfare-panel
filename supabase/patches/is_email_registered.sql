-- Detect emails that already have a profile or are blocked (for registration UX).
-- Run in Supabase SQL Editor after deploy.

create or replace function public.is_email_registered(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.profiles
      where lower(email) = lower(trim(p_email))
    )
    or exists (
      select 1
      from public.blocked_emails
      where email = lower(trim(p_email))
    );
$$;

grant execute on function public.is_email_registered(text) to anon, authenticated;

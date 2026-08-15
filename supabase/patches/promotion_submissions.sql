-- Promotion submissions table for faculty vacancy + service date reports.
-- Run against the live Supabase project (SQL Editor).

create table if not exists public.promotion_submissions (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  full_name         text not null,
  email             text not null,
  campus            text not null,
  department        text not null,
  designation       text not null,
  date_of_joining   date not null,
  cadre_start_date  date not null,
  vacancies         jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  constraint promotion_submissions_cadre_after_joining
    check (cadre_start_date >= date_of_joining)
);

create index if not exists idx_promotion_submissions_created_at
  on public.promotion_submissions (created_at desc);

create index if not exists idx_promotion_submissions_campus_dept
  on public.promotion_submissions (campus, department);

alter table public.promotion_submissions enable row level security;

drop policy if exists "Teachers can view own promotion submissions" on public.promotion_submissions;
create policy "Teachers can view own promotion submissions"
  on public.promotion_submissions for select
  using (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved = true)
  );

drop policy if exists "Teachers can insert own promotion submissions" on public.promotion_submissions;
create policy "Teachers can insert own promotion submissions"
  on public.promotion_submissions for insert
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved = true)
  );

drop policy if exists "Admins can view all promotion submissions" on public.promotion_submissions;
create policy "Admins can view all promotion submissions"
  on public.promotion_submissions for select
  using (public.current_user_is_admin());

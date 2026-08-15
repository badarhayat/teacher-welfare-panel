
-- ============================================================
-- Teacher Welfare Panel — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (profiles) table — extends auth.users
-- ============================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null unique check (email like '%@uet.edu.pk' or email like '%@%'),
  full_name     text not null,
  campus        text not null,
  department    text not null,
  designation   text not null,
  role          text not null default 'teacher' check (role in ('teacher', 'admin')),
  is_approved   boolean not null default false,
  approved_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles
  add column if not exists is_approved boolean not null default false;
alter table public.profiles
  add column if not exists approved_at timestamptz;

-- SECURITY DEFINER: reads profiles as the function owner, bypassing RLS.
-- Used by every "is admin?" check so no policy ever queries profiles from within itself.
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- Policies for profiles
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.current_user_is_admin());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.current_user_is_admin());

drop policy if exists "Admins can delete profiles" on public.profiles;
create policy "Admins can delete profiles"
  on public.profiles for delete
  using (public.current_user_is_admin());

-- ============================================================
-- ISSUES table
-- ============================================================
create table if not exists public.issues (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  is_anonymous boolean not null default false,
  is_confidential boolean not null default false,
  title       text not null,
  description text not null,
  category    text not null,
  priority    text not null default 'Medium' check (priority in ('Low','Medium','High','Urgent')),
  status      text not null default 'Submitted' check (
                status in (
                  'Submitted','Under Review','In Progress',
                  'Communicated to Authorities','Resolved','Closed'
                )
              ),
  resolution_summary text,
  actions_taken text,
  published_to_board boolean not null default false,
  resolution_date timestamptz,
  deleted_at  timestamptz,
  deleted_by  uuid references public.profiles(id) on delete set null,
  deleted_by_role text check (deleted_by_role is null or deleted_by_role in ('teacher', 'admin')),
  deletion_noticed_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Backward-compatible migration for existing deployments
alter table public.issues
  add column if not exists is_anonymous boolean not null default false;

alter table public.issues
  add column if not exists is_confidential boolean not null default false;

alter table public.issues
  add column if not exists resolution_summary text;

alter table public.issues
  add column if not exists actions_taken text;

alter table public.issues
  add column if not exists published_to_board boolean not null default false;

alter table public.issues
  add column if not exists deleted_at timestamptz;

alter table public.issues
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

alter table public.issues
  add column if not exists deleted_by_role text check (deleted_by_role is null or deleted_by_role in ('teacher', 'admin'));

alter table public.issues
  add column if not exists deletion_noticed_at timestamptz;

alter table public.issues
  alter column published_to_board set default true;

alter table public.issues
  add column if not exists resolution_date timestamptz;

alter table public.issues enable row level security;

-- Policies for issues
drop policy if exists "Teachers can view their own issues" on public.issues;
create policy "Teachers can view their own issues"
  on public.issues for select
  using (auth.uid() = user_id and 
         exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved = true));

drop policy if exists "Teachers can create issues" on public.issues;
create policy "Teachers can create issues"
  on public.issues for insert
  with check (auth.uid() = user_id and 
              exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved = true));

drop policy if exists "Teachers can update own issues" on public.issues;
create policy "Teachers can update own issues"
  on public.issues for update
  using (auth.uid() = user_id and 
         exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved = true) and
         deleted_at is null)
  with check (auth.uid() = user_id and 
              exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved = true));

drop policy if exists "Teachers can delete own issues" on public.issues;
create policy "Teachers can delete own issues"
  on public.issues for update
  using (auth.uid() = user_id and 
         exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved = true) and
         deleted_at is null);

drop policy if exists "Admins can view all issues" on public.issues;
create policy "Admins can view all issues"
  on public.issues for select
  using (public.current_user_is_admin());

drop policy if exists "Admins can update issues" on public.issues;
create policy "Admins can update issues"
  on public.issues for update
  using (public.current_user_is_admin());

drop policy if exists "Public can view transparency issues" on public.issues;
create policy "Public can view transparency issues"
  on public.issues for select
  using (
    published_to_board = true
    and is_anonymous = false
    and deleted_at is null
  );

-- ============================================================
-- ISSUE STATUS TIMELINE
-- ============================================================
create table if not exists public.issue_status_history (
  id         uuid primary key default uuid_generate_v4(),
  issue_id   uuid not null references public.issues(id) on delete cascade,
  status     text not null check (
               status in (
                 'Submitted','Under Review','In Progress',
                 'Communicated to Authorities','Resolved','Closed'
               )
             ),
  note       text,
  changed_at timestamptz not null default now()
);

alter table public.issue_status_history enable row level security;

drop policy if exists "Teachers can view timeline for own issues" on public.issue_status_history;
create policy "Teachers can view timeline for own issues"
  on public.issue_status_history for select
  using (
    exists (
      select 1 from public.issues i
      where i.id = issue_id and i.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can view all timeline entries" on public.issue_status_history;
create policy "Admins can view all timeline entries"
  on public.issue_status_history for select
  using (public.current_user_is_admin());

drop policy if exists "Admins can insert timeline entries" on public.issue_status_history;
create policy "Admins can insert timeline entries"
  on public.issue_status_history for insert
  with check (public.current_user_is_admin());

drop policy if exists "Public can view transparency timelines" on public.issue_status_history;
create policy "Public can view transparency timelines"
  on public.issue_status_history for select
  using (
    exists (
      select 1 from public.issues i
      where i.id = issue_id
        and i.published_to_board = true
        and i.is_anonymous = false
    )
  );

-- ============================================================
-- COMMUNITY UPDATES / ANNOUNCEMENTS
-- ============================================================
create table if not exists public.community_updates (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  content      text not null,
  is_published boolean not null default false,
  published_at timestamptz,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.community_updates enable row level security;

drop policy if exists "Public can view published updates" on public.community_updates;
create policy "Public can view published updates"
  on public.community_updates for select
  using (is_published = true);

drop policy if exists "Admins can manage updates" on public.community_updates;
create policy "Admins can manage updates"
  on public.community_updates for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ============================================================
-- REPLIES table
-- ============================================================
create table if not exists public.replies (
  id         uuid primary key default uuid_generate_v4(),
  issue_id   uuid not null references public.issues(id) on delete cascade,
  admin_id   uuid references public.profiles(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  message    text not null,
  created_at timestamptz not null default now()
);

-- Backward-compatible migration for existing deployments
alter table public.replies
  alter column admin_id drop not null;

alter table public.replies
  add column if not exists user_id uuid references public.profiles(id) on delete cascade;

alter table public.replies
  drop constraint if exists replies_sender_check;

alter table public.replies
  add constraint replies_sender_check
  check (
    (admin_id is not null and user_id is null)
    or (admin_id is null and user_id is not null)
  );

alter table public.replies enable row level security;

-- Policies for replies
drop policy if exists "Issue owners can view replies" on public.replies;
create policy "Issue owners can view replies"
  on public.replies for select
  using (
    exists (
      select 1 from public.issues i
      where i.id = issue_id and i.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can view all replies" on public.replies;
create policy "Admins can view all replies"
  on public.replies for select
  using (public.current_user_is_admin());

drop policy if exists "Admins can insert replies" on public.replies;
create policy "Admins can insert replies"
  on public.replies for insert
  with check (
    admin_id = auth.uid()
    and user_id is null
    and public.current_user_is_admin()
  );

drop policy if exists "Teachers can insert replies on own issues" on public.replies;
create policy "Teachers can insert replies on own issues"
  on public.replies for insert
  with check (
    user_id = auth.uid()
    and admin_id is null
    and
    exists (
      select 1 from public.issues i
      where i.id = issue_id and i.user_id = auth.uid()
    )
  );

-- ============================================================
-- TEACHER REGISTRATIONS (Approval Workflow)
-- Stores pending teacher registrations awaiting admin approval.
-- ============================================================
create table if not exists public.teacher_registrations (
  id               uuid primary key default uuid_generate_v4(),
  email            text not null unique check (email like '%@uet.edu.pk'),
  full_name        text not null,
  campus           text not null,
  department       text not null,
  designation      text not null,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  password_hash    text not null,
  rejection_reason text,
  created_at       timestamptz not null default now(),
  approved_by      uuid references public.profiles(id) on delete set null,
  approved_at      timestamptz
);

alter table public.teacher_registrations enable row level security;

drop policy if exists "Teachers can view own registration" on public.teacher_registrations;
create policy "Teachers can view own registration"
  on public.teacher_registrations for select
  using (auth.uid()::text = id::text or false);

drop policy if exists "Admins can view all registrations" on public.teacher_registrations;
create policy "Admins can view all registrations"
  on public.teacher_registrations for select
  using (public.current_user_is_admin());

drop policy if exists "Admins can update registrations" on public.teacher_registrations;
create policy "Admins can update registrations"
  on public.teacher_registrations for update
  using (public.current_user_is_admin());

-- ============================================================
-- YEARLY REPORTS
-- Stores year-to-date (Jan-current month) aggregated statistics.
-- ============================================================
create table if not exists public.yearly_reports (
  id           uuid primary key default uuid_generate_v4(),
  year         int not null unique,
  stats        jsonb not null default '{}',
  generated_at timestamptz not null default now(),
  created_by   uuid references public.profiles(id) on delete set null
);

alter table public.yearly_reports enable row level security;

drop policy if exists "Public can view yearly reports" on public.yearly_reports;
create policy "Public can view yearly reports"
  on public.yearly_reports for select
  using (true);

drop policy if exists "Admins can manage yearly reports" on public.yearly_reports;
create policy "Admins can manage yearly reports"
  on public.yearly_reports for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());
-- TRIGGER: keep updated_at current
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_issues_updated_at on public.issues;
create trigger trg_issues_updated_at
  before update on public.issues
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TRIGGER: auto-track status timeline on insert/update
-- ============================================================
create or replace function public.handle_issue_status_timeline()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.issue_status_history (issue_id, status, note)
    values (new.id, new.status, 'Issue submitted');
    return new;
  end if;

  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.issue_status_history (issue_id, status, note)
    values (new.id, new.status, 'Status changed');
  end if;

  return new;
end;
$$;

-- ============================================================
-- TRIGGER: auto-set transparency visibility
-- ============================================================
create or replace function public.handle_issue_publication()
returns trigger language plpgsql as $$
begin
  new.published_to_board = (not new.is_anonymous);
  return new;
end;
$$;

drop trigger if exists trg_issue_status_timeline_insert on public.issues;
create trigger trg_issue_status_timeline_insert
  after insert on public.issues
  for each row execute function public.handle_issue_status_timeline();

drop trigger if exists trg_issue_status_timeline_update on public.issues;
create trigger trg_issue_status_timeline_update
  after update on public.issues
  for each row execute function public.handle_issue_status_timeline();

drop trigger if exists trg_issue_publication_before_ins_upd on public.issues;
create trigger trg_issue_publication_before_ins_upd
  before insert or update on public.issues
  for each row execute function public.handle_issue_publication();

-- ============================================================
-- TRIGGER: auto-create profile on sign-up
-- ============================================================

-- Blocked emails: departed faculty (and others) who must not re-register
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

create or replace function public.acknowledge_issue_deletion(p_issue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.issues
  set deletion_noticed_at = now()
  where id = p_issue_id
    and user_id = auth.uid()
    and deleted_at is not null
    and deleted_by_role = 'admin'
    and deletion_noticed_at is null;
end;
$$;

grant execute on function public.acknowledge_issue_deletion(uuid) to authenticated;

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

-- ============================================================
-- MONTHLY REPORTS
-- Stores auto-generated monthly TSA progress report statistics.
-- ============================================================
create table if not exists public.monthly_reports (
  id           uuid primary key default uuid_generate_v4(),
  year         int not null,
  month        int not null check (month between 1 and 12),
  stats        jsonb not null default '{}',
  is_published boolean not null default true,
  generated_at timestamptz not null default now(),
  created_by   uuid references public.profiles(id) on delete set null,
  constraint monthly_reports_year_month_unique unique (year, month)
);

alter table public.monthly_reports enable row level security;

-- Grant table-level SELECT to anon and authenticated roles
-- (RLS policies alone are not enough; table grants are also required)
grant select on public.monthly_reports to anon, authenticated;

drop policy if exists "Public can view published monthly reports" on public.monthly_reports;
create policy "Public can view published monthly reports"
  on public.monthly_reports for select
  using (is_published = true);

drop policy if exists "Admins can manage monthly reports" on public.monthly_reports;
create policy "Admins can manage monthly reports"
  on public.monthly_reports for all
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

-- ============================================================
-- FUNCTION: generate_monthly_report
-- Computes statistics for the given year/month and upserts a row
-- into monthly_reports. For current month, shows data through today.
-- For past months, shows full month data.
-- Call manually or via pg_cron.
-- ============================================================
create or replace function public.generate_monthly_report(
  p_year       int,
  p_month      int,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start      timestamptz := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'UTC');
  v_end        timestamptz;
  v_stats      jsonb;
  v_report_id  uuid;
  v_is_current boolean;
begin
  -- If this is the current month, only include data through today
  if (p_year = extract(year from now())::int and p_month = extract(month from now())::int) then
    v_end := date_trunc('day', now()) + interval '1 day';
    v_is_current := true;
  else
    v_end := v_start + interval '1 month';
    v_is_current := false;
  end if;

  select jsonb_build_object(
    'total',         count(*),
    'public',        count(*) filter (where is_anonymous = false),
    'anonymous',     count(*) filter (where is_anonymous = true),
    'resolved',      count(*) filter (where status in ('Resolved','Closed')),
    'pending',       count(*) filter (where status not in ('Resolved','Closed')),
    'submitted',     count(*) filter (where status = 'Submitted'),
    'under_review',  count(*) filter (where status = 'Under Review'),
    'in_progress',   count(*) filter (where status = 'In Progress'),
    'communicated',  count(*) filter (where status = 'Communicated to Authorities'),
    'urgent',        count(*) filter (where priority = 'Urgent'),
    'avg_resolution_days', round(
      avg(
        extract(epoch from (resolution_date - created_at)) / 86400.0
      ) filter (where resolution_date is not null)::numeric,
      1
    ),
    'is_current_month', v_is_current,
    'categories', (
      select coalesce(jsonb_object_agg(category, cnt), '{}')
      from (
        select category, count(*) as cnt
        from public.issues
        where created_at >= v_start and created_at < v_end and deleted_at is null
        group by category
      ) cat
    ),
    'priorities', (
      select coalesce(jsonb_object_agg(priority, cnt), '{}')
      from (
        select priority, count(*) as cnt
        from public.issues
        where created_at >= v_start and created_at < v_end and deleted_at is null
        group by priority
      ) pri
    )
  )
  into v_stats
  from public.issues
  where created_at >= v_start and created_at < v_end and deleted_at is null;

  insert into public.monthly_reports (year, month, stats, is_published, created_by)
  values (p_year, p_month, coalesce(v_stats, '{}'), true, p_created_by)
  on conflict (year, month) do update set
    stats        = excluded.stats,
    generated_at = now(),
    created_by   = coalesce(excluded.created_by, monthly_reports.created_by)
  returning id into v_report_id;

  return v_report_id;
end;
$$;

-- ============================================================
-- SCHEDULED REPORT GENERATION (pg_cron)
-- Enable pg_cron in Supabase Dashboard → Database → Extensions,
-- then run the block below once in the SQL Editor:
--
-- select cron.schedule(
--   'monthly-welfare-report',
--   '0 0 1 * *',
--   $$select public.generate_monthly_report(
--       extract(year  from (now() - interval '1 month'))::int,
--       extract(month from (now() - interval '1 month'))::int
--   )$$
-- );
-- ============================================================

-- Allow unauthenticated and authenticated callers to trigger report generation.
-- The functions are security definer so they write as the owner, not as the caller.
grant execute on function public.generate_monthly_report(int, int, uuid) to anon, authenticated;
grant execute on function public.generate_yearly_report(int, uuid) to anon, authenticated;

-- ============================================================
-- FUNCTION: generate_yearly_report
-- Aggregates year-to-date statistics (Jan through current month only).
-- Useful for annual progress reports.
-- ============================================================
create or replace function public.generate_yearly_report(
  p_year       int,
  p_created_by uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year_start  timestamptz := make_timestamptz(p_year, 1, 1, 0, 0, 0, 'UTC');
  v_current_end timestamptz;
  v_stats       jsonb;
  v_report_id   uuid;
  v_current_month int;
begin
  -- Year-to-date: from Jan 1 through end of current month (or end of specified year if in past)
  if (p_year = extract(year from now())::int) then
    v_current_end := date_trunc('day', now()) + interval '1 day';
  else
    v_current_end := make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'UTC');
  end if;

  select jsonb_build_object(
    'total',         count(*),
    'public',        count(*) filter (where is_anonymous = false),
    'anonymous',     count(*) filter (where is_anonymous = true),
    'resolved',      count(*) filter (where status in ('Resolved','Closed')),
    'pending',       count(*) filter (where status not in ('Resolved','Closed')),
    'submitted',     count(*) filter (where status = 'Submitted'),
    'under_review',  count(*) filter (where status = 'Under Review'),
    'in_progress',   count(*) filter (where status = 'In Progress'),
    'communicated',  count(*) filter (where status = 'Communicated to Authorities'),
    'urgent',        count(*) filter (where priority = 'Urgent'),
    'avg_resolution_days', round(
      avg(
        extract(epoch from (resolution_date - created_at)) / 86400.0
      ) filter (where resolution_date is not null)::numeric,
      1
    ),
    'resolution_rate', round(
      (count(*) filter (where status in ('Resolved','Closed'))::numeric / 
       nullif(count(*), 0) * 100)::numeric,
      1
    ),
    'categories', (
      select coalesce(jsonb_object_agg(category, cnt), '{}')
      from (
        select category, count(*) as cnt
        from public.issues
        where extract(year from created_at) = p_year 
          and created_at >= v_year_start 
          and created_at < v_current_end 
          and deleted_at is null
        group by category
      ) cat
    ),
    'priorities', (
      select coalesce(jsonb_object_agg(priority, cnt), '{}')
      from (
        select priority, count(*) as cnt
        from public.issues
        where extract(year from created_at) = p_year 
          and created_at >= v_year_start 
          and created_at < v_current_end 
          and deleted_at is null
        group by priority
      ) pri
    ),
    'monthly_breakdown', (
      select coalesce(jsonb_object_agg(to_char(to_timestamp(m::int * 3600 * 24), 'Month'), counts), '{}')
      from (
        select 
          extract(month from created_at)::int as m,
          jsonb_build_object('total', count(*), 'resolved', count(*) filter (where status in ('Resolved','Closed'))) as counts
        from public.issues
        where extract(year from created_at) = p_year 
          and created_at >= v_year_start 
          and created_at < v_current_end 
          and deleted_at is null
        group by extract(month from created_at)
      ) months
    )
  )
  into v_stats
  from public.issues
  where extract(year from created_at) = p_year 
    and created_at >= v_year_start 
    and created_at < v_current_end 
    and deleted_at is null;

  insert into public.yearly_reports (year, stats, created_by)
  values (p_year, coalesce(v_stats, '{}'), p_created_by)
  on conflict (year) do update set
    stats        = excluded.stats,
    generated_at = now(),
    created_by   = coalesce(excluded.created_by, yearly_reports.created_by)
  returning id into v_report_id;

  return v_report_id;
end;
$$;

-- ============================================================
-- PROMOTION SUBMISSIONS
-- Faculty reports of vacant / required seats + service dates
-- ============================================================
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

drop policy if exists "Teachers can update own promotion submissions" on public.promotion_submissions;
create policy "Teachers can update own promotion submissions"
  on public.promotion_submissions for update
  using (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved = true)
  )
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved = true)
  );

drop policy if exists "Teachers can delete own promotion submissions" on public.promotion_submissions;
create policy "Teachers can delete own promotion submissions"
  on public.promotion_submissions for delete
  using (
    auth.uid() = user_id
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_approved = true)
  );


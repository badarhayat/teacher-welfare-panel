-- Admin-delete metadata + teacher acknowledge helper.
-- Run against the live Supabase project (SQL Editor).

alter table public.issues
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

alter table public.issues
  add column if not exists deleted_by_role text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'issues_deleted_by_role_check'
  ) then
    alter table public.issues
      add constraint issues_deleted_by_role_check
      check (deleted_by_role is null or deleted_by_role in ('teacher', 'admin'));
  end if;
end $$;

alter table public.issues
  add column if not exists deletion_noticed_at timestamptz;

-- Teacher can acknowledge an admin deletion notice (even though row is soft-deleted)
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

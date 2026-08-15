-- Allow faculty to update and delete their own promotion submissions.
-- Admin aggregates refresh from live table rows, so edits/deletes appear automatically.
-- Run in Supabase SQL Editor.

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

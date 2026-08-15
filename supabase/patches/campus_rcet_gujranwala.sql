-- Normalize Gujranwala campus label to match registration / CAMPUSES_DEPARTMENTS.
-- Run in Supabase SQL Editor after deploy.

update public.profiles
set campus = 'RCET Gujranwala'
where campus = 'Gujranwala Campus';

update public.promotion_submissions
set campus = 'RCET Gujranwala'
where campus = 'Gujranwala Campus';

-- ============================================================
-- Exam Goal (Countdown + Pacing Plan)
-- Lets a student record which exam they're targeting and its date,
-- so the dashboard can show a days-remaining countdown and a
-- pacing plan derived from their existing user_stats (weekly_goal,
-- this_week_count, total_essays). No new stats machinery needed —
-- this just gives those numbers a deadline to be measured against.
-- ============================================================

alter table public.profiles
  add column exam_type text check (exam_type in ('UPCAT','ACET','DCAT','USTET','General')),
  add column exam_date date;

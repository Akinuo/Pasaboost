-- ============================================================
-- Timed mock-exam mode
--
-- Real per-exam essay time limits aren't consistently published or
-- stable year to year — historical reports range from ~15 minutes for
-- UPCAT's essay portion to 25-45 minutes for ACET's combined
-- writing/grammar section, and some years drop the essay portion
-- entirely. Because of that, the time limit is student-configurable
-- rather than hardcoded (see SUGGESTED_EXAM_TIME_MINUTES in
-- lib/utils.ts) — these columns just record what was actually used
-- for a given attempt.
--
-- drafts.exam_mode_started_at / exam_mode_time_limit_seconds: set
-- when a student starts a timed attempt, so a page refresh resumes
-- the real remaining time (server-anchored) instead of resetting the
-- clock or losing the session.
--
-- scores.exam_mode / time_limit_seconds / time_taken_seconds: a
-- permanent record on the submitted score of whether it was written
-- under timed conditions and how long it actually took, shown on the
-- score report.
-- ============================================================

alter table public.drafts
  add column exam_mode_started_at timestamptz,
  add column exam_mode_time_limit_seconds int;

alter table public.scores
  add column exam_mode boolean not null default false,
  add column time_limit_seconds int,
  add column time_taken_seconds int;

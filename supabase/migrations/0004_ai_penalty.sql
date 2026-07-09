-- ============================================================
-- PasaBoost — AI-Detection Score Penalty
-- If the AI-generated-text checker (ai_likelihood) estimates
-- 60% or higher, the essay's total_score is docked points at
-- submission time. These columns preserve the pre-deduction
-- score and the deduction amount so the report can show both.
-- Run via: supabase db push
-- or paste into Supabase Dashboard → SQL Editor → New query
-- ============================================================

alter table public.scores
  add column if not exists pre_ai_penalty_score int check (pre_ai_penalty_score between 0 and 100),
  add column if not exists ai_penalty_applied int not null default 0 check (ai_penalty_applied >= 0);

comment on column public.scores.pre_ai_penalty_score is 'total_score before any AI-likelihood deduction was applied. Null if no deduction was applicable.';
comment on column public.scores.ai_penalty_applied is 'Points deducted from the rubric total because ai_likelihood was 60 or higher. 0 if no deduction applied.';

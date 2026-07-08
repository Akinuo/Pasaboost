-- ============================================================
-- PasaBoost — AI Checker / Originality / Grammar Highlights
-- Adds integrity-check columns to `scores` so results persist
-- alongside each submission and show up in history.
-- Run via: supabase db push
-- or paste into Supabase Dashboard → SQL Editor → New query
-- ============================================================

alter table public.scores
  add column if not exists grammar_issues jsonb default '[]'::jsonb,
  add column if not exists ai_likelihood int check (ai_likelihood between 0 and 100),
  add column if not exists ai_verdict text,
  add column if not exists ai_indicators jsonb default '[]'::jsonb,
  add column if not exists ai_explanation text,
  add column if not exists originality_score int check (originality_score between 0 and 100),
  add column if not exists originality_flagged boolean default false,
  add column if not exists originality_note text,
  add column if not exists originality_matched_essay_id uuid references public.drafts(id) on delete set null,
  add column if not exists originality_similarity_percent int;

comment on column public.scores.ai_likelihood is 'Estimated 0-100 probability the essay was AI-generated. Heuristic + LLM estimate, not a certainty.';
comment on column public.scores.originality_score is '0-100, 100 = no meaningful overlap found with the student''s own past essays.';

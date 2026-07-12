-- ============================================================
-- Weakness-Targeted Drill Mode + Revision Diffing
-- ============================================================

-- ── Drill attempts ────────────────────────────────────────────
-- Short, single-dimension focused exercises (distinct from the
-- full 5-dimension `scores` table). Immutable once created, same
-- as `scores` — a drill attempt is a record of what happened, not
-- something a user edits after the fact.
create table public.drill_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  dimension text not null
    check (dimension in ('Content','Organization','Grammar','Coherence','Argument')),
  exercise_prompt text not null,
  response text not null,
  word_count int default 0,
  score int not null check (score between 1 and 20),
  feedback text not null default '',
  tip text,
  created_at timestamptz default now()
);

create index drill_attempts_user_dim_idx on public.drill_attempts (user_id, dimension, created_at desc);

alter table public.drill_attempts enable row level security;

create policy "drill_attempts_select_own" on public.drill_attempts
  for select using (auth.uid() = user_id);
create policy "drill_attempts_insert_own" on public.drill_attempts
  for insert with check (auth.uid() = user_id);
create policy "drill_attempts_delete_own" on public.drill_attempts
  for delete using (auth.uid() = user_id);

-- Intentionally NOT added to supabase_realtime — this table only needs
-- to be read on-demand (drill history list), not pushed live. See the
-- earlier dashboard-scores/notifications WAL load discussion.

-- ── Revision diffing ──────────────────────────────────────────
-- Nullable self-reference: when a student revises and resubmits an
-- essay, the new score row points back at the score it was revised
-- from, so the score detail page can fetch both and show a diff.
alter table public.scores
  add column revised_from_score_id uuid references public.scores(id) on delete set null;

create index scores_revised_from_idx on public.scores (revised_from_score_id);

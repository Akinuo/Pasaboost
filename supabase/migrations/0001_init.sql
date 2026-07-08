-- ============================================================
-- PasaBoost — Supabase Database Schema
-- Run via: supabase db push
-- or paste into Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Extensions ────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- ── Profiles (extends auth.users) ────────────────────────────
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  photo_url text,
  leaderboard_enabled boolean default false,
  leaderboard_alias text,
  email_notifications boolean default false,
  created_at timestamptz default now()
);

-- ── User stats (denormalized for fast dashboard reads) ───────
create table public.user_stats (
  user_id uuid references auth.users on delete cascade primary key,
  total_essays int default 0,
  average_score numeric(5,2) default 0,
  best_score int default 0,
  current_streak int default 0,
  longest_streak int default 0,
  last_activity timestamptz default now(),
  weekly_goal int default 3,
  this_week_count int default 0,
  total_words int default 0
);

-- ── Essay drafts ──────────────────────────────────────────────
create table public.drafts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text default 'Untitled Essay',
  content text not null default '',
  prompt text,
  prompt_category text,
  exam_type text not null default 'General'
    check (exam_type in ('UPCAT','ACET','DCAT','USTET','General')),
  word_count int default 0,
  is_submitted boolean default false,
  score_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index drafts_user_updated_idx on public.drafts (user_id, updated_at desc);

-- ── Essay scores (immutable once created) ────────────────────
create table public.scores (
  id uuid default uuid_generate_v4() primary key,
  essay_id uuid references public.drafts(id) on delete set null,
  user_id uuid references auth.users on delete cascade not null,
  essay text not null,
  prompt text,
  exam_type text not null
    check (exam_type in ('UPCAT','ACET','DCAT','USTET','General')),
  total_score int not null check (total_score between 0 and 100),
  rubric_scores jsonb not null,        -- [{dimension, score, maxScore, feedback, strengths, weaknesses}]
  overall_feedback text,
  strengths jsonb default '[]'::jsonb,
  weaknesses jsonb default '[]'::jsonb,
  suggestions jsonb default '[]'::jsonb,
  paragraph_rewrites jsonb default '[]'::jsonb,
  estimated_band text,
  readability_score int,
  vocabulary_diversity int,
  model_version text,
  created_at timestamptz default now()
);

create index scores_user_created_idx on public.scores (user_id, created_at desc);
create index scores_user_exam_idx on public.scores (user_id, exam_type, created_at desc);

-- ── Leaderboard (one row per opted-in user) ──────────────────
create table public.leaderboard (
  user_id uuid references auth.users on delete cascade primary key,
  alias text not null check (char_length(alias) between 3 and 30),
  average_score numeric(5,2) not null default 0,
  essay_count int not null default 0,
  best_score int not null default 0,
  improvement numeric(5,2) default 0,
  exam_type text,
  badge text,
  last_updated timestamptz default now()
);

create index leaderboard_score_idx on public.leaderboard (average_score desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles     enable row level security;
alter table public.user_stats   enable row level security;
alter table public.drafts       enable row level security;
alter table public.scores       enable row level security;
alter table public.leaderboard  enable row level security;

-- ── Profiles ──────────────────────────────────────────────────
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- ── User stats ────────────────────────────────────────────────
create policy "stats_select_own" on public.user_stats
  for select using (auth.uid() = user_id);
create policy "stats_update_own" on public.user_stats
  for update using (auth.uid() = user_id);
create policy "stats_insert_own" on public.user_stats
  for insert with check (auth.uid() = user_id);

-- ── Drafts (full CRUD, owner only) ────────────────────────────
create policy "drafts_select_own" on public.drafts
  for select using (auth.uid() = user_id);
create policy "drafts_insert_own" on public.drafts
  for insert with check (auth.uid() = user_id);
create policy "drafts_update_own" on public.drafts
  for update using (auth.uid() = user_id);
create policy "drafts_delete_own" on public.drafts
  for delete using (auth.uid() = user_id);

-- ── Scores (read/insert/delete only — NO update, scores are immutable) ──
create policy "scores_select_own" on public.scores
  for select using (auth.uid() = user_id);
create policy "scores_insert_own" on public.scores
  for insert with check (auth.uid() = user_id);
create policy "scores_delete_own" on public.scores
  for delete using (auth.uid() = user_id);

-- ── Leaderboard (public read for logged-in users, owner writes) ──
create policy "leaderboard_select_authenticated" on public.leaderboard
  for select using (auth.role() = 'authenticated');
create policy "leaderboard_insert_own" on public.leaderboard
  for insert with check (auth.uid() = user_id);
create policy "leaderboard_update_own" on public.leaderboard
  for update using (auth.uid() = user_id);
create policy "leaderboard_delete_own" on public.leaderboard
  for delete using (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- ── Auto-create profile + stats row when a user signs up ─────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, photo_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );

  insert into public.user_stats (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Keep updated_at fresh on drafts ───────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger drafts_set_updated_at
  before update on public.drafts
  for each row execute procedure public.set_updated_at();

-- ── Update user_stats automatically whenever a score is inserted ──
create or replace function public.handle_new_score()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  essay_word_count int;
begin
  essay_word_count := array_length(regexp_split_to_array(trim(new.essay), '\s+'), 1);

  update public.user_stats
  set
    total_essays = total_essays + 1,
    best_score = greatest(best_score, new.total_score),
    average_score = (
      select round(avg(total_score)::numeric, 2)
      from public.scores
      where user_id = new.user_id
    ),
    total_words = total_words + coalesce(essay_word_count, 0),
    last_activity = now()
  where user_id = new.user_id;

  return new;
end;
$$;

create trigger on_score_created
  after insert on public.scores
  for each row execute procedure public.handle_new_score();

-- ============================================================
-- REALTIME
-- ============================================================
-- Enable realtime so the dashboard/history pages get live updates
alter publication supabase_realtime add table public.scores;
alter publication supabase_realtime add table public.drafts;

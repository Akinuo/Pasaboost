-- ============================================================
-- PasaBoost — Daily AI-Generated Writing Prompts
-- A scheduled job (see /api/generate-daily-prompts) calls Groq
-- once a day to generate at least 5 new essay topics, and writes
-- them here via the service-role client. Readable by any signed-in
-- user; only the service role can write, so nothing else needs to
-- be exposed publicly for this to work.
-- Run via: supabase db push
-- or paste into Supabase Dashboard → SQL Editor → New query
-- ============================================================

create table if not exists public.daily_prompts (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text not null,
  exam_type text[] not null default '{}',
  difficulty text not null check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  keywords text[] not null default '{}',
  tip text,
  generated_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists daily_prompts_generated_date_idx on public.daily_prompts (generated_date desc);

alter table public.daily_prompts enable row level security;

-- Any signed-in user can read today's (and past) generated prompts.
create policy "Daily prompts are viewable by authenticated users"
  on public.daily_prompts for select
  to authenticated
  using (true);

-- Deliberately no insert/update/delete policy for `authenticated` or
-- `anon` — rows are only ever written by the service-role client
-- inside /api/generate-daily-prompts, which bypasses RLS entirely.

comment on table public.daily_prompts is 'AI-generated essay topics, refreshed daily by a scheduled job. Supplements the static prompt library in lib/prompts.ts.';
comment on column public.daily_prompts.generated_date is 'The calendar date (Asia/Manila) this batch was generated for — used to avoid regenerating duplicates on repeated cron runs.';

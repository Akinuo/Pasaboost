-- ============================================================
-- AI Tool Usage Log
-- Rate limiting for the stateless AI tools that don't otherwise
-- write anything to the database (check-grammar, check-integrity,
-- outline) — unlike score-essay/drill_attempts/feedback_qa_messages,
-- which already double as their own usage log via getRecentScoreCount
-- etc. This gives those three the same zero-infra, DB-based rate
-- limit instead of pulling in Redis/Upstash for just this.
-- ============================================================

create table public.ai_tool_usage (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  tool text not null check (tool in ('check-grammar', 'check-integrity', 'outline')),
  created_at timestamptz default now()
);

-- Only access pattern is "count this user's calls to this tool in
-- the last hour", so index exactly that.
create index ai_tool_usage_rate_limit_idx on public.ai_tool_usage (user_id, tool, created_at);

alter table public.ai_tool_usage enable row level security;

-- Owner-only, insert+select — same visibility model as the other
-- per-user tables (scores, drill_attempts). No update/delete: it's
-- an append-only log, and rows age out of the rate-limit window on
-- their own without needing to be cleaned up for correctness.
create policy "ai_tool_usage_select_own" on public.ai_tool_usage
  for select using (auth.uid() = user_id);
create policy "ai_tool_usage_insert_own" on public.ai_tool_usage
  for insert with check (auth.uid() = user_id);

-- Not added to supabase_realtime — this is a write-only accounting
-- log, nothing subscribes to it.

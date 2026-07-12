-- ============================================================
-- Group Discussions
-- Lets study-group members open a thread to talk through an idea,
-- essay angle, or prompt together — separate from the leaderboard,
-- which only ever showed rankings. A discussion can optionally be
-- anchored to a writing prompt, either:
--   • one of today's AI-generated `daily_prompts` (linked by id, with
--     the text snapshotted onto the discussion so it still reads
--     fine once that day's batch rotates out), or
--   • a prompt the member writes themselves, tailored to the group's
--     own theme (e.g. a SciTech group asking about AI ethics) —
--     `daily_prompt_id` is null in that case and `prompt_text` holds
--     what they wrote.
-- Same flat, no-owner access model as the rest of study groups:
-- any member can start a thread, reply, or delete their own
-- posts; nobody outside the group can see it at all.
-- Run via: supabase db push
-- ============================================================

create table public.group_discussions (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.study_groups(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  display_name text not null,
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 1 and 5000),
  daily_prompt_id uuid references public.daily_prompts(id) on delete set null,
  prompt_text text check (prompt_text is null or char_length(prompt_text) <= 500),
  reply_count int not null default 0,
  created_at timestamptz default now()
);

create index group_discussions_group_idx on public.group_discussions (group_id, created_at desc);
create index group_discussions_user_idx on public.group_discussions (user_id, created_at desc);

create table public.group_discussion_replies (
  id uuid default uuid_generate_v4() primary key,
  discussion_id uuid references public.group_discussions(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  display_name text not null,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz default now()
);

create index group_discussion_replies_discussion_idx on public.group_discussion_replies (discussion_id, created_at);

-- ============================================================
-- ROW LEVEL SECURITY — visible only to members of the owning group,
-- reusing is_study_group_member() from 0014_study_groups.sql.
-- ============================================================

alter table public.group_discussions enable row level security;
alter table public.group_discussion_replies enable row level security;

create policy "group_discussions_select_member" on public.group_discussions
  for select using (public.is_study_group_member(group_id, auth.uid()));

create policy "group_discussions_insert_member" on public.group_discussions
  for insert with check (auth.uid() = user_id and public.is_study_group_member(group_id, auth.uid()));

create policy "group_discussions_delete_own" on public.group_discussions
  for delete using (auth.uid() = user_id);

-- Replies check membership via the parent discussion's group_id
-- rather than a second helper function, since the reply row itself
-- has no group_id to hand to is_study_group_member() directly.
create policy "group_discussion_replies_select_member" on public.group_discussion_replies
  for select using (
    exists (
      select 1 from public.group_discussions d
      where d.id = discussion_id and public.is_study_group_member(d.group_id, auth.uid())
    )
  );

create policy "group_discussion_replies_insert_member" on public.group_discussion_replies
  for insert with check (
    auth.uid() = user_id and exists (
      select 1 from public.group_discussions d
      where d.id = discussion_id and public.is_study_group_member(d.group_id, auth.uid())
    )
  );

create policy "group_discussion_replies_delete_own" on public.group_discussion_replies
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Keep group_discussions.reply_count in sync — same trigger
-- pattern as community_posts.comment_count in 0007.
-- ============================================================

create or replace function public.handle_new_group_discussion_reply()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.group_discussions set reply_count = reply_count + 1 where id = new.discussion_id;
  return new;
end;
$$;

create trigger on_group_discussion_reply_created
  after insert on public.group_discussion_replies
  for each row execute procedure public.handle_new_group_discussion_reply();

create or replace function public.handle_delete_group_discussion_reply()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.group_discussions set reply_count = greatest(reply_count - 1, 0) where id = old.discussion_id;
  return old;
end;
$$;

create trigger on_group_discussion_reply_deleted
  after delete on public.group_discussion_replies
  for each row execute procedure public.handle_delete_group_discussion_reply();

-- ============================================================
-- REALTIME — thread list and reply counts update live, same as
-- study_groups/study_group_members and the community tables.
-- ============================================================
alter publication supabase_realtime add table public.group_discussions;
alter publication supabase_realtime add table public.group_discussion_replies;

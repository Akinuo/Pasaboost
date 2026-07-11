-- ============================================================
-- PasaBoost — Community feature
-- Students can share an essay (their own words, either freehand
-- or a copy of a previously-scored one) for other students to
-- read, like, and comment on.
-- ============================================================

-- ── Shared essays ─────────────────────────────────────────────
-- The essay/title/prompt/exam_type are copied at share-time rather
-- than joined live from `drafts`/`scores`, so a post keeps reading
-- fine even if the student later edits or deletes the original
-- draft. `score_id` is kept only as an optional "view my full
-- feedback" link back for the original author.
create table public.community_posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  score_id uuid references public.scores(id) on delete set null,
  display_name text not null,
  is_anonymous boolean not null default false,
  title text not null default 'Untitled Essay',
  essay text not null check (char_length(essay) between 1 and 20000),
  prompt text,
  exam_type text not null default 'General'
    check (exam_type in ('UPCAT','ACET','DCAT','USTET','General')),
  total_score int check (total_score between 0 and 100),
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz default now()
);

create index community_posts_created_idx on public.community_posts (created_at desc);
create index community_posts_exam_idx on public.community_posts (exam_type, created_at desc);
create index community_posts_user_idx on public.community_posts (user_id, created_at desc);

-- ── Likes (one per user per post) ────────────────────────────
create table public.community_likes (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  created_at timestamptz default now(),
  unique (post_id, user_id)
);

create index community_likes_post_idx on public.community_likes (post_id);
create index community_likes_user_idx on public.community_likes (user_id);

-- ── Comments ──────────────────────────────────────────────────
create table public.community_comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.community_posts(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  display_name text not null,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz default now()
);

create index community_comments_post_idx on public.community_comments (post_id, created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.community_posts    enable row level security;
alter table public.community_likes    enable row level security;
alter table public.community_comments enable row level security;

-- ── Posts: everyone signed in can read, owner can write/delete ──
create policy "community_posts_select_authenticated" on public.community_posts
  for select using (auth.role() = 'authenticated');
create policy "community_posts_insert_own" on public.community_posts
  for insert with check (auth.uid() = user_id);
create policy "community_posts_update_own" on public.community_posts
  for update using (auth.uid() = user_id);
create policy "community_posts_delete_own" on public.community_posts
  for delete using (auth.uid() = user_id);

-- ── Likes: everyone signed in can read, owner can like/unlike ──
create policy "community_likes_select_authenticated" on public.community_likes
  for select using (auth.role() = 'authenticated');
create policy "community_likes_insert_own" on public.community_likes
  for insert with check (auth.uid() = user_id);
create policy "community_likes_delete_own" on public.community_likes
  for delete using (auth.uid() = user_id);

-- ── Comments: everyone signed in can read, owner can post/delete ──
create policy "community_comments_select_authenticated" on public.community_comments
  for select using (auth.role() = 'authenticated');
create policy "community_comments_insert_own" on public.community_comments
  for insert with check (auth.uid() = user_id);
create policy "community_comments_delete_own" on public.community_comments
  for delete using (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS — keep like_count / comment_count in sync
-- ============================================================

create or replace function public.handle_new_community_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.community_posts set like_count = like_count + 1 where id = new.post_id;
  return new;
end;
$$;

create trigger on_community_like_created
  after insert on public.community_likes
  for each row execute procedure public.handle_new_community_like();

create or replace function public.handle_delete_community_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.community_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

create trigger on_community_like_deleted
  after delete on public.community_likes
  for each row execute procedure public.handle_delete_community_like();

create or replace function public.handle_new_community_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.community_posts set comment_count = comment_count + 1 where id = new.post_id;
  return new;
end;
$$;

create trigger on_community_comment_created
  after insert on public.community_comments
  for each row execute procedure public.handle_new_community_comment();

create or replace function public.handle_delete_community_comment()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.community_posts set comment_count = greatest(comment_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

create trigger on_community_comment_deleted
  after delete on public.community_comments
  for each row execute procedure public.handle_delete_community_comment();

-- ============================================================
-- REALTIME
-- ============================================================
alter publication supabase_realtime add table public.community_posts;
alter publication supabase_realtime add table public.community_likes;
alter publication supabase_realtime add table public.community_comments;

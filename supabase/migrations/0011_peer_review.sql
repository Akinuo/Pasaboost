-- ============================================================
-- Structured Peer Review
-- A more directed alternative to the like/comment feed: a student
-- can mark a shared essay as open for review and pick up to 3
-- rubric dimensions they want targeted feedback on. Other students
-- pick an open dimension and leave one structured review for it
-- (rating + what worked + one suggestion) rather than a free-form
-- comment, so each dimension gets exactly the kind of focused
-- feedback the author asked for.
-- ============================================================

alter table public.community_posts
  add column review_requested boolean not null default false,
  add column review_dimensions text[] not null default '{}',
  add column review_count int not null default 0;

create index community_posts_review_idx on public.community_posts (review_requested, created_at desc)
  where review_requested = true;

-- ── Structured reviews ───────────────────────────────────────
create table public.post_reviews (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.community_posts(id) on delete cascade not null,
  reviewer_id uuid references auth.users on delete cascade not null,
  reviewer_display_name text not null,
  dimension text not null
    check (dimension in ('Content','Organization','Grammar','Coherence','Argument')),
  rating int not null check (rating between 1 and 5),
  what_worked text not null check (char_length(what_worked) between 1 and 600),
  suggestion text not null check (char_length(suggestion) between 1 and 600),
  created_at timestamptz default now(),
  -- One reviewer leaves at most one structured review per dimension
  -- per post — keeps "2-3 classmates, one dimension each" honest.
  unique (post_id, reviewer_id, dimension)
);

create index post_reviews_post_idx on public.post_reviews (post_id, dimension);
create index post_reviews_reviewer_idx on public.post_reviews (reviewer_id, created_at desc);

alter table public.post_reviews enable row level security;

create policy "post_reviews_select_authenticated" on public.post_reviews
  for select using (auth.role() = 'authenticated');

-- A reviewer can only review someone else's post, and only a
-- dimension that post actually requested review on.
create policy "post_reviews_insert_own" on public.post_reviews
  for insert with check (
    auth.uid() = reviewer_id
    and exists (
      select 1 from public.community_posts p
      where p.id = post_id
        and p.user_id <> auth.uid()
        and p.review_requested = true
        and dimension = any(p.review_dimensions)
    )
  );

create policy "post_reviews_delete_own" on public.post_reviews
  for delete using (auth.uid() = reviewer_id);

-- ============================================================
-- Keep community_posts.review_count in sync (mirrors the
-- existing like_count / comment_count trigger pattern)
-- ============================================================

create or replace function public.handle_new_post_review()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.community_posts set review_count = review_count + 1 where id = new.post_id;
  return new;
end;
$$;

create trigger on_post_review_created
  after insert on public.post_reviews
  for each row execute procedure public.handle_new_post_review();

create or replace function public.handle_delete_post_review()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.community_posts set review_count = greatest(review_count - 1, 0) where id = old.post_id;
  return old;
end;
$$;

create trigger on_post_review_deleted
  after delete on public.post_reviews
  for each row execute procedure public.handle_delete_post_review();

-- ============================================================
-- REALTIME — so the "N of M dimensions reviewed" status updates
-- live for everyone looking at the post, same as comments/likes.
-- ============================================================
alter publication supabase_realtime add table public.post_reviews;

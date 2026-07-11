-- ============================================================
-- PasaBoost — In-app notifications
-- Notifies a community post's author when someone else likes or
-- comments on their post. Rows are created server-side by triggers
-- on community_likes / community_comments (mirrors the like_count /
-- comment_count trigger pattern in 0007_community.sql) so every
-- client — web, cron, admin tooling — gets consistent notifications
-- without having to remember to write them itself.
-- ============================================================

create table public.notifications (
  id uuid default uuid_generate_v4() primary key,
  recipient_id uuid references auth.users on delete cascade not null,
  actor_id uuid references auth.users on delete cascade not null,
  actor_display_name text not null,
  type text not null check (type in ('like', 'comment')),
  post_id uuid references public.community_posts(id) on delete cascade not null,
  comment_id uuid references public.community_comments(id) on delete cascade,
  post_title text not null,
  comment_preview text,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_unread_idx on public.notifications (recipient_id) where is_read = false;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.notifications enable row level security;

-- Recipients can read their own notifications only.
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = recipient_id);

-- Recipients can mark their own notifications as read (only the
-- is_read flag is meant to change; nothing else is exposed to edit
-- from the client since inserts happen via the trigger below).
create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- No insert/delete policy for regular users — rows are only ever
-- created by the security-definer trigger functions below, and
-- deletion cascades from their parent post/comment/user.

-- ============================================================
-- FUNCTIONS & TRIGGERS — create a notification for the post owner
-- ============================================================

create or replace function public.handle_new_community_like_notification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_post_owner uuid;
  v_post_title text;
  v_actor_name text;
begin
  select user_id, title into v_post_owner, v_post_title
  from public.community_posts where id = new.post_id;

  -- Don't notify people about their own likes.
  if v_post_owner is null or v_post_owner = new.user_id then
    return new;
  end if;

  select coalesce(display_name, 'A student') into v_actor_name
  from public.profiles where id = new.user_id;

  insert into public.notifications (recipient_id, actor_id, actor_display_name, type, post_id, post_title)
  values (v_post_owner, new.user_id, coalesce(v_actor_name, 'A student'), 'like', new.post_id, v_post_title);

  return new;
end;
$$;

create trigger on_community_like_created_notify
  after insert on public.community_likes
  for each row execute procedure public.handle_new_community_like_notification();

create or replace function public.handle_new_community_comment_notification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_post_owner uuid;
  v_post_title text;
begin
  select user_id, title into v_post_owner, v_post_title
  from public.community_posts where id = new.post_id;

  -- Don't notify people about their own comments.
  if v_post_owner is null or v_post_owner = new.user_id then
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, actor_display_name, type, post_id, comment_id, post_title, comment_preview)
  values (v_post_owner, new.user_id, new.display_name, 'comment', new.post_id, new.id, v_post_title, left(new.content, 140));

  return new;
end;
$$;

create trigger on_community_comment_created_notify
  after insert on public.community_comments
  for each row execute procedure public.handle_new_community_comment_notification();

-- ============================================================
-- REALTIME — so the notification bell can update live
-- ============================================================
alter publication supabase_realtime add table public.notifications;

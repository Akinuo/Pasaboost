-- ============================================================
-- Group Discussion Reply Notifications
-- Extends the notification system (0008, 0013) to also notify a
-- discussion's starter when a fellow group member replies to it —
-- same trigger-based pattern, just pointed at group_discussions /
-- group_discussion_replies instead of community_posts.
--
-- post_id was NOT NULL because every prior notification type was
-- always about a community post. A discussion-reply notification
-- has no post at all, so post_id (and post_title) become nullable
-- here, and a check constraint enforces that each notification type
-- carries the fields it actually needs.
-- ============================================================

alter table public.notifications alter column post_id drop not null;
alter table public.notifications alter column post_title drop not null;

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'review', 'discussion_reply'));

alter table public.notifications
  add column group_id uuid references public.study_groups(id) on delete cascade,
  add column discussion_id uuid references public.group_discussions(id) on delete cascade,
  add column reply_id uuid references public.group_discussion_replies(id) on delete cascade,
  add column discussion_title text,
  add column reply_preview text;

-- Every existing row is a community-post notification, so post_id/
-- post_title being newly nullable doesn't leave old rows short a
-- field they actually need — this just guards new inserts going
-- forward, one clause per notification type.
alter table public.notifications add constraint notifications_type_fields_check
  check (
    (type in ('like', 'comment', 'review') and post_id is not null and post_title is not null)
    or
    (type = 'discussion_reply' and discussion_id is not null and discussion_title is not null and group_id is not null)
  );

create or replace function public.handle_new_group_discussion_reply_notification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
  v_group_id uuid;
  v_title text;
begin
  select user_id, group_id, title into v_owner, v_group_id, v_title
  from public.group_discussions where id = new.discussion_id;

  -- Don't notify people about their own replies.
  if v_owner is null or v_owner = new.user_id then
    return new;
  end if;

  insert into public.notifications (
    recipient_id, actor_id, actor_display_name, type,
    group_id, discussion_id, reply_id, discussion_title, reply_preview
  )
  values (
    v_owner, new.user_id, new.display_name, 'discussion_reply',
    v_group_id, new.discussion_id, new.id, v_title, left(new.content, 140)
  );

  return new;
end;
$$;

create trigger on_group_discussion_reply_created_notify
  after insert on public.group_discussion_replies
  for each row execute procedure public.handle_new_group_discussion_reply_notification();

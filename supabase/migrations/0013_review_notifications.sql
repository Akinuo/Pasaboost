-- ============================================================
-- Structured Peer Review Notifications
-- Extends the like/comment notification system (0008) to also
-- notify a post's author when a classmate leaves a structured peer
-- review (0011) on one of their requested dimensions. Same
-- trigger-based pattern as the existing like/comment notifications:
-- insert on post_reviews creates a notification row server-side, so
-- every client stays consistent without having to remember to write
-- it itself.
-- ============================================================

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('like', 'comment', 'review'));

alter table public.notifications
  add column review_id uuid references public.post_reviews(id) on delete cascade,
  add column review_dimension text
    check (review_dimension is null or review_dimension in ('Content','Organization','Grammar','Coherence','Argument')),
  add column review_preview text;

create or replace function public.handle_new_post_review_notification()
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

  -- Don't notify someone about reviewing their own post. RLS in 0011
  -- already blocks self-review inserts, but keep the guard here too,
  -- same defensive style as the like/comment trigger in 0008.
  if v_post_owner is null or v_post_owner = new.reviewer_id then
    return new;
  end if;

  insert into public.notifications (
    recipient_id, actor_id, actor_display_name, type,
    post_id, post_title, review_id, review_dimension, review_preview
  )
  values (
    v_post_owner, new.reviewer_id, new.reviewer_display_name, 'review',
    new.post_id, v_post_title, new.id, new.dimension, left(new.what_worked, 140)
  );

  return new;
end;
$$;

create trigger on_post_review_created_notify
  after insert on public.post_reviews
  for each row execute procedure public.handle_new_post_review_notification();

-- ============================================================
-- Study Groups
-- Small, self-service groups a student creates and others join via
-- a shared 6-character invite code — a leaderboard that means
-- something closer to home than the anonymous global one (e.g.
-- classmates, or a friend group rallying around a shared focus like
-- societal-issues essays). No owner/admin: anyone with the code
-- joins or leaves freely, same flat model as the rest of the
-- community features. A student can belong to any number of groups
-- at once.
--
-- Group rankings are NOT cached like the global `leaderboard` table
-- (which exists because ranking everyone would be expensive on every
-- read, and is anonymous/opt-in by design). A single group is small,
-- so its leaderboard is computed live from `scores` + `profiles` on
-- read, and shows real display names — members already know each
-- other, so there's no anonymity to preserve here.
--
-- Groups aren't publicly browsable — the invite code is the only way
-- to find one, so plain client-side SELECT/INSERT can't implement
-- "look up a group by code" without either exposing a full group
-- listing or requiring the caller to already be a member (chicken-
-- and-egg). The two SECURITY DEFINER functions below solve that: they
-- look up/create a single group by exact code/ownership and hand
-- back just that one row, without granting a broader read policy.
-- ============================================================

create table public.study_groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null check (char_length(name) between 3 and 60),
  description text check (description is null or char_length(description) <= 200),
  invite_code text not null unique check (invite_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  created_by uuid references auth.users on delete set null,
  member_count int not null default 0,
  created_at timestamptz default now()
);

create index study_groups_invite_code_idx on public.study_groups (invite_code);

create table public.study_group_members (
  group_id uuid references public.study_groups(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

create index study_group_members_user_idx on public.study_group_members (user_id, joined_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;

-- Membership-check helper, used by both policies below instead of a
-- policy on study_group_members querying itself directly — keeps the
-- "am I in this group" check in one place and sidesteps writing a
-- self-referential subquery inline in two separate policies.
create or replace function public.is_study_group_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.study_group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

-- Only members (or the creator, as a fallback in case their own
-- membership insert ever failed right after creating the group) can
-- see a group's row. Direct inserts are blocked entirely — creation
-- only happens through create_study_group() below, which generates
-- and guarantees a unique invite code. No update/delete policy: with
-- no owner role, a group's name/code are fixed for its lifetime, and
-- an abandoned zero-member group is harmless to leave in place.
create policy "study_groups_select_member" on public.study_groups
  for select using (
    auth.uid() = created_by or public.is_study_group_member(id, auth.uid())
  );

-- A member can see the roster of any group they're in (needed to
-- render the group leaderboard), and always their own membership row.
-- Joining/leaving both stay ordinary self-service inserts/deletes —
-- no function needed for either since there's no code to look up
-- (insert) and no cross-row check to make (delete).
create policy "study_group_members_select_fellow" on public.study_group_members
  for select using (
    auth.uid() = user_id or public.is_study_group_member(group_id, auth.uid())
  );

create policy "study_group_members_insert_own" on public.study_group_members
  for insert with check (auth.uid() = user_id);

create policy "study_group_members_delete_own" on public.study_group_members
  for delete using (auth.uid() = user_id);

-- ============================================================
-- Keep study_groups.member_count in sync — same trigger pattern as
-- community_posts.review_count in 0011.
-- ============================================================

create or replace function public.handle_new_study_group_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.study_groups set member_count = member_count + 1 where id = new.group_id;
  return new;
end;
$$;

create trigger on_study_group_member_added
  after insert on public.study_group_members
  for each row execute procedure public.handle_new_study_group_member();

create or replace function public.handle_delete_study_group_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.study_groups set member_count = greatest(member_count - 1, 0) where id = old.group_id;
  return old;
end;
$$;

create trigger on_study_group_member_removed
  after delete on public.study_group_members
  for each row execute procedure public.handle_delete_study_group_member();

-- ============================================================
-- create_study_group — generates a unique invite code, inserts the
-- group, and auto-joins the creator, all in one atomic call so the
-- client never ends up with a group that exists but has no members
-- (or vice versa).
-- ============================================================

create or replace function public.create_study_group(p_name text, p_description text default null)
returns public.study_groups
language plpgsql
security definer set search_path = public
as $$
declare
  v_group public.study_groups;
  v_code text;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O or 1/I — easy to misread when shared out loud
  v_attempt int := 0;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a study group.';
  end if;

  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;

    begin
      insert into public.study_groups (name, description, invite_code, created_by)
      values (trim(p_name), nullif(trim(coalesce(p_description, '')), ''), v_code, auth.uid())
      returning * into v_group;
      exit; -- unique, insert succeeded
    exception when unique_violation then
      v_attempt := v_attempt + 1;
      if v_attempt >= 8 then
        raise exception 'Could not generate a unique invite code — please try again.';
      end if;
      -- otherwise loop again with a freshly rolled code
    end;
  end loop;

  insert into public.study_group_members (group_id, user_id) values (v_group.id, auth.uid());

  return v_group;
end;
$$;

-- ============================================================
-- join_study_group_by_code — the only path that can resolve an
-- invite code to a group, since ordinary SELECT is members-only.
-- Idempotent: joining a group you're already in is a no-op, not
-- an error, so the "Join" button never has to special-case that.
-- ============================================================

create or replace function public.join_study_group_by_code(p_invite_code text)
returns public.study_groups
language plpgsql
security definer set search_path = public
as $$
declare
  v_group public.study_groups;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to join a study group.';
  end if;

  select * into v_group from public.study_groups where invite_code = upper(trim(p_invite_code));

  if v_group.id is null then
    raise exception 'Invalid invite code. Double-check with whoever shared it.';
  end if;

  insert into public.study_group_members (group_id, user_id)
  values (v_group.id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return v_group;
end;
$$;

revoke execute on function public.create_study_group(text, text) from public;
grant execute on function public.create_study_group(text, text) to authenticated;

revoke execute on function public.join_study_group_by_code(text) from public;
grant execute on function public.join_study_group_by_code(text) to authenticated;

-- ============================================================
-- REALTIME — group page updates live as members join/leave, same as
-- community posts/reviews/notifications.
-- ============================================================
alter publication supabase_realtime add table public.study_groups;
alter publication supabase_realtime add table public.study_group_members;

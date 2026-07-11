-- ============================================================
-- 1. Per-exam leaderboard rows
-- Previously `leaderboard` had user_id as its sole primary key, so a
-- student could only ever have ONE row — which is why writing a
-- USTET essay never showed up under the USTET tab; that row simply
-- never existed. Existing rows (all exam_type = NULL, meaning
-- "overall") are migrated to the literal 'Overall' value so the
-- primary key can become (user_id, exam_type) — Postgres treats
-- NULLs as distinct from each other in a unique/primary key, which
-- would have let duplicate "overall" rows slip in.
-- ============================================================

update public.leaderboard set exam_type = 'Overall' where exam_type is null;

alter table public.leaderboard alter column exam_type set default 'Overall';
alter table public.leaderboard alter column exam_type set not null;

alter table public.leaderboard drop constraint leaderboard_pkey;
alter table public.leaderboard add primary key (user_id, exam_type);

create index leaderboard_exam_score_idx on public.leaderboard (exam_type, average_score desc);

-- ============================================================
-- 2. Leaderboard alias guardrails (server-side, defense in depth)
-- The client already validates format + a blocklist before saving,
-- but this trigger enforces the same rules at the database level so
-- it can't be bypassed by calling the API directly. Deliberately a
-- light, common-sense filter — not a claim of bulletproof moderation.
-- ============================================================

create or replace function public.check_leaderboard_alias()
returns trigger
language plpgsql
as $$
declare
  normalized text := lower(regexp_replace(new.alias, '[^a-zA-Z0-9]', '', 'g'));
  blocked text[] := array[
    'fuck','shit','bitch','asshole','bastard','cunt','dick','pussy',
    'nigger','nigga','faggot','retard','whore','slut','rape',
    'putangina','putanginamo','gago','gaga','tangina','tarantado',
    'ulol','bobo','inutil','leche','pakshet','peste','kupal',
    'hayop','punyeta','buwisit'
  ];
  word text;
begin
  if new.alias !~ '^[A-Za-z0-9_]{3,30}$' then
    raise exception 'Leaderboard username may only contain letters, numbers, and underscores (3-30 characters).';
  end if;

  foreach word in array blocked loop
    if normalized like '%' || word || '%' then
      raise exception 'That username is not allowed. Please choose another.';
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists leaderboard_alias_guard on public.leaderboard;
create trigger leaderboard_alias_guard
  before insert or update of alias on public.leaderboard
  for each row execute function public.check_leaderboard_alias();

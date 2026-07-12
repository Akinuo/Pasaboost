-- ============================================================
-- Feedback Follow-up Q&A
-- Lets a student ask a grounded follow-up question about a
-- specific score ("why did I lose points on Organization here?")
-- instead of only reading the static feedback once. Each thread
-- is scoped to one score + one dimension (dimension = null means
-- the question is about the overall feedback, not one rubric row).
-- ============================================================

create table public.feedback_qa_messages (
  id uuid default uuid_generate_v4() primary key,
  score_id uuid references public.scores(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  dimension text
    check (dimension is null or dimension in ('Content','Organization','Grammar','Coherence','Argument')),
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz default now()
);

-- Threads are read back scoped to (score, dimension) in chronological
-- order, so index for exactly that access pattern.
create index feedback_qa_thread_idx on public.feedback_qa_messages (score_id, dimension, created_at);
create index feedback_qa_user_idx on public.feedback_qa_messages (user_id, created_at desc);

alter table public.feedback_qa_messages enable row level security;

-- Owner-only: a score's feedback thread is private to the student
-- who wrote the essay, same visibility as the score itself.
create policy "feedback_qa_select_own" on public.feedback_qa_messages
  for select using (auth.uid() = user_id);
create policy "feedback_qa_insert_own" on public.feedback_qa_messages
  for insert with check (auth.uid() = user_id);
create policy "feedback_qa_delete_own" on public.feedback_qa_messages
  for delete using (auth.uid() = user_id);

-- Not added to supabase_realtime — this is a single-user thread the
-- client already renders optimistically as it sends/receives, no
-- cross-client sync needed.

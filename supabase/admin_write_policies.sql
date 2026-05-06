-- Run this in Supabase SQL Editor if uploads, source deletion, or document updates fail.
-- It keeps every signed-in user as an admin and allows admin write operations.

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select user_id is not null;
$$;

drop policy if exists "knowledge admin update" on public.knowledge_documents;
create policy "knowledge admin update"
on public.knowledge_documents for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "knowledge admin delete" on public.knowledge_documents;
create policy "knowledge admin delete"
on public.knowledge_documents for delete
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "chunks admin update" on public.knowledge_chunks;
create policy "chunks admin update"
on public.knowledge_chunks for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "chunks admin delete" on public.knowledge_chunks;
create policy "chunks admin delete"
on public.knowledge_chunks for delete
to authenticated
using (public.is_admin(auth.uid()));

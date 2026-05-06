create extension if not exists pgcrypto;

do $$ begin
  create type public.support_category as enum (
    'HR',
    'Operation',
    'IT support',
    'Accounts and Finance',
    'Sales'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'admin' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  category public.support_category not null,
  title text not null,
  source_type text not null check (source_type in ('text', 'pdf', 'docx', 'txt', 'md', 'link')),
  source_url text,
  original_filename text,
  content_text text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  char_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  category public.support_category not null,
  chunk_index integer not null,
  content text not null,
  embedding jsonb not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  category public.support_category not null,
  customer_email text,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists knowledge_chunks_category_idx on public.knowledge_chunks(category);
create index if not exists support_tickets_category_idx on public.support_tickets(category);
create index if not exists conversation_messages_ticket_idx on public.conversation_messages(ticket_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'admin')
  on conflict (id) do update set role = 'admin', email = excluded.email;

  return new;
end;
$$;

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select user_id is not null;
$$;

update public.profiles set role = 'admin';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.support_tickets enable row level security;
alter table public.conversation_messages enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "profiles admin update" on public.profiles;
create policy "profiles admin update"
on public.profiles for update
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "knowledge public read" on public.knowledge_documents;
create policy "knowledge public read"
on public.knowledge_documents for select
to anon, authenticated
using (true);

drop policy if exists "chunks public read" on public.knowledge_chunks;
create policy "chunks public read"
on public.knowledge_chunks for select
to anon, authenticated
using (true);

drop policy if exists "knowledge admin insert" on public.knowledge_documents;
create policy "knowledge admin insert"
on public.knowledge_documents for insert
to authenticated
with check (public.is_admin(auth.uid()));

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

drop policy if exists "chunks admin insert" on public.knowledge_chunks;
create policy "chunks admin insert"
on public.knowledge_chunks for insert
to authenticated
with check (public.is_admin(auth.uid()));

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

drop policy if exists "tickets public insert" on public.support_tickets;
create policy "tickets public insert"
on public.support_tickets for insert
to anon, authenticated
with check (true);

drop policy if exists "tickets admin read" on public.support_tickets;
create policy "tickets admin read"
on public.support_tickets for select
to authenticated
using (public.is_admin(auth.uid()));

drop policy if exists "messages public insert" on public.conversation_messages;
create policy "messages public insert"
on public.conversation_messages for insert
to anon, authenticated
with check (true);

drop policy if exists "messages admin read" on public.conversation_messages;
create policy "messages admin read"
on public.conversation_messages for select
to authenticated
using (public.is_admin(auth.uid()));

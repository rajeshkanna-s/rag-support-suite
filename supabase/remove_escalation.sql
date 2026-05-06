-- Run this once in Supabase SQL Editor if you already created the older schema.
-- It removes the escalation-specific DB state while keeping tickets and messages.

update public.support_tickets
set status = 'open'
where status = 'needs_review';

alter table public.support_tickets
drop constraint if exists support_tickets_status_check;

alter table public.support_tickets
add constraint support_tickets_status_check
check (status in ('open', 'closed'));

alter table public.conversation_messages
drop column if exists escalated;

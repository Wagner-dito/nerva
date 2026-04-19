-- Nerva — automated follow-up
-- Tracks visitor silence + bot re-engagement attempts.

alter table public.conversations
  add column last_message_at    timestamptz not null default now(),
  add column follow_up_count    int not null default 0,
  add column last_follow_up_at  timestamptz;

-- Backfill from created_at for existing rows.
update public.conversations
  set last_message_at = coalesce(last_message_at, created_at);

-- Only bump last_message_at when the VISITOR speaks. Bot follow-ups
-- update last_follow_up_at separately so the cron can tell them apart.
create or replace function public.bump_conversation_on_user_msg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'user' then
    update public.conversations
      set last_message_at = new.created_at
      where id = new.conversation_id;
  end if;
  return new;
end;
$$;

create trigger on_message_insert_bump_last
  after insert on public.messages
  for each row execute function public.bump_conversation_on_user_msg();

-- Per-bot toggle.
alter table public.bots
  add column follow_up_enabled boolean not null default true;

-- Index the cron will hammer.
create index conversations_active_follow_idx
  on public.conversations(status, last_message_at)
  where status = 'active';

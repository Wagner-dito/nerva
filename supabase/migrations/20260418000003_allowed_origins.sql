-- Nerva — per-bot CORS allowlist
-- Adds a list of origins permitted to call /api/chat for this bot.
-- Empty array = permissive (dev); populated = strict allowlist.

alter table public.bots
  add column allowed_origins text[] not null default '{}';

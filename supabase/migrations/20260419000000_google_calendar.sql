-- Nerva — Google Calendar integration per bot
-- Stores the refresh token (long-lived) so we can issue access tokens on-demand.

alter table public.bots
  add column google_refresh_token text,
  add column google_calendar_id   text default 'primary';

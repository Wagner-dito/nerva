-- Nerva — handoff email configuration
-- Adds a per-bot recipient email for handoff notifications.
-- Null = no email sent (owner opts out).

alter table public.bots
  add column handoff_email text
    check (handoff_email is null or handoff_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Nerva — traffic source tracking per conversation
-- Capturado no primeiro contato via widget.js (URL params + referrer).

alter table public.conversations
  add column source_url    text,
  add column referrer      text,
  add column utm_source    text,
  add column utm_medium    text,
  add column utm_campaign  text;

create index conversations_utm_source_idx
  on public.conversations(utm_source)
  where utm_source is not null;

create index conversations_utm_campaign_idx
  on public.conversations(utm_campaign)
  where utm_campaign is not null;

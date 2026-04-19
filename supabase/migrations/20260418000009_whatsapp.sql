-- Nerva — WhatsApp Business integration
-- Maps bot → Meta phone number. Webhook uses phone_number_id to route.

alter table public.bots
  add column whatsapp_phone_number_id  text,
  add column whatsapp_access_token     text;

create unique index bots_whatsapp_phone_idx
  on public.bots(whatsapp_phone_number_id)
  where whatsapp_phone_number_id is not null;

-- Conversations gain a channel label so UI/metrics can distinguish
-- widget (web) vs whatsapp vs future channels.
alter table public.conversations
  add column channel text not null default 'web'
    check (channel in ('web', 'whatsapp', 'instagram'));

create index conversations_channel_idx on public.conversations(channel);

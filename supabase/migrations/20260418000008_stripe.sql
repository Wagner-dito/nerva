-- Nerva — Stripe billing fields on organizations
-- Plan already exists as enum (free/starter/pro). Add Stripe sync columns.

alter table public.organizations
  add column stripe_customer_id      text,
  add column stripe_subscription_id  text,
  add column subscription_status     text,
  add column current_period_end      timestamptz;

create unique index organizations_stripe_customer_idx
  on public.organizations(stripe_customer_id)
  where stripe_customer_id is not null;

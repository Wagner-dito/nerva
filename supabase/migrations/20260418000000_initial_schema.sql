-- Nerva — initial schema
-- Multi-tenant SaaS: organizations -> profiles/bots -> conversations -> messages + leads.
-- RLS is enabled on every table; a user only sees data for their own org.

---------------------------------------------------------------------
-- Extensions
---------------------------------------------------------------------
create extension if not exists "pgcrypto";

---------------------------------------------------------------------
-- Enums
---------------------------------------------------------------------
create type public.org_plan as enum ('free', 'starter', 'pro');
create type public.profile_role as enum ('owner', 'admin', 'member');
create type public.bot_niche as enum (
  'imobiliaria',
  'contabilidade',
  'hospedagem',
  'outro'
);
create type public.conversation_status as enum (
  'active',
  'qualified',
  'closed',
  'abandoned'
);
create type public.message_role as enum ('user', 'assistant', 'system');

---------------------------------------------------------------------
-- organizations
---------------------------------------------------------------------
create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  plan       public.org_plan not null default 'free',
  created_at timestamptz not null default now()
);

---------------------------------------------------------------------
-- profiles (1:1 with auth.users)
---------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  org_id     uuid not null references public.organizations(id) on delete cascade,
  role       public.profile_role not null default 'member',
  full_name  text,
  created_at timestamptz not null default now()
);

create index profiles_org_id_idx on public.profiles(org_id);

---------------------------------------------------------------------
-- bots
---------------------------------------------------------------------
create table public.bots (
  id                       uuid primary key default gen_random_uuid(),
  org_id                   uuid not null references public.organizations(id) on delete cascade,
  name                     text not null,
  persona                  text,
  system_prompt            text,
  knowledge_base           text,
  qualification_questions  jsonb not null default '[]'::jsonb,
  niche                    public.bot_niche not null default 'outro',
  created_at               timestamptz not null default now()
);

create index bots_org_id_idx on public.bots(org_id);

---------------------------------------------------------------------
-- conversations
---------------------------------------------------------------------
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  bot_id      uuid not null references public.bots(id) on delete cascade,
  visitor_id  text not null,
  status      public.conversation_status not null default 'active',
  temperature smallint not null default 0 check (temperature between 0 and 100),
  lead_data   jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index conversations_bot_id_idx on public.conversations(bot_id);
create index conversations_visitor_id_idx on public.conversations(visitor_id);

---------------------------------------------------------------------
-- messages
---------------------------------------------------------------------
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            public.message_role not null,
  content         text not null,
  created_at      timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages(conversation_id, created_at);

---------------------------------------------------------------------
-- leads
---------------------------------------------------------------------
create table public.leads (
  id                   uuid primary key default gen_random_uuid(),
  conversation_id      uuid not null references public.conversations(id) on delete cascade,
  name                 text,
  phone                text,
  email                text,
  qualification_score  int not null default 0 check (qualification_score between 0 and 100),
  notes                text,
  created_at           timestamptz not null default now()
);

create index leads_conversation_id_idx on public.leads(conversation_id);

---------------------------------------------------------------------
-- Helper: current user's org_id (SECURITY DEFINER to avoid RLS recursion)
---------------------------------------------------------------------
create or replace function public.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.profiles where id = auth.uid();
$$;

---------------------------------------------------------------------
-- Enable RLS
---------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.profiles      enable row level security;
alter table public.bots          enable row level security;
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;
alter table public.leads         enable row level security;

---------------------------------------------------------------------
-- RLS: organizations — a user sees only their own org
---------------------------------------------------------------------
create policy "org: members can read their org"
  on public.organizations for select
  using (id = public.current_org_id());

create policy "org: owners can update their org"
  on public.organizations for update
  using (
    id = public.current_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'owner'
    )
  );

---------------------------------------------------------------------
-- RLS: profiles
---------------------------------------------------------------------
create policy "profiles: user can read own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: user can read peers in same org"
  on public.profiles for select
  using (org_id = public.current_org_id());

create policy "profiles: user can update own profile"
  on public.profiles for update
  using (id = auth.uid());

---------------------------------------------------------------------
-- RLS: bots — scoped by org
---------------------------------------------------------------------
create policy "bots: read within org"
  on public.bots for select
  using (org_id = public.current_org_id());

create policy "bots: insert within org"
  on public.bots for insert
  with check (org_id = public.current_org_id());

create policy "bots: update within org"
  on public.bots for update
  using (org_id = public.current_org_id());

create policy "bots: delete within org"
  on public.bots for delete
  using (org_id = public.current_org_id());

---------------------------------------------------------------------
-- RLS: conversations — scoped by bot -> org
---------------------------------------------------------------------
create policy "conversations: read within org"
  on public.conversations for select
  using (
    exists (
      select 1 from public.bots b
      where b.id = conversations.bot_id
        and b.org_id = public.current_org_id()
    )
  );

create policy "conversations: update within org"
  on public.conversations for update
  using (
    exists (
      select 1 from public.bots b
      where b.id = conversations.bot_id
        and b.org_id = public.current_org_id()
    )
  );

create policy "conversations: delete within org"
  on public.conversations for delete
  using (
    exists (
      select 1 from public.bots b
      where b.id = conversations.bot_id
        and b.org_id = public.current_org_id()
    )
  );
-- NOTE: widget inserts from unauthenticated visitors will use the service role
-- or a dedicated RPC; no public insert policy here by design.

---------------------------------------------------------------------
-- RLS: messages — scoped through conversation -> bot -> org
---------------------------------------------------------------------
create policy "messages: read within org"
  on public.messages for select
  using (
    exists (
      select 1
      from public.conversations c
      join public.bots b on b.id = c.bot_id
      where c.id = messages.conversation_id
        and b.org_id = public.current_org_id()
    )
  );

---------------------------------------------------------------------
-- RLS: leads — scoped through conversation -> bot -> org
---------------------------------------------------------------------
create policy "leads: read within org"
  on public.leads for select
  using (
    exists (
      select 1
      from public.conversations c
      join public.bots b on b.id = c.bot_id
      where c.id = leads.conversation_id
        and b.org_id = public.current_org_id()
    )
  );

create policy "leads: update within org"
  on public.leads for update
  using (
    exists (
      select 1
      from public.conversations c
      join public.bots b on b.id = c.bot_id
      where c.id = leads.conversation_id
        and b.org_id = public.current_org_id()
    )
  );

create policy "leads: delete within org"
  on public.leads for delete
  using (
    exists (
      select 1
      from public.conversations c
      join public.bots b on b.id = c.bot_id
      where c.id = leads.conversation_id
        and b.org_id = public.current_org_id()
    )
  );

---------------------------------------------------------------------
-- Realtime
---------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;

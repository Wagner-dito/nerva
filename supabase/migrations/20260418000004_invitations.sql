-- Nerva — team invitations
-- Allows owners/admins to invite new members to their org via unique tokens.
-- Signup trigger also updated to honor invitation_token from raw_user_meta_data.

create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations(id) on delete cascade,
  email        text not null,
  role         public.profile_role not null default 'member',
  token        text not null unique,
  invited_by   uuid references public.profiles(id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '7 days'),
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index invitations_org_id_idx on public.invitations(org_id);
create index invitations_email_idx on public.invitations(lower(email));
create index invitations_token_idx on public.invitations(token);

alter table public.invitations enable row level security;

create policy "invitations: read within org"
  on public.invitations for select
  using (org_id = public.current_org_id());

create policy "invitations: insert by owner or admin"
  on public.invitations for insert
  with check (
    org_id = public.current_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

create policy "invitations: delete by owner or admin"
  on public.invitations for delete
  using (
    org_id = public.current_org_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Owners/admins can remove members from their org (but not themselves).
create policy "profiles: delete by owner or admin"
  on public.profiles for delete
  using (
    org_id = public.current_org_id()
    and id <> auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('owner', 'admin')
    )
  );

-- Replace the onboarding trigger so invited users join the invited org
-- instead of creating a new one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation_token text;
  v_invitation       public.invitations;
  v_org_id           uuid;
  v_full_name        text;
  v_org_name         text;
  v_slug_base        text;
  v_slug             text;
  v_suffix           int := 0;
begin
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  v_invitation_token := nullif(
    trim(new.raw_user_meta_data->>'invitation_token'),
    ''
  );

  if v_invitation_token is not null then
    select * into v_invitation
    from public.invitations
    where token = v_invitation_token
      and accepted_at is null
      and expires_at > now()
      and lower(email) = lower(new.email);

    if found then
      insert into public.profiles (id, org_id, role, full_name)
      values (new.id, v_invitation.org_id, v_invitation.role, v_full_name);
      update public.invitations
        set accepted_at = now()
        where id = v_invitation.id;
      return new;
    end if;
  end if;

  v_org_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'org_name'), ''),
    v_full_name
  );

  v_slug_base := regexp_replace(lower(v_org_name), '[^a-z0-9]+', '-', 'g');
  v_slug_base := regexp_replace(v_slug_base, '(^-+|-+$)', '', 'g');
  if v_slug_base = '' then
    v_slug_base := 'org';
  end if;

  v_slug := v_slug_base;
  while exists (select 1 from public.organizations where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_slug_base || '-' || v_suffix::text;
  end loop;

  insert into public.organizations (name, slug)
  values (v_org_name, v_slug)
  returning id into v_org_id;

  insert into public.profiles (id, org_id, role, full_name)
  values (new.id, v_org_id, 'owner', v_full_name);

  return new;
end;
$$;

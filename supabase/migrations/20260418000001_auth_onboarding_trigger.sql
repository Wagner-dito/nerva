-- Nerva — auth onboarding trigger
-- On auth.users INSERT, create an organization + owner profile for the new user.
-- Runs as SECURITY DEFINER so it bypasses RLS on both tables.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id     uuid;
  v_full_name  text;
  v_org_name   text;
  v_slug_base  text;
  v_slug       text;
  v_suffix     int := 0;
begin
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  v_org_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'org_name'), ''),
    v_full_name
  );

  -- Slug: lowercase, only [a-z0-9-], no leading/trailing hyphens
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- KATHYA AI multi-customer organization foundation
-- Apply after schema.sql and workspace_records.sql in the Supabase SQL Editor.
-- Additive migration: preserves existing user-owned rows and creates one default
-- organization for every existing account. Workspace switching/invitations are a later phase.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check (status in ('active','suspended','closed')),
  plan text not null default 'launch',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','admin','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists organization_members_user_idx
  on public.organization_members(user_id, organization_id);

alter table public.agents add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.conversations add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.billing_accounts add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
create table if not exists public.workspace_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','configured')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.workspace_records add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

-- Security-definer helpers avoid recursive RLS checks on organization_members.
create or replace function public.current_organization_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select om.organization_id
  from public.organization_members om
  where om.user_id = auth.uid()
  order by om.created_at, om.organization_id
  limit 1
$$;

create or replace function public.is_organization_member(target_org uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = target_org and om.user_id = auth.uid()
  )
$$;

create or replace function public.can_manage_organization(target_org uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.organization_members om
    where om.organization_id = target_org
      and om.user_id = auth.uid()
      and om.role in ('owner','admin','member')
  )
$$;

revoke all on function public.current_organization_id() from public;
revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.can_manage_organization(uuid) from public;
grant execute on function public.current_organization_id() to authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.can_manage_organization(uuid) to authenticated;

-- Provision a private default organization for each new account.
create or replace function public.provision_kathya_organization()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  profile_business text;
  profile_name text;
  org_name text;
  org_id uuid;
  org_slug text;
begin
  select p.business_name, p.full_name
    into profile_business, profile_name
  from public.profiles p where p.id = new.id;

  org_name := coalesce(nullif(trim(profile_business), ''), nullif(trim(profile_name), '') || '''s workspace', 'My KATHYA workspace');
  org_slug := trim(both '-' from regexp_replace(lower(org_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(replace(new.id::text, '-', ''), 1, 8);

  insert into public.organizations(name, slug, owner_user_id)
  values (org_name, org_slug, new.id)
  on conflict (slug) do nothing
  returning id into org_id;

  if org_id is null then
    select id into org_id from public.organizations where slug = org_slug;
  end if;

  insert into public.organization_members(organization_id, user_id, role)
  values (org_id, new.id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_org on auth.users;
create trigger on_auth_user_created_org
after insert on auth.users
for each row execute procedure public.provision_kathya_organization();

-- Backfill existing accounts before attaching their existing records.
do $$
declare
  u record;
  profile_business text;
  profile_name text;
  org_name text;
  org_slug text;
  org_id uuid;
begin
  for u in select id from auth.users loop
    select p.business_name, p.full_name into profile_business, profile_name
    from public.profiles p where p.id = u.id;

    org_name := coalesce(nullif(trim(profile_business), ''), nullif(trim(profile_name), '') || '''s workspace', 'My KATHYA workspace');
    org_slug := trim(both '-' from regexp_replace(lower(org_name), '[^a-z0-9]+', '-', 'g')) || '-' || substr(replace(u.id::text, '-', ''), 1, 8);

    insert into public.organizations(name, slug, owner_user_id)
    values (org_name, org_slug, u.id)
    on conflict (slug) do update set owner_user_id = excluded.owner_user_id
    returning id into org_id;

    insert into public.organization_members(organization_id, user_id, role)
    values (org_id, u.id, 'owner')
    on conflict (organization_id, user_id) do nothing;

    update public.agents set organization_id = org_id where user_id = u.id and organization_id is null;
    update public.conversations set organization_id = org_id where user_id = u.id and organization_id is null;
    update public.billing_accounts set organization_id = org_id where user_id = u.id and organization_id is null;
    update public.workspace_records set organization_id = org_id where user_id = u.id and organization_id is null;
  end loop;
end;
$$;

create or replace function public.assign_current_organization()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.organization_id is null then
    new.organization_id := public.current_organization_id();
  end if;
  return new;
end;
$$;

drop trigger if exists set_agents_organization on public.agents;
create trigger set_agents_organization before insert on public.agents
for each row execute procedure public.assign_current_organization();
drop trigger if exists set_conversations_organization on public.conversations;
create trigger set_conversations_organization before insert on public.conversations
for each row execute procedure public.assign_current_organization();
drop trigger if exists set_billing_organization on public.billing_accounts;
create trigger set_billing_organization before insert on public.billing_accounts
for each row execute procedure public.assign_current_organization();
drop trigger if exists set_workspace_records_organization on public.workspace_records;
create trigger set_workspace_records_organization before insert on public.workspace_records
for each row execute procedure public.assign_current_organization();

create index if not exists agents_org_idx on public.agents(organization_id);
create index if not exists conversations_org_idx on public.conversations(organization_id);
create index if not exists billing_accounts_org_idx on public.billing_accounts(organization_id);
create index if not exists workspace_records_org_idx on public.workspace_records(organization_id, category, created_at desc);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.workspace_records enable row level security;

revoke all on public.organizations, public.organization_members from anon;
grant select on public.organizations, public.organization_members to authenticated;

drop policy if exists organization_member_read on public.organizations;
create policy organization_member_read on public.organizations
for select to authenticated using (public.is_organization_member(id));

drop policy if exists organization_members_read on public.organization_members;
create policy organization_members_read on public.organization_members
for select to authenticated using (public.is_organization_member(organization_id));

-- Organization-scoped access replaces the earlier user-only policies for shared
-- operational data. A viewer can read; owner/admin/member can create or update.
drop policy if exists own_select on public.agents;
drop policy if exists own_insert on public.agents;
drop policy if exists own_update on public.agents;
drop policy if exists own_delete on public.agents;
create policy agents_org_read on public.agents for select to authenticated
using (public.is_organization_member(organization_id));
create policy agents_org_insert on public.agents for insert to authenticated
with check (user_id = auth.uid() and public.can_manage_organization(organization_id));
create policy agents_org_update on public.agents for update to authenticated
using (public.can_manage_organization(organization_id))
with check (public.can_manage_organization(organization_id));
create policy agents_org_delete on public.agents for delete to authenticated
using (public.can_manage_organization(organization_id));

drop policy if exists own_select on public.conversations;
drop policy if exists own_insert on public.conversations;
drop policy if exists own_update on public.conversations;
drop policy if exists own_delete on public.conversations;
create policy conversations_org_read on public.conversations for select to authenticated
using (public.is_organization_member(organization_id));
create policy conversations_org_insert on public.conversations for insert to authenticated
with check (user_id = auth.uid() and public.can_manage_organization(organization_id));
create policy conversations_org_update on public.conversations for update to authenticated
using (public.can_manage_organization(organization_id))
with check (public.can_manage_organization(organization_id));
create policy conversations_org_delete on public.conversations for delete to authenticated
using (public.can_manage_organization(organization_id));

drop policy if exists workspace_records_select_own on public.workspace_records;
drop policy if exists workspace_records_insert_own on public.workspace_records;
drop policy if exists workspace_records_update_own on public.workspace_records;
drop policy if exists workspace_records_delete_own on public.workspace_records;
create policy workspace_records_org_read on public.workspace_records for select to authenticated
using (public.is_organization_member(organization_id));
create policy workspace_records_org_insert on public.workspace_records for insert to authenticated
with check (user_id = auth.uid() and public.can_manage_organization(organization_id));
create policy workspace_records_org_update on public.workspace_records for update to authenticated
using (public.can_manage_organization(organization_id))
with check (public.can_manage_organization(organization_id));
create policy workspace_records_org_delete on public.workspace_records for delete to authenticated
using (public.can_manage_organization(organization_id));

-- Billing remains read-only to customers; only server-side billing workflows
-- should modify subscriptions, provider IDs or usage balances.
drop policy if exists own_select on public.billing_accounts;
create policy billing_org_read on public.billing_accounts for select to authenticated
using (public.is_organization_member(organization_id));

-- Do not expose membership mutation to browser clients. Invitations and role
-- changes must be implemented through authenticated server-side endpoints.
revoke insert, update, delete on public.organizations, public.organization_members from anon, authenticated;

comment on table public.organizations is 'KATHYA customer workspaces; one or more users belong to each organization.';
comment on table public.organization_members is 'KATHYA workspace membership and authorization roles.';

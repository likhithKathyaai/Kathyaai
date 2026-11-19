-- KATHYA AI reusable multi-tenant product core
-- Additive development migration. Apply after saas_organizations.sql and platform_admin_management.sql.
-- No production database is modified by committing this file.

create table if not exists public.organization_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  industry text,
  website text,
  country text,
  timezone text not null default 'UTC',
  default_language text not null default 'en',
  supported_languages text[] not null default array['en']::text[],
  business_description text,
  business_hours jsonb not null default '{}'::jsonb,
  contact_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  source_type text not null check(source_type in ('file','url','text','faq')),
  source_url text,
  storage_path text,
  mime_type text,
  file_size_bytes bigint,
  content_text text,
  status text not null default 'pending' check(status in ('pending','processing','ready','failed','archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists knowledge_documents_org_idx on public.knowledge_documents(organization_id,created_at desc);

create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  company text,
  lifecycle_stage text not null default 'new',
  source text,
  notes text,
  custom_fields jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_contacts_org_created_idx on public.crm_contacts(organization_id,created_at desc);
create index if not exists crm_contacts_org_email_idx on public.crm_contacts(organization_id,email);

create table if not exists public.structured_extractions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  agent_record_id uuid references public.workspace_records(id) on delete set null,
  extraction_type text not null,
  data jsonb not null default '{}'::jsonb,
  confidence numeric(5,4),
  review_status text not null default 'pending' check(review_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists structured_extractions_org_idx on public.structured_extractions(organization_id,created_at desc);

create table if not exists public.voice_campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  direction text not null default 'outbound' check(direction in ('inbound','outbound')),
  status text not null default 'draft' check(status in ('draft','scheduled','running','paused','completed','failed')),
  agent_record_id uuid references public.workspace_records(id) on delete set null,
  schedule jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists voice_campaigns_org_idx on public.voice_campaigns(organization_id,created_at desc);

create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null,
  display_name text not null,
  status text not null default 'not_connected' check(status in ('not_connected','connected','error','revoked')),
  external_account_id text,
  scopes text[] not null default '{}'::text[],
  public_config jsonb not null default '{}'::jsonb,
  last_checked_at timestamptz,
  connected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id,provider,external_account_id)
);
create index if not exists integration_connections_org_idx on public.integration_connections(organization_id);

create table if not exists public.automation_workflows (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null default 'manual',
  trigger_config jsonb not null default '{}'::jsonb,
  action_steps jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check(status in ('draft','active','paused','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists automation_workflows_org_idx on public.automation_workflows(organization_id,created_at desc);

create table if not exists public.customer_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  plan_code text not null default 'launch',
  status text not null default 'trialing' check(status in ('trialing','active','past_due','canceled','incomplete')),
  billing_provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Workspace context and role helpers. Customer data is always scoped by membership.
create or replace function public.current_organization_role(p_org_id uuid)
returns text language sql stable security definer set search_path=''
as $$
 select m.role from public.organization_members m
 where m.organization_id=p_org_id and m.user_id=auth.uid()
 limit 1
$$;
revoke all on function public.current_organization_role(uuid) from public,anon;
grant execute on function public.current_organization_role(uuid) to authenticated;

create or replace function public.can_edit_organization(p_org_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.organization_members m
  where m.organization_id=p_org_id and m.user_id=auth.uid()
  and m.role in ('owner','admin','member'))
$$;
revoke all on function public.can_edit_organization(uuid) from public,anon;
grant execute on function public.can_edit_organization(uuid) to authenticated;

create or replace function public.can_admin_organization(p_org_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.organization_members m
  where m.organization_id=p_org_id and m.user_id=auth.uid()
  and m.role in ('owner','admin'))
$$;
revoke all on function public.can_admin_organization(uuid) from public,anon;
grant execute on function public.can_admin_organization(uuid) to authenticated;

create or replace function public.customer_list_workspaces()
returns jsonb language plpgsql stable security definer set search_path=''
as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(jsonb_build_object(
   'id',o.id,'name',o.name,'slug',o.slug,'role',m.role,'plan',o.plan,'status',o.status
 ) order by m.created_at,o.created_at),'[]'::jsonb)
 into result
 from public.organization_members m join public.organizations o on o.id=m.organization_id
 where m.user_id=auth.uid() and o.status='active';
 return result;
end; $$;
revoke all on function public.customer_list_workspaces() from public,anon;
grant execute on function public.customer_list_workspaces() to authenticated;

create or replace function public.customer_update_workspace_profile(
 p_org_id uuid,p_name text,p_industry text default null,p_website text default null,
 p_country text default null,p_timezone text default 'UTC',p_default_language text default 'en',
 p_supported_languages text[] default array['en']::text[],p_business_description text default null
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare out_org public.organizations%rowtype;
begin
 if auth.uid() is null or not public.can_admin_organization(p_org_id) then
  raise exception 'Workspace administrator access required' using errcode='42501';
 end if;
 if nullif(trim(p_name),'') is null then raise exception 'Business name is required'; end if;
 if p_default_language is null or length(p_default_language)>16 then raise exception 'Invalid default language'; end if;
 update public.organizations set name=trim(p_name),updated_at=now() where id=p_org_id returning * into out_org;
 insert into public.organization_profiles(organization_id,industry,website,country,timezone,default_language,supported_languages,business_description,updated_at)
 values(p_org_id,nullif(trim(p_industry),''),nullif(trim(p_website),''),nullif(trim(p_country),''),coalesce(nullif(trim(p_timezone),''),'UTC'),p_default_language,
  coalesce(nullif(p_supported_languages,'{}'::text[]),array[p_default_language]::text[]),p_business_description,now())
 on conflict(organization_id) do update set industry=excluded.industry,website=excluded.website,country=excluded.country,
 timezone=excluded.timezone,default_language=excluded.default_language,supported_languages=excluded.supported_languages,
 business_description=excluded.business_description,updated_at=now();
 return jsonb_build_object('id',out_org.id,'name',out_org.name);
end; $$;
revoke all on function public.customer_update_workspace_profile(uuid,text,text,text,text,text,text,text[],text) from public,anon;
grant execute on function public.customer_update_workspace_profile(uuid,text,text,text,text,text,text,text[],text) to authenticated;

-- Enable tenant RLS on every new customer data table.
do $$
declare t text;
begin
 foreach t in array array['organization_profiles','knowledge_documents','crm_contacts','structured_extractions','voice_campaigns','integration_connections','automation_workflows','customer_subscriptions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('drop policy if exists tenant_read on public.%I',t);
  execute format('drop policy if exists tenant_insert on public.%I',t);
  execute format('drop policy if exists tenant_update on public.%I',t);
  execute format('drop policy if exists tenant_delete on public.%I',t);
  execute format('create policy tenant_read on public.%I for select to authenticated using (public.is_organization_member(organization_id))',t);
  execute format('create policy tenant_insert on public.%I for insert to authenticated with check (public.can_edit_organization(organization_id))',t);
  execute format('create policy tenant_update on public.%I for update to authenticated using (public.can_edit_organization(organization_id)) with check (public.can_edit_organization(organization_id))',t);
  execute format('create policy tenant_delete on public.%I for delete to authenticated using (public.can_admin_organization(organization_id))',t);
 end loop;
end $$;

-- Billing/subscription mutations are server-controlled; authenticated customers only read their own.
revoke insert,update,delete on public.customer_subscriptions from authenticated;
drop policy if exists tenant_insert on public.customer_subscriptions;
drop policy if exists tenant_update on public.customer_subscriptions;
drop policy if exists tenant_delete on public.customer_subscriptions;
drop policy if exists tenant_read on public.customer_subscriptions;
create policy customer_subscription_read on public.customer_subscriptions for select to authenticated
using(public.is_organization_member(organization_id));

-- Seed a subscription record for each current organization, without overwriting provider-managed data.
insert into public.customer_subscriptions(organization_id,plan_code,status)
select o.id,o.plan,'trialing' from public.organizations o
on conflict(organization_id) do nothing;

comment on table public.organization_profiles is 'Business-specific settings and multilingual defaults for each KATHYA customer.';
comment on table public.knowledge_documents is 'Tenant-isolated knowledge sources and document metadata; file bytes belong in private object storage.';
comment on table public.crm_contacts is 'Tenant-isolated contacts and structured customer records.';
comment on table public.structured_extractions is 'Validated structured data extracted from conversations.';
comment on table public.voice_campaigns is 'Tenant-isolated inbound and outbound campaign definitions.';
comment on table public.integration_connections is 'Non-secret integration connection metadata. OAuth tokens and API secrets must stay server-side.';
comment on table public.automation_workflows is 'Tenant-isolated workflow definitions and action steps.';
comment on table public.customer_subscriptions is 'Provider-backed customer subscription state; customers have read-only access.';

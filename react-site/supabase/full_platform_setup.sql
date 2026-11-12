-- KATHYA AI complete platform setup
-- Safe to run in Supabase SQL Editor. Includes tenant RLS, owner/admin RPC,
-- Vapi live calls, WhatsApp inbox, and shared API rate limits.
-- Run this entire file once, from top to bottom.

-- ============================================================
-- schema.sql
-- ============================================================
-- KATHYA multi-tenant application schema (Supabase/Postgres)
create extension if not exists pgcrypto;
create table if not exists public.profiles(id uuid primary key references auth.users(id) on delete cascade,email text,full_name text,business_name text,mobile text,primary_goal text,onboarding_complete boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.agents(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,name text not null,status text not null default 'draft',channel text,config jsonb not null default '{}'::jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table if not exists public.conversations(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,agent_id uuid references public.agents(id) on delete set null,channel text,status text not null default 'open',summary text,metadata jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create table if not exists public.billing_accounts(id uuid primary key default gen_random_uuid(),user_id uuid not null unique references auth.users(id) on delete cascade,plan text not null default 'launch',provider_customer_id text,subscription_status text not null default 'inactive',usage_minutes numeric not null default 0,updated_at timestamptz not null default now());
create table if not exists public.user_settings(user_id uuid primary key references auth.users(id) on delete cascade,timezone text,notifications jsonb not null default '{}'::jsonb,preferences jsonb not null default '{}'::jsonb,updated_at timestamptz not null default now());
create index if not exists agents_user_id_idx on public.agents(user_id);create index if not exists conversations_user_id_idx on public.conversations(user_id);create index if not exists conversations_agent_id_idx on public.conversations(agent_id);
alter table public.profiles enable row level security;alter table public.agents enable row level security;alter table public.conversations enable row level security;alter table public.billing_accounts enable row level security;alter table public.user_settings enable row level security;
revoke all on public.profiles,public.agents,public.conversations,public.billing_accounts,public.user_settings from anon;grant select,insert,update,delete on public.profiles,public.agents,public.conversations,public.user_settings to authenticated;grant select on public.billing_accounts to authenticated;
do $$ declare t text; begin foreach t in array array['profiles','agents','conversations','billing_accounts','user_settings'] loop execute format('drop policy if exists "own_select" on public.%I',t);execute format('create policy "own_select" on public.%I for select to authenticated using ((select auth.uid()) = %s)',t,case when t in ('profiles','user_settings') then case when t='profiles' then 'id' else 'user_id' end else 'user_id' end); end loop; end $$;
drop policy if exists "own_insert" on public.profiles;create policy "own_insert" on public.profiles for insert to authenticated with check ((select auth.uid())=id);drop policy if exists "own_update" on public.profiles;create policy "own_update" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
drop policy if exists "own_insert" on public.agents;create policy "own_insert" on public.agents for insert to authenticated with check ((select auth.uid())=user_id);drop policy if exists "own_update" on public.agents;create policy "own_update" on public.agents for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);drop policy if exists "own_delete" on public.agents;create policy "own_delete" on public.agents for delete to authenticated using ((select auth.uid())=user_id);
drop policy if exists "own_insert" on public.conversations;create policy "own_insert" on public.conversations for insert to authenticated with check ((select auth.uid())=user_id);drop policy if exists "own_update" on public.conversations;create policy "own_update" on public.conversations for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);drop policy if exists "own_delete" on public.conversations;create policy "own_delete" on public.conversations for delete to authenticated using ((select auth.uid())=user_id);
drop policy if exists "own_insert" on public.user_settings;create policy "own_insert" on public.user_settings for insert to authenticated with check ((select auth.uid())=user_id);drop policy if exists "own_update" on public.user_settings;create policy "own_update" on public.user_settings for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.profiles(id,email,full_name) values(new.id,new.email,new.raw_user_meta_data->>'full_name') on conflict(id) do nothing;insert into public.user_settings(user_id) values(new.id) on conflict(user_id) do nothing;insert into public.billing_accounts(user_id) values(new.id) on conflict(user_id) do nothing;return new;end;$$;
drop trigger if exists on_auth_user_created on auth.users;create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- KATHYA privileged admin authorization. Never expose role assignment in client UI.
create table if not exists public.admin_users(user_id uuid primary key references auth.users(id) on delete cascade,role text not null check(role in('owner','admin','support','billing')),created_at timestamptz not null default now());
alter table public.admin_users enable row level security;
revoke all on public.admin_users from anon,authenticated;
create or replace function public.is_kathya_admin() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.admin_users where user_id=auth.uid() and role in('owner','admin')); $$;
revoke all on function public.is_kathya_admin() from public;grant execute on function public.is_kathya_admin() to authenticated;
-- Assign the first owner only from the Supabase SQL editor after that person's verified auth account exists:
-- insert into public.admin_users(user_id,role) select id,'owner' from auth.users where email='OWNER_EMAIL' on conflict(user_id) do update set role='owner';


-- ============================================================
-- workspace_records.sql
-- ============================================================
-- Run in Supabase SQL Editor for KATHYA customer workspace
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
create index if not exists workspace_records_user_category_idx on public.workspace_records(user_id,category,created_at desc);
alter table public.workspace_records enable row level security;
drop policy if exists "workspace_records_select_own" on public.workspace_records;
create policy "workspace_records_select_own" on public.workspace_records for select to authenticated using (user_id=auth.uid());
drop policy if exists "workspace_records_insert_own" on public.workspace_records;
create policy "workspace_records_insert_own" on public.workspace_records for insert to authenticated with check (user_id=auth.uid());
drop policy if exists "workspace_records_update_own" on public.workspace_records;
create policy "workspace_records_update_own" on public.workspace_records for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "workspace_records_delete_own" on public.workspace_records;
create policy "workspace_records_delete_own" on public.workspace_records for delete to authenticated using (user_id=auth.uid());
grant select,insert,update,delete on public.workspace_records to authenticated;
-- All rows are customer scoped; provider credentials and billing secrets must remain server-side.


-- ============================================================
-- admin_dashboard.sql
-- ============================================================
-- KATHYA AI admin overview. Apply after schema.sql and workspace_records.sql.
-- Idempotent migration; only explicitly assigned owner/admin users can read platform-wide aggregates.
create or replace function public.get_kathya_admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1 from public.admin_users
    where user_id = auth.uid() and role in ('owner','admin')
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'customers', (select count(*) from public.profiles),
    'agents', (select count(*) from public.workspace_records where category = 'agents'),
    'deployedAgents', (select count(*) from public.workspace_records where category = 'agents' and nullif(payload->>'vapiAssistantId','') is not null),
    'conversations', (select count(*) from public.workspace_records where category = 'conversations'),
    'leads', (select count(*) from public.workspace_records where category = 'leads'),
    'recentCustomers', (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (
        select id, email, business_name, created_at
        from public.profiles order by created_at desc limit 8
      ) x
    ),
    'recentConversations', (
      select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      from (
        select wr.id, wr.title, wr.payload->>'summary' as summary,
               wr.created_at, p.email as customer_email
        from public.workspace_records wr
        left join public.profiles p on p.id = wr.user_id
        where wr.category = 'conversations'
        order by wr.created_at desc limit 8
      ) x
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_kathya_admin_overview() from public;
grant execute on function public.get_kathya_admin_overview() to authenticated;

-- Assign the first platform owner to the existing founder account, if it already exists.
-- Safe to re-run; if the account has not been created yet, this inserts nothing.
insert into public.admin_users(user_id, role)
select id, 'owner'
from auth.users
where lower(email) = lower('likhit@pamedlogtalent.com')
on conflict (user_id) do update set role = 'owner';


-- ============================================================
-- vapi_calls.sql
-- ============================================================
-- Vapi live-call state and reporting. Apply after workspace_records.sql.
create table if not exists public.vapi_calls (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 agent_record_id uuid references public.workspace_records(id) on delete set null,
 call_id text not null unique,
 assistant_id text not null,
 customer_number text,
 direction text,
 status text not null default 'queued',
 ended_reason text,
 started_at timestamptz,
 ended_at timestamptz,
 duration_seconds integer,
 summary text,
 transcript text,
 recording_url text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists vapi_calls_user_created_idx on public.vapi_calls(user_id,created_at desc);
create index if not exists vapi_calls_user_status_idx on public.vapi_calls(user_id,status);
alter table public.vapi_calls enable row level security;
drop policy if exists vapi_calls_select_own on public.vapi_calls;
create policy vapi_calls_select_own on public.vapi_calls for select to authenticated using (user_id=auth.uid());
grant select on public.vapi_calls to authenticated;


-- ============================================================
-- whatsapp.sql
-- ============================================================
-- KATHYA AI WhatsApp Cloud API channel and inbox storage.
create table if not exists public.whatsapp_channels (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 phone_number_id text not null unique,
 display_phone_number text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists whatsapp_channels_user_idx on public.whatsapp_channels(user_id);
alter table public.whatsapp_channels enable row level security;
drop policy if exists whatsapp_channels_select_own on public.whatsapp_channels;
create policy whatsapp_channels_select_own on public.whatsapp_channels for select to authenticated using (user_id=auth.uid());
drop policy if exists whatsapp_channels_insert_own on public.whatsapp_channels;
create policy whatsapp_channels_insert_own on public.whatsapp_channels for insert to authenticated with check (user_id=auth.uid());
drop policy if exists whatsapp_channels_update_own on public.whatsapp_channels;
create policy whatsapp_channels_update_own on public.whatsapp_channels for update to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists whatsapp_channels_delete_own on public.whatsapp_channels;
create policy whatsapp_channels_delete_own on public.whatsapp_channels for delete to authenticated using (user_id=auth.uid());
grant select,insert,update,delete on public.whatsapp_channels to authenticated;

create table if not exists public.whatsapp_messages (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 channel_id uuid not null references public.whatsapp_channels(id) on delete cascade,
 wa_message_id text not null unique,
 direction text not null check (direction in ('inbound','outbound')),
 from_number text,
 to_number text,
 message_type text not null default 'text',
 message_text text,
 delivery_status text not null default 'received',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists whatsapp_messages_user_created_idx on public.whatsapp_messages(user_id,created_at desc);
create index if not exists whatsapp_messages_channel_created_idx on public.whatsapp_messages(channel_id,created_at desc);
alter table public.whatsapp_messages enable row level security;
drop policy if exists whatsapp_messages_select_own on public.whatsapp_messages;
create policy whatsapp_messages_select_own on public.whatsapp_messages for select to authenticated using (user_id=auth.uid());
drop policy if exists whatsapp_messages_insert_own on public.whatsapp_messages;
create policy whatsapp_messages_insert_own on public.whatsapp_messages for insert to authenticated with check (user_id=auth.uid() and exists(select 1 from public.whatsapp_channels c where c.id=channel_id and c.user_id=auth.uid()));
grant select,insert on public.whatsapp_messages to authenticated;


-- ============================================================
-- api_rate_limits.sql
-- ============================================================
-- Shared per-user API rate limits for cost-bearing actions.
create table if not exists public.kathya_api_rate_limits (
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null,
 window_start timestamptz not null,
 request_count integer not null default 0,
 primary key(user_id,action,window_start)
);
alter table public.kathya_api_rate_limits enable row level security;
revoke all on public.kathya_api_rate_limits from anon,authenticated;

create or replace function public.consume_kathya_rate_limit(p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
 uid uuid := auth.uid();
 max_requests integer;
 window_seconds integer;
 bucket timestamptz;
 current_count integer;
begin
 if uid is null then raise exception 'Authentication required' using errcode='28000'; end if;
 case p_action
  when 'vapi_test_call' then max_requests:=3; window_seconds:=900;
  when 'vapi_assistant_create' then max_requests:=5; window_seconds:=3600;
  when 'whatsapp_send' then max_requests:=20; window_seconds:=3600;
  else raise exception 'Unsupported rate limit action' using errcode='22023';
 end case;
 bucket:=to_timestamp(floor(extract(epoch from now())/window_seconds)*window_seconds);
 insert into public.kathya_api_rate_limits(user_id,action,window_start,request_count)
 values(uid,p_action,bucket,1)
 on conflict(user_id,action,window_start)
 do update set request_count=public.kathya_api_rate_limits.request_count+1
 returning request_count into current_count;
 delete from public.kathya_api_rate_limits where user_id=uid and window_start<now()-interval '7 days';
 return current_count<=max_requests;
end;
$$;
revoke all on function public.consume_kathya_rate_limit(text) from public;
grant execute on function public.consume_kathya_rate_limit(text) to authenticated;

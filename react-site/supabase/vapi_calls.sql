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

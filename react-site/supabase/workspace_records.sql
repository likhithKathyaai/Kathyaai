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

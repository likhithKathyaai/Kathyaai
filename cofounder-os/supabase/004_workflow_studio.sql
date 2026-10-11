-- Phase 4: founder-owned, approval-gated workflow drafts.
create table if not exists public.founder_workflows (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 workflow_type text not null check(workflow_type in ('campaign','social','lead_followup','daily_brief')),
 title text not null check(char_length(title) between 1 and 160),
 objective text not null default '',
 draft text not null default '',
 approval_status text not null default 'draft' check(approval_status in ('draft','approved','rejected')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists founder_workflows_owner_idx on public.founder_workflows(owner_id,created_at desc);
alter table public.founder_workflows enable row level security;
drop policy if exists "Founder reads own workflows" on public.founder_workflows;
create policy "Founder reads own workflows" on public.founder_workflows for select to authenticated using (owner_id=(select auth.uid()) and (select public.is_approved_founder()));
drop policy if exists "Founder creates own workflows" on public.founder_workflows;
create policy "Founder creates own workflows" on public.founder_workflows for insert to authenticated with check (owner_id=(select auth.uid()) and (select public.is_approved_founder()));
drop policy if exists "Founder updates own workflows" on public.founder_workflows;
create policy "Founder updates own workflows" on public.founder_workflows for update to authenticated using (owner_id=(select auth.uid()) and (select public.is_approved_founder())) with check (owner_id=(select auth.uid()) and (select public.is_approved_founder()));
drop policy if exists "Founder deletes own workflows" on public.founder_workflows;
create policy "Founder deletes own workflows" on public.founder_workflows for delete to authenticated using (owner_id=(select auth.uid()) and (select public.is_approved_founder()));
create or replace function public.founder_workflow_owner() returns trigger language plpgsql security invoker as $$begin new.owner_id := auth.uid();return new;end$$;
drop trigger if exists set_founder_workflow_owner on public.founder_workflows;
create trigger set_founder_workflow_owner before insert on public.founder_workflows for each row execute function public.founder_workflow_owner();

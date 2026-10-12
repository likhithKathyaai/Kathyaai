-- Phase 6: private schedules and in-app approval notifications.
create table if not exists public.founder_automation_settings (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default false,
 timezone text not null default 'UTC',
 brief_enabled boolean not null default true,
 marketing_enabled boolean not null default true,
 leads_enabled boolean not null default true,
 last_run_date date,
 updated_at timestamptz not null default now()
);
alter table public.founder_automation_settings enable row level security;
create policy "Founder owns automation settings" on public.founder_automation_settings for all to authenticated using (owner_id=auth.uid() and public.is_approved_founder()) with check(owner_id=auth.uid() and public.is_approved_founder());
create table if not exists public.founder_notifications (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null,
 message text not null default '',
 read_at timestamptz,
 created_at timestamptz not null default now()
);
create index if not exists founder_notifications_owner_idx on public.founder_notifications(owner_id,created_at desc);
alter table public.founder_notifications enable row level security;
create policy "Founder reads notifications" on public.founder_notifications for select to authenticated using(owner_id=auth.uid() and public.is_approved_founder());
create policy "Founder updates notifications" on public.founder_notifications for update to authenticated using(owner_id=auth.uid() and public.is_approved_founder()) with check(owner_id=auth.uid() and public.is_approved_founder());
-- Automation runs use server-side service role only. Never put that key in VITE_ variables.

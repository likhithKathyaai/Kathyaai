-- Phase 8: founder-owned measurable business outcomes.
create table if not exists public.founder_business_metrics (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 record_type text not null check(record_type in ('lead','campaign')),
 name text not null check(char_length(name) between 1 and 160),
 stage text not null default 'new' check(stage in ('new','contacted','qualified','proposal','won','lost','planned','active','completed')),
 channel text not null default '',
 leads_count integer not null default 0 check(leads_count>=0),
 conversions integer not null default 0 check(conversions>=0),
 spend_usd numeric(12,2) not null default 0 check(spend_usd>=0),
 revenue_usd numeric(12,2) not null default 0 check(revenue_usd>=0),
 notes text not null default '',
 occurred_on date not null default current_date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint campaign_conversion_limit check(record_type='lead' or conversions<=leads_count)
);
create index if not exists founder_business_metrics_owner_idx on public.founder_business_metrics(owner_id,occurred_on desc);
alter table public.founder_business_metrics enable row level security;
create policy "Founder reads own business metrics" on public.founder_business_metrics for select to authenticated using(owner_id=auth.uid() and public.is_approved_founder());
create policy "Founder inserts own business metrics" on public.founder_business_metrics for insert to authenticated with check(owner_id=auth.uid() and public.is_approved_founder());
create policy "Founder updates own business metrics" on public.founder_business_metrics for update to authenticated using(owner_id=auth.uid() and public.is_approved_founder()) with check(owner_id=auth.uid() and public.is_approved_founder());
create policy "Founder deletes own business metrics" on public.founder_business_metrics for delete to authenticated using(owner_id=auth.uid() and public.is_approved_founder());
create or replace function public.founder_business_metric_owner() returns trigger language plpgsql security invoker set search_path='' as $$begin new.owner_id:=auth.uid();return new;end$$;
drop trigger if exists set_founder_business_metric_owner on public.founder_business_metrics;
create trigger set_founder_business_metric_owner before insert on public.founder_business_metrics for each row execute function public.founder_business_metric_owner();
